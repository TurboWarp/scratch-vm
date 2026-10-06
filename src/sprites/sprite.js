const RenderedTarget = require('./rendered-target');
const Blocks = require('../engine/blocks');
const {loadSoundFromAsset} = require('../import/load-sound');
const {loadCostumeFromAsset} = require('../import/load-costume');
const newBlockIds = require('../util/new-block-ids');
const StringUtil = require('../util/string-util');
const StageLayering = require('../engine/stage-layering');

class Sprite {
    /**
     * Sprite to be used on the Scratch stage.
     * All clones of a sprite have shared blocks, shared costumes, shared variables,
     * shared sounds, etc.
     * @param {?Blocks} blocks Shared blocks object for all clones of sprite.
     * @param {Runtime} runtime Reference to the runtime.
     * @constructor
     */
    constructor (blocks, runtime) {
        this.runtime = runtime;
        if (!blocks) {
            // Shared set of blocks for all clones.
            blocks = new Blocks(runtime);
        }
        this.blocks = blocks;
        /**
         * Human-readable name for this sprite (and all clones).
         * @type {string}
         */
        this.name = '';
        /**
         * List of costumes for this sprite.
         * Each entry is an object, e.g.,
         * {
         *      skinId: 1,
         *      name: "Costume Name",
         *      bitmapResolution: 2,
         *      rotationCenterX: 0,
         *      rotationCenterY: 0
         * }
         * @type {Array.<!Object>}
         */
        this.costumes_ = [];
        /**
         * List of sounds for this sprite.
        */
        this.sounds = [];
        /**
         * List of clones for this sprite, including the original.
         * @type {Array.<!RenderedTarget>}
         */
        this.clones = [];

        this.soundBank = null;
        if (this.runtime && this.runtime.audioEngine) {
            this.soundBank = this.runtime.audioEngine.createBank();
        }
    }

    /**
     * Add an array of costumes, taking care to avoid duplicate names.
     * @param {!Array<object>} costumes Array of objects representing costumes.
     */
    set costumes (costumes) {
        this.costumes_ = [];
        for (const costume of costumes) {
            this.addCostumeAt(costume, this.costumes_.length);
        }
    }

    /**
     * Get full costume list
     * @return {object[]} list of costumes. Note that mutating the returned list will not
     *     mutate the list on the sprite. The sprite list should be mutated by calling
     *     addCostumeAt, deleteCostumeAt, or setting costumes.
     */
    get costumes () {
        return this.costumes_;
    }

    /**
     * Add a costume at the given index, taking care to avoid duplicate names.
     * @param {!object} costumeObject Object representing the costume.
     * @param {!int} index Index at which to add costume
     */
    addCostumeAt (costumeObject, index) {
        if (!costumeObject.name) {
            costumeObject.name = '';
        }
        const usedNames = this.costumes_.map(costume => costume.name);
        costumeObject.name = StringUtil.unusedName(costumeObject.name, usedNames);
        this.costumes_.splice(index, 0, costumeObject);
    }

    /**
     * Delete a costume by index. Does not destroy its skin.
     * @param {number} index Costume index to be deleted
     * @returns {object|null} The deleted costume, if any
     */
    deleteCostumeAt (index) {
        return this.costumes.splice(index, 1)[0];
    }

    /**
     * Delete a costume by index, destroy its skin, and update clones' current costume.
     * @param {number} index Costume index to be deleted
     * @returns {object|null} The deleted costume, if any
     */
    deleteCostume (index) {
        const originalCostumeCount = this.costumes_.length;
        if (
            originalCostumeCount === 1 ||
            index < 0 ||
            index >= originalCostumeCount
        ) {
            return null;
        }

        const deletedCostume = this.deleteCostumeAt(index);
        if (this.runtime.renderer && typeof deletedCostume.skinId === 'number') {
            this.runtime.renderer.destroySkin(deletedCostume.skinId);
        }

        for (const clone of this.clones) {
            if (clone.currentCostume > index) {
                clone.setCostume(clone.currentCostume - 1);
            } else if (clone.currentCostume === index) {
                clone.setCostume(Math.min(index, this.costumes_.length - 1));
            }
        }

        return deletedCostume;
    }

