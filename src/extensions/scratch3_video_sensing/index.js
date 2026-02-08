const Runtime = require('../../engine/runtime');

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Clone = require('../../util/clone');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const Video = require('../../io/video');

const VideoMotion = require('./library');

/**
 * Icon svg to be displayed in the blocks category menu, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const menuIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIj48dGl0bGU+RXh0ZW5zaW9ucy9Tb2Z0d2FyZS9WaWRlby1TZW5zaW5nLU1lbnU8L3RpdGxlPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCA1KSI+PGNpcmNsZSBjeD0iMTYiIGN5PSI4IiByPSIyIiBmaWxsPSIjMGViZDhjIiBvcGFjaXR5PSIuMjUiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjYiIHI9IjIiIGZpbGw9IiMwZWJkOGMiIG9wYWNpdHk9Ii41Ii8+PGNpcmNsZSBjeD0iMTYiIGN5PSI0IiByPSIyIiBmaWxsPSIjMGViZDhjIiBvcGFjaXR5PSIuNzUiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjIiIHI9IjIiIGZpbGw9IiMwZWJkOGMiLz48cGF0aCBmaWxsPSIjNGQ0ZDRkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1vcGFjaXR5PSIuMTUiIHN0cm9rZS13aWR0aD0iLjUiIGQ9Im0xMS4zMzYgMi4yMS0zLjA4NiAyVjMuMDVjMC0xLjAwNS0uNzgxLTEuOC0xLjc1LTEuOEgyLjA1Yy0xLjAxMiAwLTEuOC43ODgtMS44IDEuOFY3YzAgLjk2NC43OTIgMS43NTYgMS44IDEuOEg2LjVjLjk1IDAgMS43NS0uODI3IDEuNzUtMS44VjUuODU4bC4zNzkuMjI4IDIuNzk4IDEuNjg3Yy4wMS4wMS4wNDkuMDI3LjA3My4wMjdhLjI1LjI1IDAgMCAwIC4yNS0uMjVWMi40YzAgLjAxOC0uMDI4LS4wNDctLjA2NC0uMTIxLS4wNzMtLjEyMS0uMjE1LS4xNS0uMzUtLjA3WiIvPjwvZz48L3N2Zz4=';

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+RXh0ZW5zaW9ucy9Tb2Z0d2FyZS9WaWRlby1TZW5zaW5nLUJsb2NrPC90aXRsZT48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9Ii4xNSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAxMCkiPjxjaXJjbGUgY3g9IjMyIiBjeT0iMTYiIHI9IjQuNSIgZmlsbD0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMjUiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjEyIiByPSI0LjUiIGZpbGw9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgb3BhY2l0eT0iLjUiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjgiIHI9IjQuNSIgZmlsbD0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuNzUiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjQiIHI9IjQuNSIgZmlsbD0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZmlsbD0iIzRkNGQ0ZCIgZD0ibTIyLjY3MiA0LjQyLTYuMTcyIDRWNi4xYzAtMi4wMS0xLjU2My0zLjYtMy41LTMuNkg0LjFDMi4wNzYgMi41LjUgNC4wNzYuNSA2LjFWMTRjMCAxLjkyNyAxLjU4NCAzLjUxMiAzLjYgMy42SDEzYzEuOTAyIDAgMy41LTEuNjUzIDMuNS0zLjZ2LTIuMjgzbDYuMjU3IDMuNzU0LjA5Ny4wNzVjLjAyLjAyLjA5OC4wNTQuMTQ2LjA1NC4yNjcgMCAuNS0uMjE3LjUtLjVWNC44YzAgLjAzNy0uMDU2LS4wOTQtLjEyOS0uMjQzLS4xNDUtLjI0Mi0uNDMtLjI5OS0uNy0uMTM3WiIvPjwvZz48L3N2Zz4=';

/**
 * Sensor attribute video sensor block should report.
 * @readonly
 * @enum {string}
 */
const SensingAttribute = {
    /** The amount of motion. */
    MOTION: 'motion',

    /** The direction of the motion. */
    DIRECTION: 'direction'
};

/**
 * Subject video sensor block should report for.
 * @readonly
 * @enum {string}
 */
const SensingSubject = {
    /** The sensor traits of the whole stage. */
    STAGE: 'Stage',

    /** The senosr traits of the area overlapped by this sprite. */
    SPRITE: 'this sprite'
};

/**
 * States the video sensing activity can be set to.
 * @readonly
 * @enum {string}
 */
const VideoState = {
    /** Video turned off. */
    OFF: 'off',

    /** Video turned on with default y axis mirroring. */
    ON: 'on',

    /** Video turned on without default y axis mirroring. */
    ON_FLIPPED: 'on-flipped'
};

