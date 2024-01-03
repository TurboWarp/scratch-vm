const EventEmitter = require('events');
const {OrderedMap} = require('immutable');
const ExtendedJSON = require('@turbowarp/json');
const uuid = require('uuid');

const ArgumentType = require('../extension-support/argument-type');
const Blocks = require('./blocks');
const BlocksRuntimeCache = require('./blocks-runtime-cache');
const BlockType = require('../extension-support/block-type');
const Profiler = require('./profiler');
const Sequencer = require('./sequencer');
const execute = require('./execute.js');
const compilerExecute = require('../compiler/jsexecute');
const ScratchBlocksConstants = require('./scratch-blocks-constants');
const TargetType = require('../extension-support/target-type');
const Thread = require('./thread');
const log = require('../util/log');
const maybeFormatMessage = require('../util/maybe-format-message');
const StageLayering = require('./stage-layering');
const Variable = require('./variable');
const xmlEscape = require('../util/xml-escape');
const ScratchLinkWebSocket = require('../util/scratch-link-websocket');
const FontManager = require('./tw-font-manager');
const fetchWithTimeout = require('../util/fetch-with-timeout');

// Virtual I/O devices.
const Clock = require('../io/clock');
const Cloud = require('../io/cloud');
const Keyboard = require('../io/keyboard');
const Mouse = require('../io/mouse');
const MouseWheel = require('../io/mouseWheel');
const UserData = require('../io/userData');
const Video = require('../io/video');

const StringUtil = require('../util/string-util');
const uid = require('../util/uid');

const defaultBlockPackages = {
    scratch3_control: require('../blocks/scratch3_control'),
    scratch3_event: require('../blocks/scratch3_event'),
    scratch3_looks: require('../blocks/scratch3_looks'),
    scratch3_motion: require('../blocks/scratch3_motion'),
    scratch3_operators: require('../blocks/scratch3_operators'),
    scratch3_sound: require('../blocks/scratch3_sound'),
    scratch3_sensing: require('../blocks/scratch3_sensing'),
    scratch3_data: require('../blocks/scratch3_data'),
    scratch3_procedures: require('../blocks/scratch3_procedures')
};

const interpolate = require('./tw-interpolate');
const FrameLoop = require('./tw-frame-loop');

const defaultExtensionColors = ['#0FBD8C', '#0DA57A', '#0B8E69'];

const COMMENT_CONFIG_MAGIC = ' // _twconfig_';

/**
 * Information used for converting Scratch argument types into scratch-blocks data.
 * @type {object.<ArgumentType, {shadowType: string, fieldType: string}>}
 */
const ArgumentTypeMap = (() => {
    const map = {};
    map[ArgumentType.ANGLE] = {
        shadow: {
            type: 'math_angle',
            // We specify fieldNames here so that we can pick
            // create and populate a field with the defaultValue
            // specified in the extension.
            // When the `fieldName` property is not specified,
            // the <field></field> will be left out of the XML and
            // the scratch-blocks defaults for that field will be
            // used instead (e.g. default of 0 for number fields)
            fieldName: 'NUM'
        }
    };
    map[ArgumentType.COLOR] = {
        shadow: {
            type: 'colour_picker',
            fieldName: 'COLOUR'
        }
    };
    map[ArgumentType.NUMBER] = {
        shadow: {
            type: 'math_number',
            fieldName: 'NUM'
        }
    };
    map[ArgumentType.STRING] = {
        shadow: {
            type: 'text',
            fieldName: 'TEXT'
        }
    };
    map[ArgumentType.BOOLEAN] = {
        check: 'Boolean'
    };
    map[ArgumentType.MATRIX] = {
        shadow: {
            type: 'matrix',
            fieldName: 'MATRIX'
        }
    };
    map[ArgumentType.NOTE] = {
        shadow: {
            type: 'note',
            fieldName: 'NOTE'
        }
    };
    map[ArgumentType.IMAGE] = {
        // Inline images are weird because they're not actually "arguments".
        // They are more analagous to the label on a block.
        fieldType: 'field_image'
    };
    map[ArgumentType.COSTUME] = {
        shadow: {
            type: 'looks_costume',
            fieldName: 'COSTUME'
        }
    };
    map[ArgumentType.SOUND] = {
        shadow: {
            type: 'sound_sounds_menu',
            fieldName: 'SOUND_MENU'
        }
    };
    return map;
})();

/**
 * A pair of functions used to manage the cloud variable limit,
 * to be used when adding (or attempting to add) or removing a cloud variable.
 * @typedef {object} CloudDataManager
 * @property {function} canAddCloudVariable A function to call to check that
 * a cloud variable can be added.
 * @property {function} addCloudVariable A function to call to track a new
 * cloud variable on the runtime.
 * @property {function} removeCloudVariable A function to call when
 * removing an existing cloud variable.
 * @property {function} hasCloudVariables A function to call to check that
 * the runtime has any cloud variables.
 * @property {function} getNumberOfCloudVariables A function that returns the
 * number of cloud variables in the project.
 */

/**
 * Creates and manages cloud variable limit in a project,
 * and returns two functions to be used to add a new
 * cloud variable (while checking that it can be added)
 * and remove an existing cloud variable.
 * These are to be called whenever attempting to create or delete
 * a cloud variable.
 * @param {Object} cloudOptions
 * @param {number} cloudOptions.limit Maximum number of cloud variables
 * @return {CloudDataManager} The functions to be used when adding or removing a
 * cloud variable.
 */
const cloudDataManager = cloudOptions => {
    let count = 0;

    const canAddCloudVariable = () => count < cloudOptions.limit;

    const addCloudVariable = () => {
        count++;
    };

    const removeCloudVariable = () => {
        count--;
    };

    const hasCloudVariables = () => count > 0;

    const getNumberOfCloudVariables = () => count;

    return {
        canAddCloudVariable,
        addCloudVariable,
        removeCloudVariable,
        hasCloudVariables,
        getNumberOfCloudVariables
    };
};

/**
 * Numeric ID for Runtime._step in Profiler instances.
 * @type {number}
 */
let stepProfilerId = -1;

/**
 * Numeric ID for Sequencer.stepThreads in Profiler instances.
 * @type {number}
 */
let stepThreadsProfilerId = -1;

/**
 * Numeric ID for RenderWebGL.draw in Profiler instances.
 * @type {number}
 */
let rendererDrawProfilerId = -1;

/**
 * Manages targets, scripts, and the sequencer.
 * @constructor
 */
class Runtime extends EventEmitter {
    constructor () {
        super();

        /**
         * Target management and storage.
         * @type {Array.<!Target>}
         */
        this.targets = [];

        /**
         * Targets in reverse order of execution. Shares its order with drawables.
         * @type {Array.<!Target>}
         */
        this.executableTargets = [];

        /**
         * A list of threads that are currently running in the VM.
         * Threads are added when execution starts and pruned when execution ends.
         * @type {Array.<Thread>}
         */
        this.threads = [];

        this.threadMap = new Map();

        /** @type {!Sequencer} */
        this.sequencer = new Sequencer(this);

        /**
         * Storage container for flyout blocks.
         * These will execute on `_editingTarget.`
         * @type {!Blocks}
         */
        this.flyoutBlocks = new Blocks(this, true /* force no glow */);

        /**
         * Storage container for monitor blocks.
         * These will execute on a target maybe
         * @type {!Blocks}
         */
        this.monitorBlocks = new Blocks(this, true /* force no glow */);

        /**
         * Currently known editing target for the VM.
         * @type {?Target}
         */
        this._editingTarget = null;

        /**
         * Map to look up a block primitive's implementation function by its opcode.
         * This is a two-step lookup: package name first, then primitive name.
         * @type {Object.<string, Function>}
         */
        this._primitives = {};

        /**
         * Map to look up all block information by extended opcode.
         * @type {Array.<CategoryInfo>}
         * @private
         */
        this._blockInfo = [];

        /**
         * Map to look up hat blocks' metadata.
         * Keys are opcode for hat, values are metadata objects.
         * @type {Object.<string, Object>}
         */
        this._hats = {};

        /**
         * Map of opcode to information about whether the block's return value should be interpreted
         * for control flow purposes.
         * @type {Record<string, {conditional: boolean}>}
         */
        this._flowing = {};

        /**
         * A list of script block IDs that were glowing during the previous frame.
         * @type {!Array.<!string>}
         */
        this._scriptGlowsPreviousFrame = [];

        /**
         * Number of non-monitor threads running during the previous frame.
         * @type {number}
         */
        this._nonMonitorThreadCount = 0;

        /**
         * All threads that finished running and were removed from this.threads
         * by behaviour in Sequencer.stepThreads.
         * @type {Array<Thread>}
         */
        this._lastStepDoneThreads = null;

        /**
         * Currently known number of clones, used to enforce clone limit.
         * @type {number}
         */
        this._cloneCounter = 0;

        /**
         * Flag to emit a targets update at the end of a step. When target data
         * changes, this flag is set to true.
         * @type {boolean}
         */
        this._refreshTargets = false;

        /**
         * Map to look up all monitor block information by opcode.
         * @type {object}
         * @private
         */
        this.monitorBlockInfo = {};

        /**
         * Ordered map of all monitors, which are MonitorReporter objects.
         */
        this._monitorState = OrderedMap({});

        /**
         * Monitor state from last tick
         */
        this._prevMonitorState = OrderedMap({});

        /**
         * Whether the project is in "turbo mode."
         * @type {Boolean}
         */
        this.turboMode = false;

        /**
         * tw: Responsible for managing the VM's many timers.
         */
        this.frameLoop = new FrameLoop(this);

        /**
         * Current length of a step.
         * Changes as mode switches, and used by the sequencer to calculate
         * WORK_TIME.
         * @type {!number}
         */
        this.currentStepTime = 1000 / 30;

        // Set an intial value for this.currentMSecs
        this.updateCurrentMSecs();

        /**
         * Whether any primitive has requested a redraw.
         * Affects whether `Sequencer.stepThreads` will yield
         * after stepping each thread.
         * Reset on every frame.
         * @type {boolean}
         */
        this.redrawRequested = false;

        // Register all given block packages.
        this._registerBlockPackages();

        // Register and initialize "IO devices", containers for processing
        // I/O related data.
        /** @type {Object.<string, Object>} */
        this.ioDevices = {
            clock: new Clock(this),
            cloud: new Cloud(this),
            keyboard: new Keyboard(this),
            mouse: new Mouse(this),
            mouseWheel: new MouseWheel(this),
            userData: new UserData(),
            video: new Video(this)
        };

        /**
         * A list of extensions, used to manage hardware connection.
         */
        this.peripheralExtensions = {};

        /**
         * A runtime profiler that records timed events for later playback to
         * diagnose Scratch performance.
         * @type {Profiler}
         */
        this.profiler = null;

        this.cloudOptions = {
            limit: 10
        };

        const newCloudDataManager = cloudDataManager(this.cloudOptions);

        /**
         * Check wether the runtime has any cloud data.
         * @type {function}
         * @return {boolean} Whether or not the runtime currently has any
         * cloud variables.
         */
        this.hasCloudData = newCloudDataManager.hasCloudVariables;

        /**
         * A function which checks whether a new cloud variable can be added
         * to the runtime.
         * @type {function}
         * @return {boolean} Whether or not a new cloud variable can be added
         * to the runtime.
         */
        this.canAddCloudVariable = newCloudDataManager.canAddCloudVariable;

        /**
         * A function which returns the number of cloud variables in the runtime.
         * @returns {number}
         */
        this.getNumberOfCloudVariables = newCloudDataManager.getNumberOfCloudVariables;

        /**
         * A function that tracks a new cloud variable in the runtime,
         * updating the cloud variable limit. Calling this function will
         * emit a cloud data update event if this is the first cloud variable
         * being added.
         * @type {function}
         */
        this.addCloudVariable = this._initializeAddCloudVariable(newCloudDataManager);

        /**
         * A function which updates the runtime's cloud variable limit
         * when removing a cloud variable and emits a cloud update event
         * if the last of the cloud variables is being removed.
         * @type {function}
         */
        this.removeCloudVariable = this._initializeRemoveCloudVariable(newCloudDataManager);

        /**
         * A string representing the origin of the current project from outside of the
         * Scratch community, such as CSFirst.
         * @type {?string}
         */
        this.origin = null;

        this._initScratchLink();

        this.resetRunId();

        this._stageTarget = null;

        this.addonBlocks = {};

        this.stageWidth = Runtime.STAGE_WIDTH;
        this.stageHeight = Runtime.STAGE_HEIGHT;

        this.runtimeOptions = {
            maxClones: Runtime.MAX_CLONES,
            miscLimits: true,
            fencing: true
        };

        this.compilerOptions = {
            enabled: true,
            warpTimer: false
        };

        this.debug = false;

        this._lastStepTime = Date.now();
        this.interpolationEnabled = false;

        this._defaultStoredSettings = this._generateAllProjectOptions();

        /**
         * TW: We support a "packaged runtime" mode. This can be used when:
         *  - there will never be an editor attached such as scratch-gui or scratch-blocks
         *  - the project will never be exported with saveProjectSb3()
         *  - original costume and sound data is not needed
         * In this mode, the runtime is able to discard large amounts of data and avoid some processing
         * to make projects load faster and use less memory.
         * This is not designed to protect projects from copying as someone can still copy the data that
         * gets fed into the runtime in the first place.
         * This mode is used by the TurboWarp Packager.
         */
        this.isPackaged = false;

        /**
         * Contains information about the external communication methods that the scripts inside the project
         * can use to send data from inside the project to an external server.
         * Do not update this directly. Use Runtime.setExternalCommunicationMethod() instead.
         */
        this.externalCommunicationMethods = {
            cloudVariables: false,
            customExtensions: false
        };
        this.on(Runtime.HAS_CLOUD_DATA_UPDATE, enabled => {
            this.setExternalCommunicationMethod('cloudVariables', enabled);
        });

        /**
         * If set to true, features such as reading colors from the user's webcam will be disabled
         * when the project has access to any external communication method to protect user privacy.
         * Requires TurboWarp/scratch-render.
         * Do not update this directly. Use Runtime.setEnforcePrivacy() instead.
         */
        this.enforcePrivacy = true;

        /**
         * Internal map of opaque identifiers to the callback to run that function.
         * @type {Map<string, function>}
         */
        this.extensionButtons = new Map();

        /**
         * Responsible for managing custom fonts.
         */
        this.fontManager = new FontManager(this);

        /**
         * Maps extension ID to a JSON-serializable value.
         * @type {Object.<string, object>}
         */
        this.extensionStorage = {};

        /**
         * Total number of scratch-storage load() requests since the runtime was created or cleared.
         */
        this.totalAssetRequests = 0;

        /**
         * Total number of finished or errored scratch-storage load() requests since the runtime was created or cleared.
         */
        this.finishedAssetRequests = 0;
    }

