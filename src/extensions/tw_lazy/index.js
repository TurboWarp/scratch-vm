const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');
const Runtime = require('../../engine/runtime');

class LazySprites {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        // This is implemented with an event rather than in the blocks below so that it works if
        // some other extension loads sprites lazily.
        this.runtime.on(Runtime.LAZY_SPRITES_LOADED, targets => {
            for (const target of targets) {
                this.runtime.startHats('twlazy_whenLoaded', null, target);
            }
        });
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'twlazy',
            name: 'Lazy Loading',
            blocks: [
                {
                    blockType: BlockType.EVENT,
                    opcode: 'whenLoaded',
                    isEdgeActivated: false,
                    text: formatMessage({
                        id: 'tw.lazy.whenLoaded',
                        default: 'when I load',
                        description: 'Hat block that runs when a sprite loads'
                    })
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'loadSprite',
                    text: formatMessage({
                        id: 'tw.lazy.loadSprite',
                        default: 'load sprite [SPRITE]',
                        description: 'Block that loads a sprite'
                    }),
                    arguments: {
                        SPRITE: {
                            type: ArgumentType.STRING,
                            menu: 'lazySprite'
                        }
                    }
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'unloadSprite',
                    text: formatMessage({
                        id: 'tw.lazy.unloadSprite',
                        default: 'unload sprite [SPRITE]',
                        description: 'Block that unloads a sprite'
                    }),
                    arguments: {
                        SPRITE: {
                            type: ArgumentType.STRING,
                            menu: 'lazySprite'
                        }
                    }
                }
            ],
            menus: {
                lazySprite: {
                    acceptReporters: true,
                    items: 'getLazySpritesMenu'
                },
                lazyCostume: {
                    acceptReporters: true,
                    items: 'getLazyCostumesMenu'
                },
                lazySound: {
                    acceptReporters: true,
                    items: 'getLazySoundsMenu'
                }
            }
        };
    }

    getLazySpritesMenu () {
        if (this.runtime.lazySprites.length === 0) {
            return [
                {
                    text: formatMessage({
                        id: 'tw.lazy.noSprites',
                        default: 'No sprites',
                        description: 'Block menu in lazy loading extension when no lazy-loaded sprites exist'
                    }),
                    value: ''
                }
            ];
        }

        return this.runtime.lazySprites.map(i => i.name);
    }

    getLazyCostumesMenu () {
        // TODO(lazy)
        return ['b'];
    }

    getLazySoundsMenu () {
        // TODO(lazy)
        return ['c'];
    }

    loadSprite (args) {
        const name = Cast.toString(args.SPRITE);
        return this.runtime.loadLazySprites([name])
            .catch(() => {
                // TODO(lazy): handle this...
            });
    }

    unloadSprite (args) {
        const name = Cast.toString(args.SPRITE);
        return this.runtime.unloadLazySprites([name])
            .catch(() => {
                // TODO(lazy): handle this...
            });
    }
}

module.exports = LazySprites;