/**
 * Class for the motion-related blocks in Scratch 3.0
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */
class Scratch3VideoSensingBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * The motion detection algoritm used to power the motion amount and
         * direction values.
         * @type {VideoMotion}
         */
        this.detect = new VideoMotion();

        /**
         * The last millisecond epoch timestamp that the video stream was
         * analyzed.
         * @type {number}
         */
        this._lastUpdate = null;

        /**
         * A flag to determine if this extension has been installed in a project.
         * It is set to false the first time getInfo is run.
         * @type {boolean}
         */
        this.firstInstall = true;

        if (this.runtime.ioDevices) {
            // Configure the video device with values from globally stored locations.
            this.runtime.on(Runtime.PROJECT_LOADED, this.updateVideoDisplay.bind(this));

            // Clear target motion state values when the project starts.
            this.runtime.on(Runtime.PROJECT_RUN_START, this.reset.bind(this));

            // Kick off looping the analysis logic.
            this._loop();
        }
    }

    /**
     * After analyzing a frame the amount of milliseconds until another frame
     * is analyzed.
     * @type {number}
     */
    static get INTERVAL () {
        return 33;
    }

    /**
     * Dimensions the video stream is analyzed at after its rendered to the
     * sample canvas.
     * @type {Array.<number>}
     */
    static get DIMENSIONS () {
        return [480, 360];
    }

    /**
     * The key to load & store a target's motion-related state.
     * @type {string}
     */
    static get STATE_KEY () {
        return 'Scratch.videoSensing';
    }

    /**
     * The default motion-related state, to be used when a target has no existing motion state.
     * @type {MotionState}
     */
    static get DEFAULT_MOTION_STATE () {
        return {
            motionFrameNumber: 0,
            motionAmount: 0,
            motionDirection: 0
        };
    }

    /**
     * The transparency setting of the video preview stored in a value
     * accessible by any object connected to the virtual machine.
     * @type {number}
     */
    get globalVideoTransparency () {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            return stage.videoTransparency;
        }
        return 50;
    }

    set globalVideoTransparency (transparency) {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            stage.videoTransparency = transparency;
        }
    }

    /**
     * The video state of the video preview stored in a value accessible by any
     * object connected to the virtual machine.
     * @type {number}
     */
    get globalVideoState () {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            return stage.videoState;
        }
        // Though the default value for the stage is normally 'on', we need to default
        // to 'off' here to prevent the video device from briefly activating
        // while waiting for stage targets to be installed that say it should be off
        return VideoState.OFF;
    }

    set globalVideoState (state) {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            stage.videoState = state;
        }
    }

    /**
     * Get the latest values for video transparency and state,
     * and set the video device to use them.
     */
    updateVideoDisplay () {
        this.setVideoTransparency({
            TRANSPARENCY: this.globalVideoTransparency
        });
        this.videoToggle({
            VIDEO_STATE: this.globalVideoState
        });
    }

    /**
     * Reset the extension's data motion detection data. This will clear out
     * for example old frames, so the first analyzed frame will not be compared
     * against a frame from before reset was called.
     */
    reset () {
        this.detect.reset();

        const targets = this.runtime.targets;
        for (let i = 0; i < targets.length; i++) {
            const state = targets[i].getCustomState(Scratch3VideoSensingBlocks.STATE_KEY);
            if (state) {
                state.motionAmount = 0;
                state.motionDirection = 0;
            }
        }
    }

    /**
     * Occasionally step a loop to sample the video, stamp it to the preview
     * skin, and add a TypedArray copy of the canvas's pixel data.
     * @private
     */
    _loop () {
        const loopTime = Math.max(this.runtime.currentStepTime, Scratch3VideoSensingBlocks.INTERVAL);
        this._loopInterval = setTimeout(this._loop.bind(this), loopTime);

        // Add frame to detector
        const time = Date.now();
        if (this._lastUpdate === null) {
            this._lastUpdate = time;
        }
        const offset = time - this._lastUpdate;
        if (offset > Scratch3VideoSensingBlocks.INTERVAL) {
            const frame = this.runtime.ioDevices.video.getFrame({
                format: Video.FORMAT_IMAGE_DATA,
                dimensions: Scratch3VideoSensingBlocks.DIMENSIONS
            });
            if (frame) {
                this._lastUpdate = time;
                this.detect.addFrame(frame.data);
            }
        }
    }

    /**
     * Stop the video sampling loop. Only used for testing.
     */
    _stopLoop () {
        clearTimeout(this._loopInterval);
    }

    /**
     * Create data for a menu in scratch-blocks format, consisting of an array
     * of objects with text and value properties. The text is a translated
     * string, and the value is one-indexed.
     * @param {object[]} info - An array of info objects each having a name
     *   property.
     * @return {array} - An array of objects with text and value properties.
     * @private
     */
    _buildMenu (info) {
        return info.map((entry, index) => {
            const obj = {};
            obj.text = entry.name;
            obj.value = entry.value || String(index + 1);
            return obj;
        });
    }

    /**
     * @param {Target} target - collect motion state for this target.
     * @returns {MotionState} the mutable motion state associated with that
     *   target. This will be created if necessary.
     * @private
     */
    _getMotionState (target) {
        let motionState = target.getCustomState(Scratch3VideoSensingBlocks.STATE_KEY);
        if (!motionState) {
            motionState = Clone.simple(Scratch3VideoSensingBlocks.DEFAULT_MOTION_STATE);
            target.setCustomState(Scratch3VideoSensingBlocks.STATE_KEY, motionState);
        }
        return motionState;
    }

    static get SensingAttribute () {
        return SensingAttribute;
    }

    /**
     * An array of choices of whether a reporter should return the frame's
     * motion amount or direction.
     * @type {object[]}
     * @param {string} name - the translatable name to display in sensor
     *   attribute menu
     * @param {string} value - the serializable value of the attribute
     */
    get ATTRIBUTE_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'videoSensing.motion',
                    default: 'motion',
                    description: 'Attribute for the "video [ATTRIBUTE] on [SUBJECT]" block'
                }),
                value: SensingAttribute.MOTION
            },
            {
                name: formatMessage({
                    id: 'videoSensing.direction',
                    default: 'direction',
                    description: 'Attribute for the "video [ATTRIBUTE] on [SUBJECT]" block'
                }),
                value: SensingAttribute.DIRECTION
            }
        ];
    }

    static get SensingSubject () {
        return SensingSubject;
    }

    /**
     * An array of info about the subject choices.
     * @type {object[]}
     * @param {string} name - the translatable name to display in the subject menu
     * @param {string} value - the serializable value of the subject
     */
    get SUBJECT_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'videoSensing.sprite',
                    default: 'sprite',
                    description: 'Subject for the "video [ATTRIBUTE] on [SUBJECT]" block'
                }),
                value: SensingSubject.SPRITE
            },
            {
                name: formatMessage({
                    id: 'videoSensing.stage',
                    default: 'stage',
                    description: 'Subject for the "video [ATTRIBUTE] on [SUBJECT]" block'
                }),
                value: SensingSubject.STAGE
            }
        ];
    }

    /**
     * States the video sensing activity can be set to.
     * @readonly
     * @enum {string}
     */
    static get VideoState () {
        return VideoState;
    }

    /**
     * An array of info on video state options for the "turn video [STATE]" block.
     * @type {object[]}
     * @param {string} name - the translatable name to display in the video state menu
     * @param {string} value - the serializable value stored in the block
     */
    get VIDEO_STATE_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'videoSensing.off',
                    default: 'off',
                    description: 'Option for the "turn video [STATE]" block'
                }),
                value: VideoState.OFF
            },
            {
                name: formatMessage({
                    id: 'videoSensing.on',
                    default: 'on',
                    description: 'Option for the "turn video [STATE]" block'
                }),
                value: VideoState.ON
            },
            {
                name: formatMessage({
                    id: 'videoSensing.onFlipped',
                    default: 'on flipped',
                    description: 'Option for the "turn video [STATE]" block that causes the video to be flipped' +
                        ' horizontally (reversed as in a mirror)'
                }),
                value: VideoState.ON_FLIPPED
            }
        ];
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        // Set the video display properties to defaults the first time
        // getInfo is run. This turns on the video device when it is
        // first added to a project, and is overwritten by a PROJECT_LOADED
        // event listener that later calls updateVideoDisplay
        if (this.firstInstall) {
            this.globalVideoState = VideoState.ON;
            this.globalVideoTransparency = 50;
            this.updateVideoDisplay();
            this.firstInstall = false;
        }

        // Return extension definition
        return {
            id: 'videoSensing',
            name: formatMessage({
                id: 'videoSensing.categoryName',
                default: 'Video Sensing',
                description: 'Label for the video sensing extension category'
            }),
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [
                {
                    // @todo this hat needs to be set itself to restart existing
                    // threads like Scratch 2's behaviour.
                    opcode: 'whenMotionGreaterThan',
                    text: formatMessage({
                        id: 'videoSensing.whenMotionGreaterThan',
                        default: 'when video motion > [REFERENCE]',
                        description: 'Event that triggers when the amount of motion is greater than [REFERENCE]'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        REFERENCE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    }
                },
                {
                    opcode: 'videoOn',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'videoSensing.videoOn',
                        default: 'video [ATTRIBUTE] on [SUBJECT]',
                        description: 'Reporter that returns the amount of [ATTRIBUTE] for the selected [SUBJECT]'
                    }),
                    arguments: {
                        ATTRIBUTE: {
                            type: ArgumentType.NUMBER,
                            menu: 'ATTRIBUTE',
                            defaultValue: SensingAttribute.MOTION
                        },
                        SUBJECT: {
                            type: ArgumentType.NUMBER,
                            menu: 'SUBJECT',
                            defaultValue: SensingSubject.SPRITE
                        }
                    }
                },
                {
                    opcode: 'videoToggle',
                    text: formatMessage({
                        id: 'videoSensing.videoToggle',
                        default: 'turn video [VIDEO_STATE]',
                        description: 'Controls display of the video preview layer'
                    }),
                    arguments: {
                        VIDEO_STATE: {
                            type: ArgumentType.NUMBER,
                            menu: 'VIDEO_STATE',
                            defaultValue: VideoState.ON
                        }
                    }
                },
                {
                    opcode: 'setVideoTransparency',
                    text: formatMessage({
                        id: 'videoSensing.setVideoTransparency',
                        default: 'set video transparency to [TRANSPARENCY]',
                        description: 'Controls transparency of the video preview layer'
                    }),
                    arguments: {
                        TRANSPARENCY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 50
                        }
                    }
                }
            ],
            menus: {
                ATTRIBUTE: {
                    acceptReporters: true,
                    items: this._buildMenu(this.ATTRIBUTE_INFO)
                },
                SUBJECT: {
                    acceptReporters: true,
                    items: this._buildMenu(this.SUBJECT_INFO)
                },
                VIDEO_STATE: {
                    acceptReporters: true,
                    items: this._buildMenu(this.VIDEO_STATE_INFO)
                }
            }
        };
    }

    /**
     * Analyze a part of the frame that a target overlaps.
     * @param {Target} target - a target to determine where to analyze
     * @returns {MotionState} the motion state for the given target
     */
    _analyzeLocalMotion (target) {
        const drawable = this.runtime.renderer._allDrawables[target.drawableID];
        const state = this._getMotionState(target);
        this.detect.getLocalMotion(drawable, state);
        return state;
    }

    /**
     * A scratch reporter block handle that analyzes the last two frames and
     * depending on the arguments, returns the motion or direction for the
     * whole stage or just the target sprite.
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     * @returns {number} the motion amount or direction of the stage or sprite
     */
    videoOn (args, util) {
        if (this.runtime.privacyRestrictionsActive) {
            return -1;
        }

        this.detect.analyzeFrame();

        let state = this.detect;
        if (args.SUBJECT === SensingSubject.SPRITE) {
            state = this._analyzeLocalMotion(util.target);
        }

        if (args.ATTRIBUTE === SensingAttribute.MOTION) {
            return state.motionAmount;
        }
        return state.motionDirection;
    }

    /**
     * A scratch hat block edge handle that analyzes the last two frames where
     * the target sprite overlaps and if it has more motion than the given
     * reference value.
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     * @returns {boolean} true if the sprite overlaps more motion than the
     *   reference
     */
    whenMotionGreaterThan (args, util) {
        if (this.runtime.privacyRestrictionsActive) {
            return false;
        }

        this.detect.analyzeFrame();
        const state = this._analyzeLocalMotion(util.target);
        return state.motionAmount > Number(args.REFERENCE);
    }

    /**
     * A scratch command block handle that configures the video state from
     * passed arguments.
     * @param {object} args - the block arguments
     * @param {VideoState} args.VIDEO_STATE - the video state to set the device to
     */
    videoToggle (args) {
        const state = args.VIDEO_STATE;
        this.globalVideoState = state;
        if (state === VideoState.OFF) {
            this.runtime.ioDevices.video.disableVideo();
        } else {
            this.runtime.ioDevices.video.enableVideo();
            // Mirror if state is ON. Do not mirror if state is ON_FLIPPED.
            this.runtime.ioDevices.video.mirror = state === VideoState.ON;
        }
    }

    /**
     * A scratch command block handle that configures the video preview's
     * transparency from passed arguments.
     * @param {object} args - the block arguments
     * @param {number} args.TRANSPARENCY - the transparency to set the video
     *   preview to
     */
    setVideoTransparency (args) {
        const transparency = Cast.toNumber(args.TRANSPARENCY);
        this.globalVideoTransparency = transparency;
        this.runtime.ioDevices.video.setPreviewGhost(transparency);
    }
}

module.exports = Scratch3VideoSensingBlocks;