    /**
     * Width of the stage, in pixels.
     * @const {number}
     */
    static get STAGE_WIDTH () {
        // tw: stage size is set per-runtime, this is only the initial value
        return 480;
    }

    /**
     * Height of the stage, in pixels.
     * @const {number}
     */
    static get STAGE_HEIGHT () {
        // tw: stage size is set per-runtime, this is only the initial value
        return 360;
    }

    /**
     * Event name for glowing a script.
     * @const {string}
     */
    static get SCRIPT_GLOW_ON () {
        return 'SCRIPT_GLOW_ON';
    }

    /**
     * Event name for unglowing a script.
     * @const {string}
     */
    static get SCRIPT_GLOW_OFF () {
        return 'SCRIPT_GLOW_OFF';
    }

    /**
     * Event name for glowing a block.
     * @const {string}
     */
    static get BLOCK_GLOW_ON () {
        return 'BLOCK_GLOW_ON';
    }

    /**
     * Event name for unglowing a block.
     * @const {string}
     */
    static get BLOCK_GLOW_OFF () {
        return 'BLOCK_GLOW_OFF';
    }

    /**
     * Event name for a cloud data update
     * to this project.
     * @const {string}
     */
    static get HAS_CLOUD_DATA_UPDATE () {
        return 'HAS_CLOUD_DATA_UPDATE';
    }

    /**
     * Event name for turning on turbo mode.
     * @const {string}
     */
    static get TURBO_MODE_ON () {
        return 'TURBO_MODE_ON';
    }

    /**
     * Event name for turning off turbo mode.
     * @const {string}
     */
    static get TURBO_MODE_OFF () {
        return 'TURBO_MODE_OFF';
    }

    /**
     * Event name for runtime options changing.
     * @const {string}
     */
    static get RUNTIME_OPTIONS_CHANGED () {
        return 'RUNTIME_OPTIONS_CHANGED';
    }

    /**
     * Event name for compiler options changing.
     * @const {string}
     */
    static get COMPILER_OPTIONS_CHANGED () {
        return 'COMPILER_OPTIONS_CHANGED';
    }

    /**
     * Event name for framerate changing.
     * @const {string}
     */
    static get FRAMERATE_CHANGED () {
        return 'FRAMERATE_CHANGED';
    }

    /**
     * Event name for interpolation changing.
     * @const {string}
     */
    static get INTERPOLATION_CHANGED () {
        return 'INTERPOLATION_CHANGED';
    }

    /**
     * Event name for stage size changing.
     * @const {string}
     */
    static get STAGE_SIZE_CHANGED () {
        return 'STAGE_SIZE_CHANGED';
    }

    /**
     * Event name for compiler errors.
     * @const {string}
     */
    static get COMPILE_ERROR () {
        return 'COMPILE_ERROR';
    }

    /**
     * Event called before any block is executed.
     */
    static get BEFORE_EXECUTE () {
        return 'BEFORE_EXECUTE';
    }

    /**
     * Event called after every block in the project has been executed.
     */
    static get AFTER_EXECUTE () {
        return 'AFTER_EXECUTE';
    }

    /**
     * Event name for reporting asset download progress. Fired with finished, total
     * @const {string}
     */
    static get ASSET_PROGRESS () {
        return 'ASSET_PROGRESS';
    }

    /**
     * Event name when the project is started (threads may not necessarily be
     * running).
     * @const {string}
     */
    static get PROJECT_START () {
        return 'PROJECT_START';
    }

    /**
     * Event name when threads start running.
     * Used by the UI to indicate running status.
     * @const {string}
     */
    static get PROJECT_RUN_START () {
        return 'PROJECT_RUN_START';
    }

    /**
     * Event name when threads stop running
     * Used by the UI to indicate not-running status.
     * @const {string}
     */
    static get PROJECT_RUN_STOP () {
        return 'PROJECT_RUN_STOP';
    }

    /**
     * Event name for project being stopped or restarted by the user.
     * Used by blocks that need to reset state.
     * @const {string}
     */
    static get PROJECT_STOP_ALL () {
        return 'PROJECT_STOP_ALL';
    }

    /**
     * Event name for target being stopped by a stop for target call.
     * Used by blocks that need to stop individual targets.
     * @const {string}
     */
    static get STOP_FOR_TARGET () {
        return 'STOP_FOR_TARGET';
    }

    /**
     * Event name for visual value report.
     * @const {string}
     */
    static get VISUAL_REPORT () {
        return 'VISUAL_REPORT';
    }

    /**
     * Event name for project loaded report.
     * @const {string}
     */
    static get PROJECT_LOADED () {
        return 'PROJECT_LOADED';
    }

    /**
     * Event name for report that a change was made that can be saved
     * @const {string}
     */
    static get PROJECT_CHANGED () {
        return 'PROJECT_CHANGED';
    }

    /**
     * Event name for report that a change was made to an extension in the toolbox.
     * @const {string}
     */
    static get TOOLBOX_EXTENSIONS_NEED_UPDATE () {
        return 'TOOLBOX_EXTENSIONS_NEED_UPDATE';
    }

    /**
     * Event name for targets update report.
     * @const {string}
     */
    static get TARGETS_UPDATE () {
        return 'TARGETS_UPDATE';
    }

    /**
     * Event name for monitors update.
     * @const {string}
     */
    static get MONITORS_UPDATE () {
        return 'MONITORS_UPDATE';
    }

    /**
     * Event name for block drag update.
     * @const {string}
     */
    static get BLOCK_DRAG_UPDATE () {
        return 'BLOCK_DRAG_UPDATE';
    }

    /**
     * Event name for block drag end.
     * @const {string}
     */
    static get BLOCK_DRAG_END () {
        return 'BLOCK_DRAG_END';
    }

    /**
     * Event name for reporting that an extension was added.
     * @const {string}
     */
    static get EXTENSION_ADDED () {
        return 'EXTENSION_ADDED';
    }

    /**
     * Event name for reporting that an extension as asked for a custom field to be added
     * @const {string}
     */
    static get EXTENSION_FIELD_ADDED () {
        return 'EXTENSION_FIELD_ADDED';
    }

    /**
     * Event name for updating the available set of peripheral devices.
     * This causes the peripheral connection modal to update a list of
     * available peripherals.
     * @const {string}
     */
    static get PERIPHERAL_LIST_UPDATE () {
        return 'PERIPHERAL_LIST_UPDATE';
    }

    /**
     * Event name for when the user picks a bluetooth device to connect to
     * via Companion Device Manager (CDM)
     * @const {string}
     */
    static get USER_PICKED_PERIPHERAL () {
        return 'USER_PICKED_PERIPHERAL';
    }

    /**
     * Event name for reporting that a peripheral has connected.
     * This causes the status button in the blocks menu to indicate 'connected'.
     * @const {string}
     */
    static get PERIPHERAL_CONNECTED () {
        return 'PERIPHERAL_CONNECTED';
    }

    /**
     * Event name for reporting that a peripheral has been intentionally disconnected.
     * This causes the status button in the blocks menu to indicate 'disconnected'.
     * @const {string}
     */
    static get PERIPHERAL_DISCONNECTED () {
        return 'PERIPHERAL_DISCONNECTED';
    }

    /**
     * Event name for reporting that a peripheral has encountered a request error.
     * This causes the peripheral connection modal to switch to an error state.
     * @const {string}
     */
    static get PERIPHERAL_REQUEST_ERROR () {
        return 'PERIPHERAL_REQUEST_ERROR';
    }

    /**
     * Event name for reporting that a peripheral connection has been lost.
     * This causes a 'peripheral connection lost' error alert to display.
     * @const {string}
     */
    static get PERIPHERAL_CONNECTION_LOST_ERROR () {
        return 'PERIPHERAL_CONNECTION_LOST_ERROR';
    }

    /**
     * Event name for reporting that a peripheral has not been discovered.
     * This causes the peripheral connection modal to show a timeout state.
     * @const {string}
     */
    static get PERIPHERAL_SCAN_TIMEOUT () {
        return 'PERIPHERAL_SCAN_TIMEOUT';
    }

    /**
     * Event name to indicate that the microphone is being used to stream audio.
     * @const {string}
     */
    static get MIC_LISTENING () {
        return 'MIC_LISTENING';
    }

    /**
     * Event name for reporting that blocksInfo was updated.
     * @const {string}
     */
    static get BLOCKSINFO_UPDATE () {
        return 'BLOCKSINFO_UPDATE';
    }

    /**
     * Event name when the runtime tick loop has been started.
     * @const {string}
     */
    static get RUNTIME_STARTED () {
        return 'RUNTIME_STARTED';
    }

    /**
     * Event name when the runtime tick loop has been stopped.
     * @const {string}
     */
    static get RUNTIME_STOPPED () {
        return 'RUNTIME_STOPPED';
    }

    /**
     * Event name when the runtime dispose has been called.
     * @const {string}
     */
    static get RUNTIME_DISPOSED () {
        return 'RUNTIME_DISPOSED';
    }

    /**
     * Event name for reporting that a block was updated and needs to be rerendered.
     * @const {string}
     */
    static get BLOCKS_NEED_UPDATE () {
        return 'BLOCKS_NEED_UPDATE';
    }

    /**
     * How rapidly we try to step threads by default, in ms.
     */
    static get THREAD_STEP_INTERVAL () {
        // tw: not used, only exists for compatibility
        return 1000 / 60;
    }

    /**
     * In compatibility mode, how rapidly we try to step threads, in ms.
     */
    static get THREAD_STEP_INTERVAL_COMPATIBILITY () {
        // tw: not used, only exists for compatibility
        return 1000 / 30;
    }

    /**
     * How many clones can be created at a time.
     * @const {number}
     */
    static get MAX_CLONES () {
        // tw: clone limit is set per-runtime in runtimeOptions, this is only the initial value
        return 300;
    }

    // -----------------------------------------------------------------------------
    // -----------------------------------------------------------------------------

    // Helper function for initializing the addCloudVariable function
    _initializeAddCloudVariable (newCloudDataManager) {
        // The addCloudVariable function
        return (() => {
            const hadCloudVarsBefore = this.hasCloudData();
            newCloudDataManager.addCloudVariable();
            if (!hadCloudVarsBefore && this.hasCloudData()) {
                this.emit(Runtime.HAS_CLOUD_DATA_UPDATE, true);
            }
        });
    }

    // Helper function for initializing the removeCloudVariable function
    _initializeRemoveCloudVariable (newCloudDataManager) {
        return (() => {
            const hadCloudVarsBefore = this.hasCloudData();
            newCloudDataManager.removeCloudVariable();
            if (hadCloudVarsBefore && !this.hasCloudData()) {
                this.emit(Runtime.HAS_CLOUD_DATA_UPDATE, false);
            }
        });
    }

    /**
     * Register default block packages with this runtime.
     * @todo Prefix opcodes with package name.
     * @private
     */
    _registerBlockPackages () {
        for (const packageName in defaultBlockPackages) {
            if (Object.prototype.hasOwnProperty.call(defaultBlockPackages, packageName)) {
                // @todo pass a different runtime depending on package privilege?
                const packageObject = new (defaultBlockPackages[packageName])(this);
                // Collect primitives from package.
                if (packageObject.getPrimitives) {
                    const packagePrimitives = packageObject.getPrimitives();
                    for (const op in packagePrimitives) {
                        if (Object.prototype.hasOwnProperty.call(packagePrimitives, op)) {
                            this._primitives[op] =
                                packagePrimitives[op].bind(packageObject);
                        }
                    }
                }
                // Collect hat metadata from package.
                if (packageObject.getHats) {
                    const packageHats = packageObject.getHats();
                    for (const hatName in packageHats) {
                        if (Object.prototype.hasOwnProperty.call(packageHats, hatName)) {
                            this._hats[hatName] = packageHats[hatName];
                        }
                    }
                }
                // Collect monitored from package.
                if (packageObject.getMonitored) {
                    this.monitorBlockInfo = Object.assign({}, this.monitorBlockInfo, packageObject.getMonitored());
                }

                this.compilerRegisterExtension(packageName, packageObject);
            }
        }
    }

    compilerRegisterExtension (name, extensionObject) {
        this[`ext_${name}`] = extensionObject;
    }

    getMonitorState () {
        return this._monitorState;
    }

    /**
     * Generate an extension-specific menu ID.
     * @param {string} menuName - the name of the menu.
     * @param {string} extensionId - the ID of the extension hosting the menu.
     * @returns {string} - the constructed ID.
     * @private
     */
    _makeExtensionMenuId (menuName, extensionId) {
        return `${extensionId}_menu_${menuName}`;
    }

