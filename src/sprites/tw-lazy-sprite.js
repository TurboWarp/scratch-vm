const Sprite = require('./sprite');
const JSZip = require('@turbowarp/jszip');

/**
 * @enum {'unloaded'|'loading'|'loaded'|'error'}
 */
const State = {
    UNLOADED: 'unloaded',
    LOADING: 'loading',
    LOADED: 'loaded',
    ERROR: 'error'
};

/**
 * TODO(lazy): this will generally just leak memory over time in the editor.
 */
class AssetCache {
    constructor () {
        /**
         * Created lazily.
         * @type {JSZip|null}
         */
        this.internalCache = new JSZip();

        /**
         * @type {JSZip[]}
         */
        this.zips = [this.internalCache];
    }

    /**
     * @param {JSZip} zip
     */
    addZip (zip) {
        if (!this.zips.includes(zip)) {
            this.zips.push(zip);
        }
    }

    /**
     * Cache a file if it is not already cached.
     * @param {string} md5ext md5 and extension
     * @param {Uint8Array} data in-memory data
     */
    storeIfMissing (md5ext, data) {
        if (this.file(md5ext)) {
            // Already cached.
            return;
        }

        // TODO(lazy): we may be able to alleviate memory issues from this if we convert to Blob
        // since those can at least theoretically be stored on disk. We might want to do that in
        // some sort of background timer so we don't overload everything trying to convert 100MB+
        // of data in one go.
        this.internalCache.file(md5ext, data);
    }

    /**
     * Allows this class to be used as a JSZip zip.
     * @param {string} md5ext md5 and extension
     * @param {unknown} data Do not provide
     * @returns {JSZip.JSZipObject|null} JSZip file if it exists.
     */
    file (md5ext, data) {
        if (data) {
            // There is already a specific method for this.
            throw new Error('AssetCache.file() does not support modification');
        }

        for (const zip of this.zips) {
            const file = zip.file(md5ext);
            // TODO(lazy): check subfolders to match how the other asset operations work
            if (file) {
                return file;
            }
        }

        return null;
    }
}

const assetCacheSingleton = new AssetCache();

/**
 * Sprite with lazy-loading capabilities.
 */
class LazySprite extends Sprite {
    /**
     * @param {Runtime} runtime
     * @param {object} initialJSON JSON from project.json or sprite.json
     * @param {JSZip|null} initialZip Zip file provided when loading the project.
     */
    constructor (runtime, initialJSON, initialZip) {
        // null blocks means Sprite will create it for us
        super(null, runtime);

        /**
         * @type {State}
         */
        this.state = State.UNLOADED;

        /**
         * sprite.json or project.json targets[x] entry for the sprite.
         * @type {object}
         */
        this.object = initialJSON;

        if (initialZip) {
            assetCacheSingleton.addZip(initialZip);
        }

        /**
         * Callback to cancel current load operation.
         * @type {() => void}
         */
        this._cancelLoadCallback = () => {};
    }

    get isLazy () {
        return true;
    }

    /**
     * Creates an instance of this sprite.
     * State must be unloaded.
     * Renderer state is not updated. You must call updateAllDrawableProperties() yourself later.
     * @returns {Promise<RenderedTarget|null>} Loaded target, or null if cancelled by unload() call.
     */
    load () {
        if (this.state !== State.UNLOADED) {
            return Promise.reject(new Error(`Unknown state transition ${this.state} -> loading`));
        }

        let cancelled = false;

        const load = async () => {
            this.state = State.LOADING;

            // Loaded lazily to avoid circular dependencies
            const sb3 = require('../serialization/sb3');
            const {
                costumePromises,
                soundPromises,
                soundBank
            } = sb3.parseScratchAssets(this.object, this.runtime, assetCacheSingleton);

            // Wait a bit to give storage a chance to start requests.
            await Promise.resolve();

            // Need to check for cancellation after each async operation.
            // At this point the promise is already finished, so our return value won't be seen anywhere.
            if (cancelled) {
                return null;
            }

            const target = this.createClone();
            sb3.parseTargetStateFromJSON(this.runtime, target, this.object);

            const costumes = await Promise.all(costumePromises);
            if (cancelled) {
                return null;
            }

            const sounds = await Promise.all(soundPromises);
            if (cancelled) {
                return null;
            }

            this.costumes = costumes;
            this.sounds = sounds;
            this.soundBank = soundBank || null;
            this.state = State.LOADED;
            return target;
        };

        return new Promise((resolve, reject) => {
            this._cancelLoadCallback = () => {
                cancelled = true;
                resolve(null);
            };

            load().then(resolve, reject);
        }).catch(err => {
            this.state = State.ERROR;
            throw err;
        });
    }

    /**
     * Updates this sprite's stored state based on its original clone. Existing targets are not removed.
     * State must be loaded.
     * @returns {void}
     */
    save () {
        if (this.state !== State.LOADED) {
            return Promise.reject(new Error(`Cannot save in state ${this.state}`));
        }

        const sb3 = require('../serialization/sb3');
        const serializeAssets = require('../serialization/serialize-assets');

        const target = this.clones[0];
        const extensions = new Set();
        const serializedJSON = sb3.serializeTarget(target.toJSON(), extensions);
        const assets = [
            ...serializeAssets.serializeCostumes(this.runtime, target.id),
            ...serializeAssets.serializeSounds(this.runtime, target.id)
        ];

        this.object = serializedJSON;
        for (const asset of assets) {
            assetCacheSingleton.storeIfMissing(asset.fileName, asset.fileContent);
        }
    }

    /**
     * Updates this sprite's stored state based on its original clone, and removes existing targets.
     * State must be LOADED.
     * @returns {void}
     */
    unload () {
        if (this.state !== State.LOADED && this.state !== State.LOADING) {
            return Promise.reject(new Error(`Unknown state transition ${this.state} -> unloaded`));
        }

        // Only save if we're in the loaded state. If we're in the loading state, we will have nothing
        // to save in the first place.
        if (this.state === State.LOADED) {
            this.save();
        }

        this.state = State.UNLOADED;
        this._cancelLoadCallback();

        for (const target of this.clones) {
            this.runtime.requestTargetsUpdate(target);
            this.runtime.disposeTarget(target);
        }
    }

    /**
     * Fetch all assets used in this sprite for serialization.
     * @returns {Promise<Array<{fileName: string; fileContents: Uint8Array}>>}
     */
    async serializeAssets () {
        // Loaded lazily to avoid circular dependencies
        const deserializeAssets = require('../serialization/deserialize-assets');

        const promises = [];
        for (const costume of this.object.costumes) {
            if (!costume.asset) {
                promises.push(deserializeAssets.deserializeCostume(costume, this.runtime, assetCacheSingleton));
            }
        }
        for (const sound of this.object.sounds) {
            if (!sound.asset) {
                promises.push(deserializeAssets.deserializeSound(sound, this.runtime, assetCacheSingleton));
            }
        }
        await Promise.all(promises);

        const allResources = [
            ...this.object.costumes,
            ...this.object.sounds
        ];

        return allResources
            .map(o => (o.broken ? o.broken.asset : o.asset))
            .filter(asset => asset)
            .map(asset => ({
                fileName: `${asset.assetId}.${asset.dataFormat}`,
                fileContent: asset.data
            }));
    }
}

// Export enums
LazySprite.State = State;

module.exports = LazySprite;