    /**
     * Delete a sound by index. Does not dispose its sound player.
     * @param {number} index Sound index to be deleted
     * @returns {object|null} The deleted sound, if any
     */
    deleteSoundAt (index) {
        return this.sounds.splice(index, 1)[0];
    }

    /**
     * Delete a sound by index and dispose its sound player.
     * @param {number} index Sound index to be deleted
     * @returns {object|null} The deleted sound, if any
     */
    deleteSound (index) {
        if (index < 0 || index >= this.sounds.length) return null;
        const deletedSound = this.deleteSoundAt(index);
        // Older versions of scratch-audio don't have removeSoundPlayer
        if (
            this.soundBank &&
            typeof deletedSound.soundId === 'string' &&
            typeof this.soundBank.removeSoundPlayer === 'function'
        ) {
            this.soundBank.removeSoundPlayer(deletedSound.soundId);
        }
        return deletedSound;
    }

    /**
     * Create a clone of this sprite.
     * @param {string=} optLayerGroup Optional layer group the clone's drawable should be added to
     * Defaults to the sprite layer group
     * @returns {!RenderedTarget} Newly created clone.
     */
    createClone (optLayerGroup) {
        const newClone = new RenderedTarget(this, this.runtime);
        newClone.isOriginal = this.clones.length === 0;
        this.clones.push(newClone);
        newClone.initAudio();
        if (newClone.isOriginal) {
            // Default to the sprite layer group if optLayerGroup is not provided
            const layerGroup = typeof optLayerGroup === 'string' ? optLayerGroup : StageLayering.SPRITE_LAYER;
            newClone.initDrawable(layerGroup);
            this.runtime.fireTargetWasCreated(newClone);
        } else {
            this.runtime.fireTargetWasCreated(newClone, this.clones[0]);
        }
        return newClone;
    }

    /**
     * Disconnect a clone from this sprite. The clone is unmodified.
     * In particular, the clone's dispose() method is not called.
     * @param {!RenderedTarget} clone - the clone to be removed.
     */
    removeClone (clone) {
        this.runtime.fireTargetWasRemoved(clone);
        const cloneIndex = this.clones.indexOf(clone);
        if (cloneIndex >= 0) {
            this.clones.splice(cloneIndex, 1);
        }
        if (this.clones.length === 0) {
            this.dispose();
        }
    }

    duplicate () {
        const newSprite = new Sprite(null, this.runtime);
        const blocksContainer = this.blocks._blocks;
        const originalBlocks = Object.keys(blocksContainer).map(key => blocksContainer[key]);
        const copiedBlocks = JSON.parse(JSON.stringify(originalBlocks));
        newBlockIds(copiedBlocks);
        copiedBlocks.forEach(block => {
            newSprite.blocks.createBlock(block);
        });


        const allNames = this.runtime.targets.map(t => t.sprite.name);
        newSprite.name = StringUtil.unusedName(this.name, allNames);

        const assetPromises = [];

        newSprite.costumes = this.costumes_.map(costume => {
            const newCostume = Object.assign({}, costume);
            assetPromises.push(loadCostumeFromAsset(newCostume, this.runtime));
            return newCostume;
        });

        newSprite.sounds = this.sounds.map(sound => {
            const newSound = Object.assign({}, sound);
            const soundAsset = sound.asset;
            assetPromises.push(loadSoundFromAsset(newSound, soundAsset, this.runtime, newSprite.soundBank));
            return newSound;
        });

        return Promise.all(assetPromises).then(() => newSprite);
    }

    dispose () {
        if (this.runtime.renderer) {
            for (const costume of this.costumes_) {
                if (typeof costume.skinId === 'number') {
                    this.runtime.renderer.destroySkin(costume.skinId);
                }
            }
        }
        // toJSON() exposes these arrays by reference so it's better to make new ones than
        // to modify in place and probably break things.
        this.costumes_ = [];
        this.sounds = [];
        if (this.soundBank) {
            this.soundBank.dispose();
            this.soundBank = null;
        }
    }
}

module.exports = Sprite;