    /**
     * Create a context ("args") object for use with `formatMessage` on messages which might be target-specific.
     * @param {Target} [target] - the target to use as context. If a target is not provided, default to the current
     * editing target or the stage.
     */
    makeMessageContextForTarget (target) {
        const context = {};
        target = target || this.getEditingTarget() || this.getTargetForStage();
        if (target) {
            context.targetType = (target.isStage ? TargetType.STAGE : TargetType.SPRITE);
        }
    }

    /**
     * Register the primitives provided by an extension.
     * @param {ExtensionMetadata} extensionInfo - information about the extension (id, blocks, etc.)
     * @private
     */
    _registerExtensionPrimitives (extensionInfo) {
        const categoryInfo = {
            id: extensionInfo.id,
            name: maybeFormatMessage(extensionInfo.name),
            showStatusButton: extensionInfo.showStatusButton,
            blockIconURI: extensionInfo.blockIconURI,
            menuIconURI: extensionInfo.menuIconURI
        };

        if (extensionInfo.color1) {
            categoryInfo.color1 = extensionInfo.color1;
            categoryInfo.color2 = extensionInfo.color2;
            categoryInfo.color3 = extensionInfo.color3;
        } else {
            categoryInfo.color1 = defaultExtensionColors[0];
            categoryInfo.color2 = defaultExtensionColors[1];
            categoryInfo.color3 = defaultExtensionColors[2];
        }

        this._blockInfo.push(categoryInfo);

        this._fillExtensionCategory(categoryInfo, extensionInfo);

        for (const fieldTypeName in categoryInfo.customFieldTypes) {
            if (Object.prototype.hasOwnProperty.call(extensionInfo.customFieldTypes, fieldTypeName)) {
                const fieldTypeInfo = categoryInfo.customFieldTypes[fieldTypeName];

                // Emit events for custom field types from extension
                this.emit(Runtime.EXTENSION_FIELD_ADDED, {
                    name: `field_${fieldTypeInfo.extendedName}`,
                    implementation: fieldTypeInfo.fieldImplementation
                });
            }
        }

        this.emit(Runtime.EXTENSION_ADDED, categoryInfo);
    }

    /**
     * Reregister the primitives for an extension
     * @param  {ExtensionMetadata} extensionInfo - new info (results of running getInfo) for an extension
     * @private
     */
    _refreshExtensionPrimitives (extensionInfo) {
        const categoryInfo = this._blockInfo.find(info => info.id === extensionInfo.id);
        if (categoryInfo) {
            categoryInfo.name = maybeFormatMessage(extensionInfo.name);
            this._fillExtensionCategory(categoryInfo, extensionInfo);

            this.emit(Runtime.BLOCKSINFO_UPDATE, categoryInfo);
        }
    }

    /**
     * Read extension information, convert menus, blocks and custom field types
     * and store the results in the provided category object.
     * @param {CategoryInfo} categoryInfo - the category to be filled
     * @param {ExtensionMetadata} extensionInfo - the extension metadata to read
     * @private
     */
    _fillExtensionCategory (categoryInfo, extensionInfo) {
        categoryInfo.blocks = [];
        categoryInfo.customFieldTypes = {};
        categoryInfo.menus = [];
        categoryInfo.menuInfo = {};

        for (const menuName in extensionInfo.menus) {
            if (Object.prototype.hasOwnProperty.call(extensionInfo.menus, menuName)) {
                const menuInfo = extensionInfo.menus[menuName];
                const convertedMenu = this._buildMenuForScratchBlocks(menuName, menuInfo, categoryInfo);
                categoryInfo.menus.push(convertedMenu);
                categoryInfo.menuInfo[menuName] = menuInfo;
            }
        }
        for (const fieldTypeName in extensionInfo.customFieldTypes) {
            if (Object.prototype.hasOwnProperty.call(extensionInfo.customFieldTypes, fieldTypeName)) {
                const fieldType = extensionInfo.customFieldTypes[fieldTypeName];
                const fieldTypeInfo = this._buildCustomFieldInfo(
                    fieldTypeName,
                    fieldType,
                    extensionInfo.id,
                    categoryInfo
                );

                categoryInfo.customFieldTypes[fieldTypeName] = fieldTypeInfo;
            }
        }

        if (extensionInfo.docsURI) {
            const xml = '<button ' +
                `text="${xmlEscape(maybeFormatMessage({
                    id: 'tw.blocks.openDocs',
                    default: 'Open Documentation',
                    description: 'Button that opens site with more documentation about an extension'
                }))}" ` +
                'callbackKey="OPEN_EXTENSION_DOCS" ' +
                `callbackData="${xmlEscape(extensionInfo.docsURI)}"></button>`;
            const block = {
                info: {},
                xml
            };
            categoryInfo.blocks.push(block);
        }

        for (const blockInfo of extensionInfo.blocks) {
            try {
                const convertedBlock = this._convertForScratchBlocks(blockInfo, categoryInfo);
                categoryInfo.blocks.push(convertedBlock);
                if (convertedBlock.json) {
                    const opcode = convertedBlock.json.type;
                    if (blockInfo.blockType !== BlockType.EVENT) {
                        this._primitives[opcode] = convertedBlock.info.func;
                    }
                    if (blockInfo.blockType === BlockType.EVENT || blockInfo.blockType === BlockType.HAT) {
                        this._hats[opcode] = {
                            edgeActivated: blockInfo.isEdgeActivated,
                            restartExistingThreads: blockInfo.shouldRestartExistingThreads
                        };
                    } else if (blockInfo.blockType === BlockType.CONDITIONAL) {
                        this._flowing[opcode] = {
                            conditional: true,
                            loop: false
                        };
                    } else if (blockInfo.blockType === BlockType.LOOP) {
                        this._flowing[opcode] = {
                            conditional: false,
                            loop: true
                        };
                    }
                }
            } catch (e) {
                log.error('Error parsing block: ', {block: blockInfo, error: e});
            }
        }
    }

    /**
     * Convert the given extension menu items into the scratch-blocks style of list of pairs.
     * If the menu is dynamic (e.g. the passed in argument is a function), return the input unmodified.
     * @param {object} menuItems - an array of menu items or a function to retrieve such an array
     * @returns {object} - an array of 2 element arrays or the original input function
     * @private
     */
    _convertMenuItems (menuItems) {
        if (typeof menuItems !== 'function') {
            const extensionMessageContext = this.makeMessageContextForTarget();
            return menuItems.map(item => {
                const formattedItem = maybeFormatMessage(item, extensionMessageContext);
                switch (typeof formattedItem) {
                case 'string':
                    return [formattedItem, formattedItem];
                case 'object':
                    return [maybeFormatMessage(item.text, extensionMessageContext), item.value];
                default:
                    throw new Error(`Can't interpret menu item: ${JSON.stringify(item)}`);
                }
            });
        }
        return menuItems;
    }

    /**
     * Build the scratch-blocks JSON for a menu. Note that scratch-blocks treats menus as a special kind of block.
     * @param {string} menuName - the name of the menu
     * @param {object} menuInfo - a description of this menu and its items
     * @property {*} items - an array of menu items or a function to retrieve such an array
     * @property {boolean} [acceptReporters] - if true, allow dropping reporters onto this menu
     * @param {CategoryInfo} categoryInfo - the category for this block
     * @returns {object} - a JSON-esque object ready for scratch-blocks' consumption
     * @private
     */
    _buildMenuForScratchBlocks (menuName, menuInfo, categoryInfo) {
        const menuId = this._makeExtensionMenuId(menuName, categoryInfo.id);
        const menuItems = this._convertMenuItems(menuInfo.items);
        return {
            json: {
                message0: '%1',
                type: menuId,
                inputsInline: true,
                output: 'String',
                colour: categoryInfo.color1,
                colourSecondary: categoryInfo.color2,
                colourTertiary: categoryInfo.color3,
                outputShape: menuInfo.acceptReporters ?
                    ScratchBlocksConstants.OUTPUT_SHAPE_ROUND : ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE,
                args0: [
                    {
                        type: 'field_dropdown',
                        name: menuName,
                        options: menuItems
                    }
                ]
            }
        };
    }

    _buildCustomFieldInfo (fieldName, fieldInfo, extensionId, categoryInfo) {
        const extendedName = `${extensionId}_${fieldName}`;
        return {
            fieldName: fieldName,
            extendedName: extendedName,
            argumentTypeInfo: {
                shadow: {
                    type: extendedName,
                    fieldName: `field_${extendedName}`
                }
            },
            scratchBlocksDefinition: this._buildCustomFieldTypeForScratchBlocks(
                extendedName,
                fieldInfo.output,
                fieldInfo.outputShape,
                categoryInfo
            ),
            fieldImplementation: fieldInfo.implementation
        };
    }

    /**
     * Build the scratch-blocks JSON needed for a fieldType.
     * Custom field types need to be namespaced to the extension so that extensions can't interfere with each other
     * @param  {string} fieldName - The name of the field
     * @param {string} output - The output of the field
     * @param {number} outputShape - Shape of the field (from ScratchBlocksConstants)
     * @param {object} categoryInfo - The category the field belongs to (Used to set its colors)
     * @returns {object} - Object to be inserted into scratch-blocks
     */
    _buildCustomFieldTypeForScratchBlocks (fieldName, output, outputShape, categoryInfo) {
        return {
            json: {
                type: fieldName,
                message0: '%1',
                inputsInline: true,
                output: output,
                colour: categoryInfo.color1,
                colourSecondary: categoryInfo.color2,
                colourTertiary: categoryInfo.color3,
                outputShape: outputShape,
                args0: [
                    {
                        name: `field_${fieldName}`,
                        type: `field_${fieldName}`
                    }
                ]
            }
        };
    }

    /**
     * Convert ExtensionBlockMetadata into data ready for scratch-blocks.
     * @param {ExtensionBlockMetadata} blockInfo - the block info to convert
     * @param {CategoryInfo} categoryInfo - the category for this block
     * @returns {ConvertedBlockInfo} - the converted & original block information
     * @private
     */
    _convertForScratchBlocks (blockInfo, categoryInfo) {
        if (blockInfo === '---') {
            return this._convertSeparatorForScratchBlocks(blockInfo);
        }

        if (blockInfo.blockType === BlockType.LABEL) {
            return this._convertLabelForScratchBlocks(blockInfo);
        }

        if (blockInfo.blockType === BlockType.BUTTON) {
            return this._convertButtonForScratchBlocks(blockInfo, categoryInfo);
        }

        if (blockInfo.blockType === BlockType.XML) {
            return this._convertXmlForScratchBlocks(blockInfo);
        }

        return this._convertBlockForScratchBlocks(blockInfo, categoryInfo);
    }

    /**
     * Convert ExtensionBlockMetadata into scratch-blocks JSON & XML, and generate a proxy function.
     * @param {ExtensionBlockMetadata} blockInfo - the block to convert
     * @param {CategoryInfo} categoryInfo - the category for this block
     * @returns {ConvertedBlockInfo} - the converted & original block information
     * @private
     */
    _convertBlockForScratchBlocks (blockInfo, categoryInfo) {
        const extendedOpcode = `${categoryInfo.id}_${blockInfo.opcode}`;

        const blockJSON = {
            type: extendedOpcode,
            inputsInline: true,
            category: categoryInfo.name,
            extensions: blockInfo.extensions ?? [],
            colour: blockInfo.color1 ?? categoryInfo.color1,
            colourSecondary: blockInfo.color2 ?? categoryInfo.color2,
            colourTertiary: blockInfo.color3 ?? categoryInfo.color3
        };
        const context = {
            // TODO: store this somewhere so that we can map args appropriately after translation.
            // This maps an arg name to its relative position in the original (usually English) block text.
            // When displaying a block in another language we'll need to run a `replace` action similar to the one
            // below, but each `[ARG]` will need to be replaced with the number in this map.
            argsMap: {},
            blockJSON,
            categoryInfo,
            blockInfo,
            inputList: []
        };

        // If an icon for the extension exists, prepend it to each block, with a vertical separator.
        // We can overspecify an icon for each block, but if no icon exists on a block, fall back to
        // the category block icon.
        const iconURI = blockInfo.blockIconURI || categoryInfo.blockIconURI;

        if (iconURI) {
            if (!blockJSON.extensions.includes('scratch_extension')) {
                blockJSON.extensions.push('scratch_extension');
            }
            blockJSON.message0 = '%1 %2';
            const iconJSON = {
                type: 'field_image',
                src: iconURI,
                width: 40,
                height: 40
            };
            const separatorJSON = {
                type: 'field_vertical_separator'
            };
            blockJSON.args0 = [
                iconJSON,
                separatorJSON
            ];
        }

        switch (blockInfo.blockType) {
        case BlockType.COMMAND:
            blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE;
            blockJSON.previousStatement = null; // null = available connection; undefined = hat
            if (!blockInfo.isTerminal) {
                blockJSON.nextStatement = null; // null = available connection; undefined = terminal
            }
            break;
        case BlockType.REPORTER:
            blockJSON.output = blockInfo.allowDropAnywhere ? null : 'String'; // TODO: distinguish number & string here?
            blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_ROUND;
            break;
        case BlockType.BOOLEAN:
            blockJSON.output = 'Boolean';
            blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_HEXAGONAL;
            break;
        case BlockType.HAT:
        case BlockType.EVENT:
            if (!Object.prototype.hasOwnProperty.call(blockInfo, 'isEdgeActivated')) {
                // if absent, this property defaults to true
                blockInfo.isEdgeActivated = true;
            }
            blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE;
            blockJSON.nextStatement = null; // null = available connection; undefined = terminal
            break;
        case BlockType.CONDITIONAL:
        case BlockType.LOOP:
            blockInfo.branchCount = blockInfo.branchCount || 1;
            blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE;
            blockJSON.previousStatement = null; // null = available connection; undefined = hat
            if (!blockInfo.isTerminal) {
                blockJSON.nextStatement = null; // null = available connection; undefined = terminal
            }
            break;
        }

        const blockText = Array.isArray(blockInfo.text) ? blockInfo.text : [blockInfo.text];
        let inTextNum = 0; // text for the next block "arm" is blockText[inTextNum]
        let inBranchNum = 0; // how many branches have we placed into the JSON so far?
        let outLineNum = 0; // used for scratch-blocks `message${outLineNum}` and `args${outLineNum}`
        const convertPlaceholders = this._convertPlaceholders.bind(this, context);
        const extensionMessageContext = this.makeMessageContextForTarget();

        // alternate between a block "arm" with text on it and an open slot for a substack
        while (inTextNum < blockText.length || inBranchNum < blockInfo.branchCount) {
            if (inTextNum < blockText.length) {
                context.outLineNum = outLineNum;
                const lineText = maybeFormatMessage(blockText[inTextNum], extensionMessageContext);
                const convertedText = lineText.replace(/\[(.+?)]/g, convertPlaceholders);
                if (blockJSON[`message${outLineNum}`]) {
                    blockJSON[`message${outLineNum}`] += convertedText;
                } else {
                    blockJSON[`message${outLineNum}`] = convertedText;
                }
                ++inTextNum;
                ++outLineNum;
            }
            if (inBranchNum < blockInfo.branchCount) {
                blockJSON[`message${outLineNum}`] = '%1';
                blockJSON[`args${outLineNum}`] = [{
                    type: 'input_statement',
                    name: `SUBSTACK${inBranchNum > 0 ? inBranchNum + 1 : ''}`
                }];
                ++inBranchNum;
                ++outLineNum;
            }
        }

        if (blockInfo.blockType === BlockType.REPORTER || blockInfo.blockType === BlockType.BOOLEAN) {
            if (!blockInfo.disableMonitor && context.inputList.length === 0) {
                blockJSON.checkboxInFlyout = true;
            }
        } else if (
            blockInfo.branchIconURI || (
                blockInfo.blockType === BlockType.LOOP &&
                !Object.prototype.hasOwnProperty.call(blockInfo, 'branchIconURI')
            )
        ) {
            // Add icon to the bottom right of a loop block
            blockJSON[`lastDummyAlign${outLineNum}`] = 'RIGHT';
            blockJSON[`message${outLineNum}`] = '%1';
            blockJSON[`args${outLineNum}`] = [{
                type: 'field_image',
                src: blockInfo.branchIconURI ?? 'media://repeat.svg',
                width: 24,
                height: 24,
                alt: '*', // TODO remove this since we don't use collapsed blocks in scratch
                flip_rtl: true
            }];
            ++outLineNum;
        }

        const mutation = blockInfo.isDynamic ? `<mutation blockInfo="${xmlEscape(JSON.stringify(blockInfo))}"/>` : '';
        const inputs = context.inputList.join('');
        const blockXML = `<block type="${xmlEscape(extendedOpcode)}">${mutation}${inputs}</block>`;

        return {
            info: context.blockInfo,
            json: context.blockJSON,
            xml: blockXML
        };
    }

    /**
     * Generate a separator between blocks categories or sub-categories.
     * @param {ExtensionBlockMetadata} blockInfo - the block to convert
     * @param {CategoryInfo} categoryInfo - the category for this block
     * @returns {ConvertedBlockInfo} - the converted & original block information
     * @private
     */
    _convertSeparatorForScratchBlocks (blockInfo) {
        return {
            info: blockInfo,
            xml: '<sep gap="36"/>'
        };
    }

    /**
     * Generate a label between blocks categories or sub-categories.
     * @param {ExtensionBlockMetadata} blockInfo - the block to convert
     * @returns {ConvertedBlockInfo} - the converted & original block information
     * @private
     */
    _convertLabelForScratchBlocks (blockInfo) {
        return {
            info: blockInfo,
            xml: `<label text="${xmlEscape(blockInfo.text)}"></label>`
        };
    }
    
    /**
     * Convert a button for scratch-blocks. A button has no opcode but specifies a callback name in the `func` field.
     * @param {ExtensionBlockMetadata} buttonInfo - the button to convert
     * @property {string} func - the callback name
     * @param {CategoryInfo} categoryInfo - the category for this button
     * @returns {ConvertedBlockInfo} - the converted & original button information
     * @private
     */
    _convertButtonForScratchBlocks (buttonInfo, categoryInfo) {
        const extensionMessageContext = this.makeMessageContextForTarget();
        const buttonText = maybeFormatMessage(buttonInfo.text, extensionMessageContext);
        const nativeCallbackKeys = ['MAKE_A_LIST', 'MAKE_A_PROCEDURE', 'MAKE_A_VARIABLE'];
        if (nativeCallbackKeys.includes(buttonInfo.func)) {
            return {
                info: buttonInfo,
                xml: `<button text="${xmlEscape(buttonText)}" callbackKey="${xmlEscape(buttonInfo.func)}"></button>`
            };
        }
        // Callbacks with data will be forwarded from GUI
        const id = `${categoryInfo.id}_${buttonInfo.func}`;
        // callFunc is set by extension manager
        this.extensionButtons.set(id, buttonInfo.callFunc);
        return {
            info: buttonInfo,
            xml: `<button text="${xmlEscape(buttonText)}"` +
                ' callbackKey="EXTENSION_CALLBACK"' +
                ` callbackData="${xmlEscape(id)}"></button>`
        };
    }

    _convertXmlForScratchBlocks (xmlInfo) {
        return {
            info: xmlInfo,
            xml: xmlInfo.xml
        };
    }

    handleExtensionButtonPress (buttonData) {
        const callback = this.extensionButtons.get(buttonData);
        callback();
    }

    /**
     * Helper for _convertPlaceholdes which handles inline images which are a specialized case of block "arguments".
     * @param {object} argInfo Metadata about the inline image as specified by the extension
     * @return {object} JSON blob for a scratch-blocks image field.
     * @private
     */
    _constructInlineImageJson (argInfo) {
        if (!argInfo.dataURI) {
            log.warn('Missing data URI in extension block with argument type IMAGE');
        }
        return {
            type: 'field_image',
            src: argInfo.dataURI || '',
            // TODO these probably shouldn't be hardcoded...?
            width: 24,
            height: 24,
            // Whether or not the inline image should be flipped horizontally
            // in RTL languages. Defaults to false, indicating that the
            // image will not be flipped.
            flip_rtl: argInfo.flipRTL || false
        };
    }

    /**
     * Helper for _convertForScratchBlocks which handles linearization of argument placeholders. Called as a callback
     * from string#replace. In addition to the return value the JSON and XML items in the context will be filled.
     * @param {object} context - information shared with _convertForScratchBlocks about the block, etc.
     * @param {string} match - the overall string matched by the placeholder regex, including brackets: '[FOO]'.
     * @param {string} placeholder - the name of the placeholder being matched: 'FOO'.
     * @return {string} scratch-blocks placeholder for the argument: '%1'.
     * @private
     */
    _convertPlaceholders (context, match, placeholder) {
        // Determine whether the argument type is one of the known standard field types
        const argInfo = context.blockInfo.arguments[placeholder] || {};
        let argTypeInfo = ArgumentTypeMap[argInfo.type] || {};

        // Field type not a standard field type, see if extension has registered custom field type
        if (!ArgumentTypeMap[argInfo.type] && context.categoryInfo.customFieldTypes[argInfo.type]) {
            argTypeInfo = context.categoryInfo.customFieldTypes[argInfo.type].argumentTypeInfo;
        }

        // Start to construct the scratch-blocks style JSON defining how the block should be
        // laid out
        let argJSON;

        // Most field types are inputs (slots on the block that can have other blocks plugged into them)
        // check if this is not one of those cases. E.g. an inline image on a block.
        if (argTypeInfo.fieldType === 'field_image') {
            argJSON = this._constructInlineImageJson(argInfo);
        } else {
            // Construct input value

            // Layout a block argument (e.g. an input slot on the block)
            argJSON = {
                type: 'input_value',
                name: placeholder
            };

            const defaultValue =
                typeof argInfo.defaultValue === 'undefined' ? null :
                    maybeFormatMessage(argInfo.defaultValue, this.makeMessageContextForTarget()).toString();

            if (argTypeInfo.check) {
                // Right now the only type of 'check' we have specifies that the
                // input slot on the block accepts Boolean reporters, so it should be
                // shaped like a hexagon
                argJSON.check = argTypeInfo.check;
            }

            let valueName;
            let shadowType;
            let fieldName;
            if (argInfo.menu) {
                const menuInfo = context.categoryInfo.menuInfo[argInfo.menu];
                if (menuInfo.acceptReporters) {
                    valueName = placeholder;
                    shadowType = this._makeExtensionMenuId(argInfo.menu, context.categoryInfo.id);
                    fieldName = argInfo.menu;
                } else {
                    argJSON.type = 'field_dropdown';
                    argJSON.options = this._convertMenuItems(menuInfo.items);
                    valueName = null;
                    shadowType = null;
                    fieldName = placeholder;
                }
            } else {
                valueName = placeholder;
                shadowType = (argTypeInfo.shadow && argTypeInfo.shadow.type) || null;
                fieldName = (argTypeInfo.shadow && argTypeInfo.shadow.fieldName) || null;
            }

            // <value> is the ScratchBlocks name for a block input.
            if (valueName) {
                context.inputList.push(`<value name="${xmlEscape(placeholder)}">`);
            }

            // The <shadow> is a placeholder for a reporter and is visible when there's no reporter in this input.
            // Boolean inputs don't need to specify a shadow in the XML.
            if (shadowType) {
                context.inputList.push(`<shadow type="${xmlEscape(shadowType)}">`);
            }

            // A <field> displays a dynamic value: a user-editable text field, a drop-down menu, etc.
            // Leave out the field if defaultValue or fieldName are not specified
            if (defaultValue !== null && fieldName) {
                context.inputList.push(`<field name="${xmlEscape(fieldName)}">${xmlEscape(defaultValue)}</field>`);
            }

            if (shadowType) {
                context.inputList.push('</shadow>');
            }

            if (valueName) {
                context.inputList.push('</value>');
            }
        }

        const argsName = `args${context.outLineNum}`;
        const blockArgs = (context.blockJSON[argsName] = context.blockJSON[argsName] || []);
        if (argJSON) blockArgs.push(argJSON);
        const argNum = blockArgs.length;
        context.argsMap[placeholder] = argNum;

        return `%${argNum}`;
    }

    /**
     * @returns {Array.<object>} scratch-blocks XML for each category of extension blocks, in category order.
     * @param {?Target} [target] - the active editing target (optional)
     * @property {string} id - the category / extension ID
     * @property {string} xml - the XML text for this category, starting with `<category>` and ending with `</category>`
     */
    getBlocksXML (target) {
        return this._blockInfo.map(categoryInfo => {
            const {name, color1, color2} = categoryInfo;
            // Filter out blocks that aren't supposed to be shown on this target, as determined by the block info's
            // `hideFromPalette` and `filter` properties.
            const paletteBlocks = categoryInfo.blocks.filter(block => {
                let blockFilterIncludesTarget = true;
                // If an editing target is not passed, include all blocks
                // If the block info doesn't include a `filter` property, always include it
                if (target && block.info.filter) {
                    blockFilterIncludesTarget = block.info.filter.includes(
                        target.isStage ? TargetType.STAGE : TargetType.SPRITE
                    );
                }
                // If the block info's `hideFromPalette` is true, then filter out this block
                return blockFilterIncludesTarget && !block.info.hideFromPalette;
            });

            const colorXML = `colour="${xmlEscape(color1)}" secondaryColour="${xmlEscape(color2)}"`;

            // Use a menu icon if there is one. Otherwise, use the block icon. If there's no icon,
            // the category menu will show its default colored circle.
            let menuIconURI = '';
            if (categoryInfo.menuIconURI) {
                menuIconURI = categoryInfo.menuIconURI;
            } else if (categoryInfo.blockIconURI) {
                menuIconURI = categoryInfo.blockIconURI;
            }
            const menuIconXML = menuIconURI ?
                `iconURI="${xmlEscape(menuIconURI)}"` : '';

            let statusButtonXML = '';
            if (categoryInfo.showStatusButton) {
                statusButtonXML = 'showStatusButton="true"';
            }

            let xml = `<category name="${xmlEscape(name)}"`;
            xml += ` id="${xmlEscape(categoryInfo.id)}"`;
            xml += ` ${statusButtonXML}`;
            xml += ` ${colorXML}`;
            xml += ` ${menuIconXML}>`;
            xml += paletteBlocks.map(block => block.xml).join('');
            xml += '</category>';

            return {
                id: categoryInfo.id,
                xml
            };
        });
    }

    /**
     * @returns {Array.<string>} - an array containing the scratch-blocks JSON information for each dynamic block.
     */
    getBlocksJSON () {
        return this._blockInfo.reduce(
            (result, categoryInfo) => result.concat(categoryInfo.blocks.map(blockInfo => blockInfo.json)), []);
    }

    /**
     * One-time initialization for Scratch Link support.
     */
    _initScratchLink () {
        // Check that we're actually in a real browser, not Node.js or JSDOM, and we have a valid-looking origin.
        // note that `if (self?....)` will throw if `self` is undefined, so check for that first!
        if (typeof self !== 'undefined' &&
            typeof document !== 'undefined' &&
            document.getElementById &&
            self.origin &&
            self.origin !== 'null' && // note this is a string comparison, not a null check
            self.navigator &&
            self.navigator.userAgent &&
            !(
                self.navigator.userAgent.includes('Node.js') ||
                self.navigator.userAgent.includes('jsdom')
            )
        ) {
            // Create a script tag for the Scratch Link browser extension, unless one already exists
            const scriptElement = document.getElementById('scratch-link-extension-script');
            if (!scriptElement) {
                const script = document.createElement('script');
                script.id = 'scratch-link-extension-script';
                document.body.appendChild(script);

                // Tell the browser extension to inject its script.
                // If the extension isn't present or isn't active, this will do nothing.
                self.postMessage('inject-scratch-link-script', self.origin);
            }
        }
    }

    /**
     * Get a scratch link socket.
     * @param {string} type Either BLE or BT
     * @returns {ScratchLinkSocket} The scratch link socket.
     */
    getScratchLinkSocket (type) {
        const factory = this._linkSocketFactory || this._defaultScratchLinkSocketFactory;
        return factory(type);
    }

    /**
     * Configure how ScratchLink sockets are created. Factory must consume a "type" parameter
     * either BT or BLE.
     * @param {Function} factory The new factory for creating ScratchLink sockets.
     */
    configureScratchLinkSocketFactory (factory) {
        this._linkSocketFactory = factory;
    }

    /**
     * The default scratch link socket creator, using websockets to the installed device manager.
     * @param {string} type Either BLE or BT
     * @returns {ScratchLinkSocket} The new scratch link socket (a WebSocket object)
     */
    _defaultScratchLinkSocketFactory (type) {
        const Scratch = self.Scratch;
        const ScratchLinkSafariSocket = Scratch && Scratch.ScratchLinkSafariSocket;
        // detect this every time in case the user turns on the extension after loading the page
        const useSafariSocket = ScratchLinkSafariSocket && ScratchLinkSafariSocket.isSafariHelperCompatible();
        return useSafariSocket ? new ScratchLinkSafariSocket(type) : new ScratchLinkWebSocket(type);
    }

    /**
     * Register an extension that communications with a hardware peripheral by id,
     * to have access to it and its peripheral functions in the future.
     * @param {string} extensionId - the id of the extension.
     * @param {object} extension - the extension to register.
     */
    registerPeripheralExtension (extensionId, extension) {
        this.peripheralExtensions[extensionId] = extension;
    }

    /**
     * Tell the specified extension to scan for a peripheral.
     * @param {string} extensionId - the id of the extension.
     */
    scanForPeripheral (extensionId) {
        if (this.peripheralExtensions[extensionId]) {
            this.peripheralExtensions[extensionId].scan();
        }
    }

    /**
     * Connect to the extension's specified peripheral.
     * @param {string} extensionId - the id of the extension.
     * @param {number} peripheralId - the id of the peripheral.
     */
    connectPeripheral (extensionId, peripheralId) {
        if (this.peripheralExtensions[extensionId]) {
            this.peripheralExtensions[extensionId].connect(peripheralId);
        }
    }

    /**
     * Disconnect from the extension's connected peripheral.
     * @param {string} extensionId - the id of the extension.
     */
    disconnectPeripheral (extensionId) {
        if (this.peripheralExtensions[extensionId]) {
            this.peripheralExtensions[extensionId].disconnect();
        }
    }

    /**
     * Returns whether the extension has a currently connected peripheral.
     * @param {string} extensionId - the id of the extension.
     * @return {boolean} - whether the extension has a connected peripheral.
     */
    getPeripheralIsConnected (extensionId) {
        let isConnected = false;
        if (this.peripheralExtensions[extensionId]) {
            isConnected = this.peripheralExtensions[extensionId].isConnected();
        }
        return isConnected;
    }

    /**
     * Emit an event to indicate that the microphone is being used to stream audio.
     * @param {boolean} listening - true if the microphone is currently listening.
     */
    emitMicListening (listening) {
        this.emit(Runtime.MIC_LISTENING, listening);
    }

    /**
     * Retrieve the function associated with the given opcode.
     * @param {!string} opcode The opcode to look up.
     * @return {Function} The function which implements the opcode.
     */
    getOpcodeFunction (opcode) {
        return this._primitives[opcode];
    }

    /**
     * Return whether an opcode represents a hat block.
     * @param {!string} opcode The opcode to look up.
     * @return {boolean} True if the op is known to be a hat.
     */
    getIsHat (opcode) {
        return Object.prototype.hasOwnProperty.call(this._hats, opcode);
    }

    /**
     * Return whether an opcode represents an edge-activated hat block.
     * @param {!string} opcode The opcode to look up.
     * @return {boolean} True if the op is known to be a edge-activated hat.
     */
    getIsEdgeActivatedHat (opcode) {
        return Object.prototype.hasOwnProperty.call(this._hats, opcode) &&
            this._hats[opcode].edgeActivated;
    }


    /**
     * Attach the audio engine
     * @param {!AudioEngine} audioEngine The audio engine to attach
     */
    attachAudioEngine (audioEngine) {
        this.audioEngine = audioEngine;
    }

    /**
     * Attach the renderer
     * @param {!RenderWebGL} renderer The renderer to attach
     */
    attachRenderer (renderer) {
        this.renderer = renderer;
        this.renderer.setLayerGroupOrdering(StageLayering.LAYER_GROUPS);
        this.renderer.offscreenTouching = !this.runtimeOptions.fencing;
        this.updatePrivacy();
    }

    /**
     * Set the bitmap adapter for the VM/runtime, which converts scratch 2
     * bitmaps to scratch 3 bitmaps. (Scratch 3 bitmaps are all bitmap resolution 2)
     * @param {!function} bitmapAdapter The adapter to attach
     */
    attachV2BitmapAdapter (bitmapAdapter) {
        this.v2BitmapAdapter = bitmapAdapter;
    }

    /**
     * Attach the storage module
     * @param {!ScratchStorage} storage The storage module to attach
     */
    attachStorage (storage) {
        this.storage = storage;

        if (this.isPackaged) {
            // In packaged runtime mode, generating real asset IDs is a waste of time.
            // We do still want to preserve every asset having a unique ID.
            const originalCreateAsset = storage.createAsset;
            let assetIdCounter = 0;
            // eslint-disable-next-line no-unused-vars
            storage.createAsset = function packagedCreateAsset (assetType, dataFormat, data, assetId, generateId) {
                if (!assetId) {
                    assetId = (++assetIdCounter).toString();
                }
                return originalCreateAsset.call(
                    this,
                    assetType,
                    dataFormat,
                    data,
                    assetId,
                    // Never generate real asset ID
                    false
                );
            };
        }

        fetchWithTimeout.setFetch(storage.scratchFetch.scratchFetch);
        this.resetRunId();
    }

    // -----------------------------------------------------------------------------
    // -----------------------------------------------------------------------------

    /**
     * Create a thread and push it to the list of threads.
     * @param {!string} id ID of block that starts the stack.
     * @param {!Target} target Target to run thread on.
     * @param {?object} opts optional arguments
     * @param {?boolean} opts.stackClick true if the script was activated by clicking on the stack
     * @param {?boolean} opts.updateMonitor true if the script should update a monitor value
     * @return {!Thread} The newly created thread.
     */
    _pushThread (id, target, opts) {
        const thread = new Thread(id);
        thread.target = target;
        thread.stackClick = Boolean(opts && opts.stackClick);
        thread.updateMonitor = Boolean(opts && opts.updateMonitor);
        thread.blockContainer = thread.updateMonitor ?
            this.monitorBlocks :
            target.blocks;

        thread.pushStack(id);
        this.threads.push(thread);
        if (!thread.stackClick && !thread.updateMonitor) {
            this.threadMap.set(thread.getId(), thread);
        }

        // tw: compile new threads. Do not attempt to compile monitor threads.
        if (!(opts && opts.updateMonitor) && this.compilerOptions.enabled) {
            thread.tryCompile();
        }

        return thread;
    }

    /**
     * Stop a thread: stop running it immediately, and remove it from the thread list later.
     * @param {!Thread} thread Thread object to remove from actives
     */
    _stopThread (thread) {
        // Mark the thread for later removal
        thread.isKilled = true;
        // Inform sequencer to stop executing that thread.
        this.sequencer.retireThread(thread);
    }

    /**
     * Restart a thread in place, maintaining its position in the list of threads.
     * This is used by `startHats` to and is necessary to ensure 2.0-like execution order.
     * Test project: https://scratch.mit.edu/projects/130183108/
     * @param {!Thread} thread Thread object to restart.
     * @return {Thread} The restarted thread.
     */
    _restartThread (thread) {
        const newThread = new Thread(thread.topBlock);
        newThread.target = thread.target;
        newThread.stackClick = thread.stackClick;
        newThread.updateMonitor = thread.updateMonitor;
        newThread.blockContainer = thread.blockContainer;
        newThread.pushStack(thread.topBlock);
        // tw: when a thread is restarted, we have to check whether the previous script was attempted to be compiled.
        if (thread.triedToCompile && this.compilerOptions.enabled) {
            newThread.tryCompile();
        }
        if (!newThread.stackClick && !newThread.updateMonitor) {
            this.threadMap.set(newThread.getId(), newThread);
        }
        const i = this.threads.indexOf(thread);
        if (i > -1) {
            this.threads[i] = newThread;
            return newThread;
        }
        this.threads.push(thread);
        return thread;
    }

    emitCompileError (target, error) {
        this.emit(Runtime.COMPILE_ERROR, target, error);
    }

    /**
     * Return whether a thread is currently active/running.
     * @param {?Thread} thread Thread object to check.
     * @return {boolean} True if the thread is active/running.
     */
    isActiveThread (thread) {
        return (
            (
                thread.stack.length > 0 &&
                thread.status !== Thread.STATUS_DONE) &&
            this.threads.indexOf(thread) > -1);
    }

    /**
     * Return whether a thread is waiting for more information or done.
     * @param {?Thread} thread Thread object to check.
     * @return {boolean} True if the thread is waiting
     */
    isWaitingThread (thread) {
        return (
            thread.status === Thread.STATUS_PROMISE_WAIT ||
            thread.status === Thread.STATUS_YIELD_TICK ||
            !this.isActiveThread(thread)
        );
    }

    /**
     * Toggle a script.
     * @param {!string} topBlockId ID of block that starts the script.
     * @param {?object} opts optional arguments to toggle script
     * @param {?string} opts.target target ID for target to run script on. If not supplied, uses editing target.
     * @param {?boolean} opts.stackClick true if the user activated the stack by clicking, false if not. This
     *     determines whether we show a visual report when turning on the script.
     */
    toggleScript (topBlockId, opts) {
        opts = Object.assign({
            target: this._editingTarget,
            stackClick: false
        }, opts);
        // Remove any existing thread.
        for (let i = 0; i < this.threads.length; i++) {
            // Toggling a script that's already running turns it off
            if (this.threads[i].topBlock === topBlockId && this.threads[i].status !== Thread.STATUS_DONE) {
                const blockContainer = opts.target.blocks;
                const opcode = blockContainer.getOpcode(blockContainer.getBlock(topBlockId));

                if (this.getIsEdgeActivatedHat(opcode) && this.threads[i].stackClick !== opts.stackClick) {
                    // Allow edge activated hat thread stack click to coexist with
                    // edge activated hat thread that runs every frame
                    continue;
                }
                this._stopThread(this.threads[i]);
                return;
            }
        }
        // Otherwise add it.
        this._pushThread(topBlockId, opts.target, opts);
    }

    /**
     * Enqueue a script that when finished will update the monitor for the block.
     * @param {!string} topBlockId ID of block that starts the script.
     * @param {?Target} optTarget target Target to run script on. If not supplied, uses editing target.
     */
    addMonitorScript (topBlockId, optTarget) {
        if (!optTarget) optTarget = this._editingTarget;
        for (let i = 0; i < this.threads.length; i++) {
            // Don't re-add the script if it's already running
            if (this.threads[i].topBlock === topBlockId && this.threads[i].status !== Thread.STATUS_DONE &&
                    this.threads[i].updateMonitor) {
                return;
            }
        }
        // Otherwise add it.
        this._pushThread(topBlockId, optTarget, {updateMonitor: true});
    }

    /**
     * Run a function `f` for all scripts in a workspace.
     * `f` will be called with two parameters:
     *  - the top block ID of the script.
     *  - the target that owns the script.
     * @param {!Function} f Function to call for each script.
     * @param {Target=} optTarget Optionally, a target to restrict to.
     */
    allScriptsDo (f, optTarget) {
        let targets = this.executableTargets;
        if (optTarget) {
            targets = [optTarget];
        }
        for (let t = targets.length - 1; t >= 0; t--) {
            const target = targets[t];
            const scripts = target.blocks.getScripts();
            for (let j = 0; j < scripts.length; j++) {
                const topBlockId = scripts[j];
                f(topBlockId, target);
            }
        }
    }

    allScriptsByOpcodeDo (opcode, f, optTarget) {
        let targets = this.executableTargets;
        if (optTarget) {
            targets = [optTarget];
        }
        for (let t = targets.length - 1; t >= 0; t--) {
            const target = targets[t];
            const scripts = BlocksRuntimeCache.getScripts(target.blocks, opcode);
            for (let j = 0; j < scripts.length; j++) {
                f(scripts[j], target);
            }
        }
    }

    /**
     * Start all relevant hats.
     * @param {!string} requestedHatOpcode Opcode of hats to start.
     * @param {object=} optMatchFields Optionally, fields to match on the hat.
     * @param {Target=} optTarget Optionally, a target to restrict to.
     * @return {Array.<Thread>} List of threads started by this function.
     */
    startHats (requestedHatOpcode,
        optMatchFields, optTarget) {
        if (!Object.prototype.hasOwnProperty.call(this._hats, requestedHatOpcode)) {
            // No known hat with this opcode.
            return;
        }
        const instance = this;
        const newThreads = [];
        // Look up metadata for the relevant hat.
        const hatMeta = instance._hats[requestedHatOpcode];

        for (const opts in optMatchFields) {
            if (!Object.prototype.hasOwnProperty.call(optMatchFields, opts)) continue;
            optMatchFields[opts] = optMatchFields[opts].toUpperCase();
        }

        // tw: By assuming that all new threads will not interfere with eachother, we can optimize the loops
        // inside the allScriptsByOpcodeDo callback below.
        const startingThreadListLength = this.threads.length;

        // Consider all scripts, looking for hats with opcode `requestedHatOpcode`.
        this.allScriptsByOpcodeDo(requestedHatOpcode, (script, target) => {
            const {
                blockId: topBlockId,
                fieldsOfInputs: hatFields
            } = script;

            // Match any requested fields.
            // For example: ensures that broadcasts match.
            // This needs to happen before the block is evaluated
            // (i.e., before the predicate can be run) because "broadcast and wait"
            // needs to have a precise collection of started threads.
            for (const matchField in optMatchFields) {
                if (hatFields[matchField].value !== optMatchFields[matchField]) {
                    // Field mismatch.
                    return;
                }
            }

            if (hatMeta.restartExistingThreads) {
                // If `restartExistingThreads` is true, we should stop
                // any existing threads starting with the top block.
                const existingThread = this.threadMap.get(Thread.getIdFromTargetAndBlock(target, topBlockId));
                if (existingThread) {
                    newThreads.push(this._restartThread(existingThread));
                    return;
                }
            } else {
                // If `restartExistingThreads` is false, we should
                // give up if any threads with the top block are running.
                for (let j = 0; j < startingThreadListLength; j++) {
                    if (this.threads[j].target === target &&
                        this.threads[j].topBlock === topBlockId &&
                        // stack click threads and hat threads can coexist
                        !this.threads[j].stackClick &&
                        this.threads[j].status !== Thread.STATUS_DONE) {
                        // Some thread is already running.
                        return;
                    }
                }
            }
            // Start the thread with this top block.
            newThreads.push(this._pushThread(topBlockId, target));
        }, optTarget);
        // For compatibility with Scratch 2, edge triggered hats need to be processed before
        // threads are stepped. See ScratchRuntime.as for original implementation
        newThreads.forEach(thread => {
            if (thread.isCompiled) {
                if (thread.executableHat) {
                    // It is quite likely that we are currently executing a block, so make sure
                    // that we leave the compiler's state intact at the end.
                    compilerExecute.saveGlobalState();
                    compilerExecute(thread);
                    compilerExecute.restoreGlobalState();
                }
            } else {
                execute(this.sequencer, thread);
                thread.goToNextBlock();
            }
        });
        return newThreads;
    }


    /**
     * Dispose all targets. Return to clean state.
     */
    dispose () {
        this.stopAll();
        // Deleting each target's variable's monitors.
        this.targets.forEach(target => {
            if (target.isOriginal) target.deleteMonitors();
        });

        this.targets.map(this.disposeTarget, this);
        // tw: explicitly emit a MONITORS_UPDATE instead of relying on implicit behavior of _step()
        const emptyMonitorState = OrderedMap({});
        if (!emptyMonitorState.equals(this._monitorState)) {
            this._monitorState = emptyMonitorState;
            this.emit(Runtime.MONITORS_UPDATE, this._monitorState);
        }
        this.emit(Runtime.RUNTIME_DISPOSED);
        this.ioDevices.clock.resetProjectTimer();
        this.fontManager.clear();
        // @todo clear out extensions? turboMode? etc.

        // *********** Cloud *******************

        // If the runtime currently has cloud data,
        // emit a has cloud data update event resetting
        // it to false
        if (this.hasCloudData()) {
            this.emit(Runtime.HAS_CLOUD_DATA_UPDATE, false);
        }

        this.ioDevices.cloud.clear();

        // Reset runtime cloud data info
        const newCloudDataManager = cloudDataManager(this.cloudOptions);
        this.hasCloudData = newCloudDataManager.hasCloudVariables;
        this.canAddCloudVariable = newCloudDataManager.canAddCloudVariable;
        this.getNumberOfCloudVariables = newCloudDataManager.getNumberOfCloudVariables;
        this.addCloudVariable = this._initializeAddCloudVariable(newCloudDataManager);
        this.removeCloudVariable = this._initializeRemoveCloudVariable(newCloudDataManager);

        this.resetProgress();
    }

    /**
     * Add a target to the runtime. This tracks the sprite pane
     * ordering of the target. The target still needs to be put
     * into the correct execution order after calling this function.
     * @param {Target} target target to add
     */
    addTarget (target) {
        this.targets.push(target);
        this.executableTargets.push(target);
        if (target.isStage && !this._stageTarget) {
            this._stageTarget = target;
        }
    }

    /**
     * Move a target in the execution order by a relative amount.
     *
     * A positve number will make the target execute earlier. A negative number
     * will make the target execute later in the order.
     *
     * @param {Target} executableTarget target to move
     * @param {number} delta number of positions to move target by
     * @returns {number} new position in execution order
     */
    moveExecutable (executableTarget, delta) {
        const oldIndex = this.executableTargets.indexOf(executableTarget);
        this.executableTargets.splice(oldIndex, 1);
        let newIndex = oldIndex + delta;
        if (newIndex > this.executableTargets.length) {
            newIndex = this.executableTargets.length;
        }
        if (newIndex <= 0) {
            if (this.executableTargets.length > 0 && this.executableTargets[0].isStage) {
                newIndex = 1;
            } else {
                newIndex = 0;
            }
        }
        this.executableTargets.splice(newIndex, 0, executableTarget);
        return newIndex;
    }

    /**
     * Set a target to execute at a specific position in the execution order.
     *
     * Infinity will set the target to execute first. 0 will set the target to
     * execute last (before the stage).
     *
     * @param {Target} executableTarget target to move
     * @param {number} newIndex position in execution order to place the target
     * @returns {number} new position in the execution order
     */
    setExecutablePosition (executableTarget, newIndex) {
        const oldIndex = this.executableTargets.indexOf(executableTarget);
        return this.moveExecutable(executableTarget, newIndex - oldIndex);
    }

    /**
     * Remove a target from the execution set.
     * @param {Target} executableTarget target to remove
     */
    removeExecutable (executableTarget) {
        const oldIndex = this.executableTargets.indexOf(executableTarget);
        if (oldIndex > -1) {
            this.executableTargets.splice(oldIndex, 1);
        }
    }

    /**
     * Dispose of a target.
     * @param {!Target} disposingTarget Target to dispose of.
     */
    disposeTarget (disposingTarget) {
        this.targets = this.targets.filter(target => {
            if (disposingTarget !== target) return true;
            // Allow target to do dispose actions.
            target.dispose();
            // Remove from list of targets.
            return false;
        });
        if (this._stageTarget === disposingTarget) {
            this._stageTarget = null;
        }
    }

    /**
     * Stop any threads acting on the target.
     * @param {!Target} target Target to stop threads for.
     * @param {Thread=} optThreadException Optional thread to skip.
     */
    stopForTarget (target, optThreadException) {
        // Emit stop event to allow blocks to clean up any state.
        this.emit(Runtime.STOP_FOR_TARGET, target, optThreadException);

        // Stop any threads on the target.
        for (let i = 0; i < this.threads.length; i++) {
            if (this.threads[i] === optThreadException) {
                continue;
            }
            if (this.threads[i].target === target) {
                this._stopThread(this.threads[i]);
            }
        }
    }

    /**
     * Reset the Run ID. Call this any time the project logically starts, stops, or changes identity.
     */
    resetRunId () {
        if (!this.storage) {
            // see also: attachStorage
            return;
        }

        const newRunId = uuid.v1();
        this.storage.scratchFetch.setMetadata(this.storage.scratchFetch.RequestMetadata.RunId, newRunId);
    }

    /**
     * Start all threads that start with the green flag.
     */
    greenFlag () {
        this.stopAll();
        this.emit(Runtime.PROJECT_START);
        this.updateCurrentMSecs();
        this.ioDevices.clock.resetProjectTimer();
        this.targets.forEach(target => target.clearEdgeActivatedValues());
        // Inform all targets of the green flag.
        for (let i = 0; i < this.targets.length; i++) {
            this.targets[i].onGreenFlag();
        }
        this.startHats('event_whenflagclicked');
    }

    /**
     * Stop "everything."
     */
    stopAll () {
        // Emit stop event to allow blocks to clean up any state.
        this.emit(Runtime.PROJECT_STOP_ALL);

        // Dispose all clones.
        const newTargets = [];
        for (let i = 0; i < this.targets.length; i++) {
            this.targets[i].onStopAll();
            if (Object.prototype.hasOwnProperty.call(this.targets[i], 'isOriginal') &&
                !this.targets[i].isOriginal) {
                this.targets[i].dispose();
            } else {
                newTargets.push(this.targets[i]);
            }
        }
        this.targets = newTargets;
        // Dispose of the active thread.
        if (this.sequencer.activeThread !== null) {
            this._stopThread(this.sequencer.activeThread);
        }
        // Remove all remaining threads from executing in the next tick.
        this.threads = [];
        this.threadMap.clear();

        this.resetRunId();
    }

    _renderInterpolatedPositions () {
        const frameStarted = this._lastStepTime;
        const now = Date.now();
        const timeSinceStart = now - frameStarted;
        const progressInFrame = Math.min(1, Math.max(0, timeSinceStart / this.currentStepTime));

        interpolate.interpolate(this, progressInFrame);

        if (this.renderer) {
            this.renderer.draw();
        }
    }

    updateThreadMap () {
        this.threadMap.clear();
        for (const thread of this.threads) {
            if (!thread.stackClick && !thread.updateMonitor) {
                this.threadMap.set(thread.getId(), thread);
            }
        }
    }

    /**
     * Repeatedly run `sequencer.stepThreads` and filter out
     * inactive threads after each iteration.
     */
    _step () {
        if (this.interpolationEnabled) {
            interpolate.setupInitialState(this);
        }

        if (this.profiler !== null) {
            if (stepProfilerId === -1) {
                stepProfilerId = this.profiler.idByName('Runtime._step');
            }
            this.profiler.start(stepProfilerId);
        }

        // Clean up threads that were told to stop during or since the last step
        this.threads = this.threads.filter(thread => !thread.isKilled);
        this.updateThreadMap();

        // Find all edge-activated hats, and add them to threads to be evaluated.
        for (const hatType in this._hats) {
            if (!Object.prototype.hasOwnProperty.call(this._hats, hatType)) continue;
            const hat = this._hats[hatType];
            if (hat.edgeActivated) {
                this.startHats(hatType);
            }
        }
        this.redrawRequested = false;
        this._pushMonitors();
        if (this.profiler !== null) {
            if (stepThreadsProfilerId === -1) {
                stepThreadsProfilerId = this.profiler.idByName('Sequencer.stepThreads');
            }
            this.profiler.start(stepThreadsProfilerId);
        }
        this.emit(Runtime.BEFORE_EXECUTE);
        const doneThreads = this.sequencer.stepThreads();
        if (this.profiler !== null) {
            this.profiler.stop();
        }
        this.emit(Runtime.AFTER_EXECUTE);
        this._updateGlows(doneThreads);
        // Add done threads so that even if a thread finishes within 1 frame, the green
        // flag will still indicate that a script ran.
        this._emitProjectRunStatus(
            this.threads.length + doneThreads.length -
                this._getMonitorThreadCount([...this.threads, ...doneThreads]));
        // Store threads that completed this iteration for testing and other
        // internal purposes.
        this._lastStepDoneThreads = doneThreads;
        if (this.renderer) {
            // @todo: Only render when this.redrawRequested or clones rendered.
            if (this.profiler !== null) {
                if (rendererDrawProfilerId === -1) {
                    rendererDrawProfilerId = this.profiler.idByName('RenderWebGL.draw');
                }
                this.profiler.start(rendererDrawProfilerId);
            }
            // tw: do not draw if document is hidden or a rAF loop is running
            // Checking for the animation frame loop is more reliable than using
            // interpolationEnabled in some edge cases
            if (!document.hidden && !this.frameLoop._interpolationAnimation) {
                this.renderer.draw();
            }
            if (this.profiler !== null) {
                this.profiler.stop();
            }
        }

        if (this._refreshTargets) {
            this.emit(Runtime.TARGETS_UPDATE, false /* Don't emit project changed */);
            this._refreshTargets = false;
        }

        if (!this._prevMonitorState.equals(this._monitorState)) {
            this.emit(Runtime.MONITORS_UPDATE, this._monitorState);
            this._prevMonitorState = this._monitorState;
        }

        if (this.profiler !== null) {
            this.profiler.stop();
            this.profiler.reportFrames();
        }

        if (this.interpolationEnabled) {
            this._lastStepTime = Date.now();
        }
    }

    /**
     * Get the number of threads in the given array that are monitor threads (threads
     * that update monitor values, and don't count as running a script).
     * @param {!Array.<Thread>} threads The set of threads to look through.
     * @return {number} The number of monitor threads in threads.
     */
    _getMonitorThreadCount (threads) {
        let count = 0;
        threads.forEach(thread => {
            if (thread.updateMonitor) count++;
        });
        return count;
    }

    /**
     * Queue monitor blocks to sequencer to be run.
     */
    _pushMonitors () {
        this.monitorBlocks.runAllMonitored(this);
    }

    /**
     * Set the current editing target known by the runtime.
     * @param {!Target} editingTarget New editing target.
     */
    setEditingTarget (editingTarget) {
        const oldEditingTarget = this._editingTarget;
        this._editingTarget = editingTarget;
        // Script glows must be cleared.
        this._scriptGlowsPreviousFrame = [];
        this._updateGlows();

        if (oldEditingTarget !== this._editingTarget) {
            this.requestToolboxExtensionsUpdate();
        }
    }

    /**
     * Set whether we are in 30 TPS compatibility mode.
     * @param {boolean} compatibilityModeOn True iff in compatibility mode.
     */
    setCompatibilityMode (compatibilityModeOn) {
        // tw: "compatibility mode" is replaced with a generic framerate setter,
        // but this method is kept for compatibility
        if (compatibilityModeOn) {
            this.setFramerate(30);
        } else {
            this.setFramerate(60);
        }
    }

    /**
     * tw: Change runtime target frames per second
     * @param {number} framerate Target frames per second
     */
    setFramerate (framerate) {
        // Setting framerate to anything greater than this is unnecessary and can break the sequencer
        // Additionally, the JS spec says intervals can't run more than once every 4ms (250/s) anyways
        if (framerate > 250) framerate = 250;
        // Convert negative framerates to 1FPS
        // Note that 0 is a special value which means "matching device screen refresh rate"
        if (framerate < 0) framerate = 1;
        this.frameLoop.setFramerate(framerate);
        this.emit(Runtime.FRAMERATE_CHANGED, framerate);
    }

    /**
     * tw: Enable or disable interpolation.
     * @param {boolean} interpolationEnabled True if interpolation should be enabled.
     */
    setInterpolation (interpolationEnabled) {
        this.interpolationEnabled = interpolationEnabled;
        this.frameLoop.setInterpolation(this.interpolationEnabled);
        this.emit(Runtime.INTERPOLATION_CHANGED, interpolationEnabled);
    }

    /**
     * tw: Update runtime options
     * @param {*} runtimeOptions New options
     */
    setRuntimeOptions (runtimeOptions) {
        this.runtimeOptions = Object.assign({}, this.runtimeOptions, runtimeOptions);
        this.emit(Runtime.RUNTIME_OPTIONS_CHANGED, this.runtimeOptions);
        if (this.renderer) {
            this.renderer.offscreenTouching = !this.runtimeOptions.fencing;
        }
    }

    /**
     * tw: Update compiler options
     * @param {*} compilerOptions New options
     */
    setCompilerOptions (compilerOptions) {
        this.compilerOptions = Object.assign({}, this.compilerOptions, compilerOptions);
        this.resetAllCaches();
        this.emit(Runtime.COMPILER_OPTIONS_CHANGED, this.compilerOptions);
    }

    /**
     * Change width and height of stage. This will also inform the renderer of the new stage size.
     * @param {number} width New stage width
     * @param {number} height New stage height
     */
    setStageSize (width, height) {
        width = Math.round(Math.max(1, width));
        height = Math.round(Math.max(1, height));
        if (this.stageWidth !== width || this.stageHeight !== height) {
            const deltaX = width - this.stageWidth;
            const deltaY = height - this.stageHeight;
            // Preserve monitor location relative to the center of the stage
            if (this._monitorState.size > 0) {
                const offsetX = deltaX / 2;
                const offsetY = deltaY / 2;
                for (const monitor of this._monitorState.valueSeq()) {
                    const newMonitor = monitor
                        .set('x', monitor.get('x') + offsetX)
                        .set('y', monitor.get('y') + offsetY);
                    this.requestUpdateMonitor(newMonitor);
                }
                this.emit(Runtime.MONITORS_UPDATE, this._monitorState);
            }

            this.stageWidth = width;
            this.stageHeight = height;
            if (this.renderer) {
                this.renderer.setStageSize(
                    -width / 2,
                    width / 2,
                    -height / 2,
                    height / 2
                );
            }
        }
        this.emit(Runtime.STAGE_SIZE_CHANGED, width, height);
    }

    // eslint-disable-next-line no-unused-vars
    setInEditor (inEditor) {
        // no-op
    }

    /**
     * TW: Enable "packaged runtime" mode. This is a one-way operation.
     */
    convertToPackagedRuntime () {
        if (this.storage) {
            throw new Error('convertToPackagedRuntime must be called before attachStorage');
        }

        this.isPackaged = true;
    }

    /**
     * tw: Reset the cache of all block containers.
     */
    resetAllCaches () {
        for (const target of this.targets) {
            if (target.isOriginal) {
                target.blocks.resetCache();
            }
        }
        this.flyoutBlocks.resetCache();
        this.monitorBlocks.resetCache();
    }

    /**
     * Add an "addon block"
     * @param {object} options Options object
     * @param {string} options.procedureCode The ID of the block
     * @param {function} options.callback The callback, called with (args, BlockUtility). May return a promise.
     * @param {string[]} [options.arguments] Names of the arguments accepted. Optional if no arguments.
     * @param {boolean} [options.hidden] True to not include this block in the block palette
     * @param {1|2} [options.return] 1 for round reporter, 2 for boolean reported, leave empty for statement.
     */
    addAddonBlock (options) {
        const procedureCode = options.procedureCode;

        const argumentNames = options.arguments || [];
        const names = argumentNames;
        const ids = argumentNames.map((_, i) => `arg${i}`);
        const defaults = argumentNames.map(() => '');
        this.addonBlocks[procedureCode] = {
            namesIdsDefaults: [names, ids, defaults],
            ...options
        };

        if (!options.hidden) {
            const ID = 'a-b';
            let blockInfo = this._blockInfo.find(i => i.id === ID);
            if (!blockInfo) {
                // eslint-disable-next-line max-len
                const ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><path d="M14.92 1.053A13.835 13.835 0 0 0 1.052 14.919v18.162a13.835 13.835 0 0 0 13.866 13.866h18.162a13.835 13.835 0 0 0 13.866-13.866V14.919A13.835 13.835 0 0 0 33.081 1.053zm16.6 12.746L41.72 24 31.52 34.201l-3.276-3.275L35.17 24l-6.926-6.926Zm-15.116.073 3.278 3.278L12.83 24l6.926 6.926L16.48 34.2 6.28 24Z" style="fill:#29beb8;fill-opacity:1;stroke:none;stroke-width:1.51371;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"/></svg>';
                blockInfo = {
                    id: ID,
                    name: maybeFormatMessage({
                        id: 'tw.blocks.addons',
                        default: 'Addons',
                        description: 'Name of the addon block category in the extension list'
                    }),
                    color1: '#29beb8',
                    color2: '#3aa8a4',
                    color3: '#3aa8a4',
                    menuIconURI: `data:image/svg+xml;,${encodeURIComponent(ICON)}`,
                    blocks: [],
                    customFieldTypes: {},
                    menus: []
                };
                this._blockInfo.unshift(blockInfo);
            }
            blockInfo.blocks.push({
                info: {},
                xml:
                   '<block type="procedures_call" gap="16"><mutation generateshadows="true" warp="false"' +
                    ` proccode="${xmlEscape(procedureCode)}"` +
                    ` argumentnames="${xmlEscape(JSON.stringify(names))}"` +
                    ` argumentids="${xmlEscape(JSON.stringify(ids))}"` +
                    ` argumentdefaults="${xmlEscape(JSON.stringify(defaults))}"` +
                    `${options.return ? ` return="${xmlEscape(options.return.toString())}"` : ''}` +
                    '></mutation></block>'
            });
        }

        this.resetAllCaches();
    }

    getAddonBlock (procedureCode) {
        if (Object.prototype.hasOwnProperty.call(this.addonBlocks, procedureCode)) {
            return this.addonBlocks[procedureCode];
        }
        return null;
    }

    findProjectOptionsComment () {
        const target = this.getTargetForStage();
        const comments = target.comments;
        for (const comment of Object.values(comments)) {
            if (comment.text.includes(COMMENT_CONFIG_MAGIC)) {
                return comment;
            }
        }
        return null;
    }

    parseProjectOptions () {
        const comment = this.findProjectOptionsComment();
        if (!comment) return;
        const lineWithMagic = comment.text.split('\n').find(i => i.endsWith(COMMENT_CONFIG_MAGIC));
        if (!lineWithMagic) {
            log.warn('Config comment does not contain valid line');
            return;
        }

        const jsonText = lineWithMagic.substr(0, lineWithMagic.length - COMMENT_CONFIG_MAGIC.length);
        let parsed;
        try {
            parsed = ExtendedJSON.parse(jsonText);
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid object');
            }
        } catch (e) {
            log.warn('Config comment has invalid JSON', e);
            return;
        }

        if (typeof parsed.framerate === 'number') {
            this.setFramerate(parsed.framerate);
        }
        if (parsed.turbo) {
            this.turboMode = true;
            this.emit(Runtime.TURBO_MODE_ON);
        }
        if (parsed.interpolation) {
            this.setInterpolation(true);
        }
        if (parsed.runtimeOptions) {
            this.setRuntimeOptions(parsed.runtimeOptions);
        }
        if (parsed.hq && this.renderer) {
            this.renderer.setUseHighQualityRender(true);
        }
        const storedWidth = +parsed.width || this.stageWidth;
        const storedHeight = +parsed.height || this.stageHeight;
        if (storedWidth !== this.stageWidth || storedHeight !== this.stageHeight) {
            this.setStageSize(storedWidth, storedHeight);
        }
    }

    _generateAllProjectOptions () {
        return {
            framerate: this.frameLoop.framerate,
            runtimeOptions: this.runtimeOptions,
            interpolation: this.interpolationEnabled,
            turbo: this.turboMode,
            hq: this.renderer ? this.renderer.useHighQualityRender : false,
            width: this.stageWidth,
            height: this.stageHeight
        };
    }

    generateDifferingProjectOptions () {
        const difference = (oldObject, newObject) => {
            const result = {};
            for (const key of Object.keys(newObject)) {
                const newValue = newObject[key];
                const oldValue = oldObject[key];
                if (typeof newValue === 'object' && newValue) {
                    const valueDiffering = difference(oldValue, newValue);
                    if (Object.keys(valueDiffering).length > 0) {
                        result[key] = valueDiffering;
                    }
                } else if (newValue !== oldValue) {
                    result[key] = newValue;
                }
            }
            return result;
        };
        return difference(this._defaultStoredSettings, this._generateAllProjectOptions());
    }

    storeProjectOptions () {
        const options = this.generateDifferingProjectOptions();
        // TODO: translate
        const text = `Configuration for https://turbowarp.org/\nYou can move, resize, and minimize this comment, but don't edit it by hand. This comment can be deleted to remove the stored settings.\n${ExtendedJSON.stringify(options)}${COMMENT_CONFIG_MAGIC}`;
        const existingComment = this.findProjectOptionsComment();
        if (existingComment) {
            existingComment.text = text;
        } else {
            const target = this.getTargetForStage();
            // TODO: smarter position logic
            target.createComment(uid(), null, text, 50, 50, 350, 170, false);
        }
        this.emitProjectChanged();
    }

    /**
     * Eagerly (re)compile all scripts within this project.
     */
    precompile () {
        this.allScriptsDo((topBlockId, target) => {
            const topBlock = target.blocks.getBlock(topBlockId);
            if (this.getIsHat(topBlock.opcode)) {
                const thread = new Thread(topBlockId);
                thread.target = target;
                thread.blockContainer = target.blocks;
                thread.tryCompile();
            }
        });
    }

    enableDebug () {
        this.resetAllCaches();
        this.debug = true;
    }

    /**
     * Emit glows/glow clears for scripts after a single tick.
     * Looks at `this.threads` and notices which have turned on/off new glows.
     * @param {Array.<Thread>=} optExtraThreads Optional list of inactive threads.
     */
    _updateGlows (optExtraThreads) {
        const searchThreads = [];
        searchThreads.push(...this.threads);
        if (optExtraThreads) {
            searchThreads.push(...optExtraThreads);
        }
        // Set of scripts that request a glow this frame.
        const requestedGlowsThisFrame = [];
        // Final set of scripts glowing during this frame.
        const finalScriptGlows = [];
        // Find all scripts that should be glowing.
        for (let i = 0; i < searchThreads.length; i++) {
            const thread = searchThreads[i];
            const target = thread.target;
            if (target === this._editingTarget) {
                const blockForThread = thread.blockGlowInFrame;
                if (thread.requestScriptGlowInFrame || thread.stackClick) {
                    let script = target.blocks.getTopLevelScript(blockForThread);
                    if (!script) {
                        // Attempt to find in flyout blocks.
                        script = this.flyoutBlocks.getTopLevelScript(
                            blockForThread
                        );
                    }
                    if (script) {
                        requestedGlowsThisFrame.push(script);
                    }
                }
            }
        }
        // Compare to previous frame.
        for (let j = 0; j < this._scriptGlowsPreviousFrame.length; j++) {
            const previousFrameGlow = this._scriptGlowsPreviousFrame[j];
            if (requestedGlowsThisFrame.indexOf(previousFrameGlow) < 0) {
                // Glow turned off.
                this.glowScript(previousFrameGlow, false);
            } else {
                // Still glowing.
                finalScriptGlows.push(previousFrameGlow);
            }
        }
        for (let k = 0; k < requestedGlowsThisFrame.length; k++) {
            const currentFrameGlow = requestedGlowsThisFrame[k];
            if (this._scriptGlowsPreviousFrame.indexOf(currentFrameGlow) < 0) {
                // Glow turned on.
                this.glowScript(currentFrameGlow, true);
                finalScriptGlows.push(currentFrameGlow);
            }
        }
        this._scriptGlowsPreviousFrame = finalScriptGlows;
    }

    /**
     * Emit run start/stop after each tick. Emits when `this.threads.length` goes
     * between non-zero and zero
     *
     * @param {number} nonMonitorThreadCount The new nonMonitorThreadCount
     */
    _emitProjectRunStatus (nonMonitorThreadCount) {
        if (this._nonMonitorThreadCount === 0 && nonMonitorThreadCount > 0) {
            this.emit(Runtime.PROJECT_RUN_START);
        }
        if (this._nonMonitorThreadCount > 0 && nonMonitorThreadCount === 0) {
            this.emit(Runtime.PROJECT_RUN_STOP);
        }
        this._nonMonitorThreadCount = nonMonitorThreadCount;
    }

    /**
     * "Quiet" a script's glow: stop the VM from generating glow/unglow events
     * about that script. Use when a script has just been deleted, but we may
     * still be tracking glow data about it.
     * @param {!string} scriptBlockId Id of top-level block in script to quiet.
     */
    quietGlow (scriptBlockId) {
        const index = this._scriptGlowsPreviousFrame.indexOf(scriptBlockId);
        if (index > -1) {
            this._scriptGlowsPreviousFrame.splice(index, 1);
        }
    }

    /**
     * Emit feedback for block glowing (used in the sequencer).
     * @param {?string} blockId ID for the block to update glow
     * @param {boolean} isGlowing True to turn on glow; false to turn off.
     */
    glowBlock (blockId, isGlowing) {
        if (isGlowing) {
            this.emit(Runtime.BLOCK_GLOW_ON, {id: blockId});
        } else {
            this.emit(Runtime.BLOCK_GLOW_OFF, {id: blockId});
        }
    }

    /**
     * Emit feedback for script glowing.
     * @param {?string} topBlockId ID for the top block to update glow
     * @param {boolean} isGlowing True to turn on glow; false to turn off.
     */
    glowScript (topBlockId, isGlowing) {
        if (isGlowing) {
            this.emit(Runtime.SCRIPT_GLOW_ON, {id: topBlockId});
        } else {
            this.emit(Runtime.SCRIPT_GLOW_OFF, {id: topBlockId});
        }
    }

    /**
     * Emit whether blocks are being dragged over gui
     * @param {boolean} areBlocksOverGui True if blocks are dragged out of blocks workspace, false otherwise
     */
    emitBlockDragUpdate (areBlocksOverGui) {
        this.emit(Runtime.BLOCK_DRAG_UPDATE, areBlocksOverGui);
    }

    /**
     * Emit event to indicate that the block drag has ended with the blocks outside the blocks workspace
     * @param {Array.<object>} blocks The set of blocks dragged to the GUI
     * @param {string} topBlockId The original id of the top block being dragged
     */
    emitBlockEndDrag (blocks, topBlockId) {
        this.emit(Runtime.BLOCK_DRAG_END, blocks, topBlockId);
    }

    /**
     * Emit value for reporter to show in the blocks.
     * @param {string} blockId ID for the block.
     * @param {string} value Value to show associated with the block.
     */
    visualReport (blockId, value) {
        this.emit(Runtime.VISUAL_REPORT, {id: blockId, value: String(value)});
    }

    /**
     * Add a monitor to the state. If the monitor already exists in the state,
     * updates those properties that are defined in the given monitor record.
     * @param {!MonitorRecord} monitor Monitor to add.
     */
    requestAddMonitor (monitor) {
        const id = monitor.get('id');
        if (!this.requestUpdateMonitor(monitor)) { // update monitor if it exists in the state
            // if the monitor did not exist in the state, add it
            this._monitorState = this._monitorState.set(id, monitor);
        }
    }

    /**
     * Update a monitor in the state and report success/failure of update.
     * @param {!Map} monitor Monitor values to update. Values on the monitor with overwrite
     *     values on the old monitor with the same ID. If a value isn't defined on the new monitor,
     *     the old monitor will keep its old value.
     * @return {boolean} true if monitor exists in the state and was updated, false if it did not exist.
     */
    requestUpdateMonitor (monitor) {
        const id = monitor.get('id');
        if (this._monitorState.has(id)) {
            this._monitorState =
                // Use mergeWith here to prevent undefined values from overwriting existing ones
                this._monitorState.set(id, this._monitorState.get(id).mergeWith((prev, next) => {
                    if (typeof next === 'undefined' || next === null) {
                        return prev;
                    }
                    return next;
                }, monitor));
            return true;
        }
        return false;
    }

    /**
     * Removes a monitor from the state. Does nothing if the monitor already does
     * not exist in the state.
     * @param {!string} monitorId ID of the monitor to remove.
     */
    requestRemoveMonitor (monitorId) {
        this._monitorState = this._monitorState.delete(monitorId);
    }

    /**
     * Hides a monitor and returns success/failure of action.
     * @param {!string} monitorId ID of the monitor to hide.
     * @return {boolean} true if monitor exists and was updated, false otherwise
     */
    requestHideMonitor (monitorId) {
        return this.requestUpdateMonitor(new Map([
            ['id', monitorId],
            ['visible', false]
        ]));
    }

    /**
     * Shows a monitor and returns success/failure of action.
     * not exist in the state.
     * @param {!string} monitorId ID of the monitor to show.
     * @return {boolean} true if monitor exists and was updated, false otherwise
     */
    requestShowMonitor (monitorId) {
        return this.requestUpdateMonitor(new Map([
            ['id', monitorId],
            ['visible', true]
        ]));
    }

    /**
     * Removes all monitors with the given target ID from the state. Does nothing if
     * the monitor already does not exist in the state.
     * @param {!string} targetId Remove all monitors with given target ID.
     */
    requestRemoveMonitorByTargetId (targetId) {
        this._monitorState = this._monitorState.filterNot(value => value.targetId === targetId);
    }

    /**
     * Get a target by its id.
     * @param {string} targetId Id of target to find.
     * @return {?Target} The target, if found.
     */
    getTargetById (targetId) {
        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            if (target.id === targetId) {
                return target;
            }
        }
    }

    /**
     * Get the first original (non-clone-block-created) sprite given a name.
     * @param {string} spriteName Name of sprite to look for.
     * @return {?Target} Target representing a sprite of the given name.
     */
    getSpriteTargetByName (spriteName) {
        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            if (target.isStage) {
                continue;
            }
            if (target.sprite && target.sprite.name === spriteName) {
                return target;
            }
        }
    }

    /**
     * Get a target by its drawable id.
     * @param {number} drawableID drawable id of target to find
     * @return {?Target} The target, if found
     */
    getTargetByDrawableId (drawableID) {
        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            if (target.drawableID === drawableID) return target;
        }
    }

    /**
     * Update the clone counter to track how many clones are created.
     * @param {number} changeAmount How many clones have been created/destroyed.
     */
    changeCloneCounter (changeAmount) {
        this._cloneCounter += changeAmount;
    }

    /**
     * Return whether there are clones available.
     * @return {boolean} True until the number of clones hits runtimeOptions.maxClones
     */
    clonesAvailable () {
        return this._cloneCounter < this.runtimeOptions.maxClones;
    }

    /**
     * Handle that the project has loaded in the Virtual Machine.
     */
    handleProjectLoaded () {
        this.emit(Runtime.PROJECT_LOADED);
        this.resetRunId();
    }

    /**
     * Report that the project has changed in a way that would affect serialization
     */
    emitProjectChanged () {
        this.emit(Runtime.PROJECT_CHANGED);
    }

    /**
     * Report that a new target has been created, possibly by cloning an existing target.
     * @param {Target} newTarget - the newly created target.
     * @param {Target} [sourceTarget] - the target used as a source for the new clone, if any.
     * @fires Runtime#targetWasCreated
     */
    fireTargetWasCreated (newTarget, sourceTarget) {
        this.emit('targetWasCreated', newTarget, sourceTarget);
    }

    /**
     * Report that a clone target is being removed.
     * @param {Target} target - the target being removed
     * @fires Runtime#targetWasRemoved
     */
    fireTargetWasRemoved (target) {
        this.emit('targetWasRemoved', target);
    }

    /**
     * Get a target representing the Scratch stage, if one exists.
     * @return {?Target} The target, if found.
     */
    getTargetForStage () {
        if (this._stageTarget) {
            return this._stageTarget;
        }
        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            if (target.isStage) {
                this._stageTarget = target;
                return target;
            }
        }
    }

    /**
     * Get the editing target.
     * @return {?Target} The editing target.
     */
    getEditingTarget () {
        return this._editingTarget;
    }

    getAllVarNamesOfType (varType) {
        let varNames = [];
        for (const target of this.targets) {
            const targetVarNames = target.getAllVariableNamesInScopeByType(varType, true);
            varNames = varNames.concat(targetVarNames);
        }
        return varNames;
    }

    /**
     * Get the label or label function for an opcode
     * @param {string} extendedOpcode - the opcode you want a label for
     * @return {object} - object with label and category
     * @property {string} category - the category for this opcode
     * @property {Function} [labelFn] - function to generate the label for this opcode
     * @property {string} [label] - the label for this opcode if `labelFn` is absent
     */
    getLabelForOpcode (extendedOpcode) {
        const [category, opcode] = StringUtil.splitFirst(extendedOpcode, '_');
        if (!(category && opcode)) return;

        const categoryInfo = this._blockInfo.find(ci => ci.id === category);
        if (!categoryInfo) return;

        const block = categoryInfo.blocks.find(b => b.info.opcode === opcode);
        if (!block) return;

        // TODO: we may want to format the label in a locale-specific way.
        return {
            category: 'extension', // This assumes that all extensions have the same monitor color.
            label: `${categoryInfo.name}: ${block.info.text}`
        };
    }

    /**
     * Create a new global variable avoiding conflicts with other variable names.
     * @param {string} variableName The desired variable name for the new global variable.
     * This can be turned into a fresh name as necessary.
     * @param {string} optVarId An optional ID to use for the variable. A new one will be generated
     * if a falsey value for this parameter is provided.
     * @param {string} optVarType The type of the variable to create. Defaults to Variable.SCALAR_TYPE.
     * @return {Variable} The new variable that was created.
     */
    createNewGlobalVariable (variableName, optVarId, optVarType) {
        const varType = (typeof optVarType === 'string') ? optVarType : Variable.SCALAR_TYPE;
        const allVariableNames = this.getAllVarNamesOfType(varType);
        const newName = StringUtil.unusedName(variableName, allVariableNames);
        const variable = new Variable(optVarId || uid(), newName, varType);
        const stage = this.getTargetForStage();
        stage.variables[variable.id] = variable;
        return variable;
    }

    /**
     * Tell the runtime to request a redraw.
     * Use after a clone/sprite has completed some visible operation on the stage.
     */
    requestRedraw () {
        this.redrawRequested = true;
    }

    /**
     * Emit a targets update at the end of the step if the provided target is
     * the original sprite
     * @param {!Target} target Target requesting the targets update
     */
    requestTargetsUpdate (target) {
        if (!target.isOriginal) return;
        this._refreshTargets = true;
    }

    /**
     * Emit an event that indicates that the blocks on the workspace need updating.
     */
    requestBlocksUpdate () {
        this.emit(Runtime.BLOCKS_NEED_UPDATE);
    }

    /**
     * Emit an event that indicates that the toolbox extension blocks need updating.
     */
    requestToolboxExtensionsUpdate () {
        this.emit(Runtime.TOOLBOX_EXTENSIONS_NEED_UPDATE);
    }

    /**
     * Set up timers to repeatedly step in a browser.
     */
    start () {
        // Do not start if we are already running
        if (this.frameLoop.running) return;
        this.frameLoop.start();
        this.emit(Runtime.RUNTIME_STARTED);
    }

    /**
     * @deprecated Used by old versions of TurboWarp. Superceded by upstream's quit()
     */
    stop () {
        this.quit();
    }

    /**
     * Quit the Runtime, clearing any handles which might keep the process alive.
     * Do not use the runtime after calling this method. This method is meant for test shutdown.
     */
    quit () {
        if (!this.frameLoop.running) {
            return;
        }
        this.frameLoop.stop();
        this.emit(Runtime.RUNTIME_STOPPED);
    }

    /**
     * Turn on profiling.
     * @param {Profiler/FrameCallback} onFrame A callback handle passed a
     * profiling frame when the profiler reports its collected data.
     */
    enableProfiling (onFrame) {
        if (Profiler.available()) {
            this.profiler = new Profiler(onFrame);
        }
    }

    /**
     * Turn off profiling.
     */
    disableProfiling () {
        this.profiler = null;
    }

    /**
     * Update a millisecond timestamp value that is saved on the Runtime.
     * This value is helpful in certain instances for compatibility with Scratch 2,
     * which sometimes uses a `currentMSecs` timestamp value in Interpreter.as
     */
    updateCurrentMSecs () {
        this.currentMSecs = Date.now();
    }

    updatePrivacy () {
        const enforceRestrictions = (
            this.enforcePrivacy &&
            Object.values(this.externalCommunicationMethods).some(i => i)
        );
        if (this.renderer && this.renderer.setPrivateSkinAccess) {
            this.renderer.setPrivateSkinAccess(!enforceRestrictions);
        }
    }

    /**
     * @param {boolean} enabled True if restrictions should be enforced to protect user privacy.
     */
    setEnforcePrivacy (enabled) {
        this.enforcePrivacy = enabled;
        this.updatePrivacy();
    }

    /**
     * @param {string} method Name of the method in Runtime.externalCommunicationMethods
     * @param {boolean} enabled True if the feature is enabled.
     */
    setExternalCommunicationMethod (method, enabled) {
        if (!Object.prototype.hasOwnProperty.call(this.externalCommunicationMethods, method)) {
            throw new Error(`Unknown method: ${method}`);
        }
        this.externalCommunicationMethods[method] = enabled;
        this.updatePrivacy();
    }

    emitAssetProgress () {
        this.emit(Runtime.ASSET_PROGRESS, this.finishedAssetRequests, this.totalAssetRequests);
    }

    resetProgress () {
        this.finishedAssetRequests = 0;
        this.totalAssetRequests = 0;
        this.emitAssetProgress();
    }

    /**
     * Wrap an asset loading promise with progress support.
     * @template T
     * @param {Promise<T>} promise
     * @returns {Promise<T>}
     */
    wrapAssetRequest (promise) {
        this.totalAssetRequests++;
        this.emitAssetProgress();

        return promise
            .then(result => {
                this.finishedAssetRequests++;
                this.emitAssetProgress();
                return result;
            })
            .catch(error => {
                this.finishedAssetRequests++;
                this.emitAssetProgress();
                throw error;
            });
    }
}

/**
 * Event fired after a new target has been created, possibly by cloning an existing target.
 *
 * @event Runtime#targetWasCreated
 * @param {Target} newTarget - the newly created target.
 * @param {Target} [sourceTarget] - the target used as a source for the new clone, if any.
 */

module.exports = Runtime;
