const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const Clone = require('../../util/clone');
const Color = require('../../util/color');
const formatMessage = require('format-message');
const MathUtil = require('../../util/math-util');
const RenderedTarget = require('../../sprites/rendered-target');
const log = require('../../util/log');
const StageLayering = require('../../engine/stage-layering');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii00NTkgMjYxIDQwIDQwIj48cGF0aCBkPSJNLTQ0NC40IDI5MC41bC0zLjYtMy42cy0xLjEgMS40LTMuOC44bC0zLjQgOS41Yy0uMS4zLjIuNi41LjVsOS41LTMuNGMtLjYtMi43LjgtMy44LjgtMy44eiIgZmlsbD0iI2Y3YzY3ZiIgc3Ryb2tlPSIjNTc1ZTc1IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiLz48cGF0aCBkPSJNLTQ0MS45IDI5MC40bDE5LjUtMjIuMXMxLjMtMS42LS4yLTMuMWMtMS42LTEuNS0zLjEtLjItMy4xLS4ybC0yMi4xIDE5LjUtLjIgMi41IDEuOCAxLjggMS44IDEuOCAyLjUtLjJ6IiBmaWxsPSIjZjQ2ZDM4IiBzdHJva2U9IiM1NzVlNzUiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzU3NWU3NSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGQ9Ik0tNDU1LjEgMjk3LjZsMy44LTMuOCIvPjxwYXRoIGZpbGw9IiM5NWQ4ZDYiIHN0cm9rZT0iIzU3NWU3NSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGQ9Ik0tNDQ2LjUgMjgzLjFsNS44IDUuOCAyLjktMy4yLTUuNC01LjR6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjNTc1ZTc1IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGQ9Ik0tNDQzLjYgMjg2bC0yLjktMi45LTEuMyAxLjItLjMgMi42IDMuNyAzLjYgMi41LS4xIDEuMi0xLjV6Ii8+PHBhdGggZD0iTS00NDQuOCAyOTAuMmwyLjYtLjIgMTkuNC0yMnMuOC0xLjEuMS0yLjFsLTMwLjkgMzAuOCA3LjgtMi43Yy0uNC0yLjIuNi0zLjUgMS0zLjh6IiBvcGFjaXR5PSIuMiIgZmlsbD0iIzM1MzUzNSIvPjwvc3ZnPg==';

/**
 * @typedef {object} PenState - the pen state associated with a particular target.
 * @property {Boolean} penDown - tracks whether the pen should draw for this target.
 * @property {number} color - the current color (hue) of the pen.
 * @property {PenAttributes} penAttributes - cached pen attributes for the renderer. This is the authoritative value for
 *   diameter but not for pen color.
 */

/**
 * Host for the Pen-related blocks in Scratch 3.0
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */
class Scratch3CanvasBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        this._penSkinId = -2;
        // this._penDrawableId = -2;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'canvas',
            name: 'Canvas',
            blockIconURI: blockIconURI,
            blocks: [{
                    opcode: 'beginPath',
                    blockType: BlockType.COMMAND,
                    text: 'beginPath(绘制路径)',
                    arguments: {}
                },
                {
                    opcode: 'closePath',
                    blockType: BlockType.COMMAND,
                    text: 'closePath(结束路径)',
                    arguments: {}
                },
                {
                    opcode: 'moveTo',
                    blockType: BlockType.COMMAND,
                    text: 'moveTo(移到)([X],[Y])',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'lineTo',
                    blockType: BlockType.COMMAND,
                    text: 'lineTo([X],[Y])',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'arc',
                    blockType: BlockType.COMMAND,
                    text: 'arc(画弧)([X],[Y],[RADIUS],[START_ANGLE],[END_ANGLE])',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        RADIUS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '100'
                        },
                        START_ANGLE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        END_ANGLE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '3.1415926'
                        }
                    }
                },
                {
                    opcode: 'rect',
                    blockType: BlockType.COMMAND,
                    text: 'rect(矩形)([X],[Y],[W],[H])',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        W: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '100'
                        },
                        H: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '100'
                        }
                    }
                },
                {
                    opcode: 'clip',
                    blockType: BlockType.COMMAND,
                    text: 'clip(裁剪)'
                },
                {
                    opcode: 'setLineWidth',
                    blockType: BlockType.COMMAND,
                    text: 'setLineWidth(设置线宽)([LINE_WIDTH])',
                    arguments: {
                        LINE_WIDTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1'
                        }
                    }
                },
                {
                    opcode: 'setLineCap',
                    blockType: BlockType.COMMAND,
                    text: 'setLineCap(设置线条端点样式)([LINE_CAP])',
                    arguments: {
                        LINE_CAP: {
                            type: ArgumentType.STRING,
                            defaultValue: 'round'
                        }
                    }
                },
                {
                    opcode: 'setStrokeStyle',
                    blockType: BlockType.COMMAND,
                    text: 'setStrokeStyle(设置边框样式)([STROKE_STYLE])',
                    arguments: {
                        STROKE_STYLE: {
                            type: ArgumentType.STRING,
                            defaultValue: '#000000'
                        }
                    }
                },
                {
                    opcode: 'setFillStyle',
                    blockType: BlockType.COMMAND,
                    text: 'setFillStyle(设置填充样式)([FILL_STYLE])',
                    arguments: {
                        FILL_STYLE: {
                            type: ArgumentType.STRING,
                            defaultValue: '#000000'
                        }
                    }
                },
                {
                    opcode: 'stroke',
                    blockType: BlockType.COMMAND,
                    text: 'stroke(边框)'
                },
                {
                    opcode: 'fill',
                    blockType: BlockType.COMMAND,
                    text: 'fill(填充)'
                },
                {
                    opcode: 'clearRect',
                    blockType: BlockType.COMMAND,
                    text: 'clearRect(清除矩形)([X],[Y],[W],[H])',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        W: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '480'
                        },
                        H: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '360'
                        }
                    }
                },
                {
                    opcode: 'setFont',
                    blockType: BlockType.COMMAND,
                    text: 'setFont(设置字体)([FONT])',
                    arguments: {
                        FONT: {
                            type: ArgumentType.STRING,
                            defaultValue: '30px Arial'
                        }
                    }
                },
                {
                    opcode: 'strokeText',
                    blockType: BlockType.COMMAND,
                    text: 'strokeText(字体边框)([TEXT],[X],[Y])',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'hello world'
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'fillText',
                    blockType: BlockType.COMMAND,
                    text: 'fillText(字体填充)([TEXT],[X],[Y])',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'hello world'
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'measureText',
                    blockType: BlockType.REPORTER,
                    text: 'measureText([TEXT])',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'hello world'
                        }
                    }
                },
                {
                    opcode: 'loadImage',
                    blockType: BlockType.COMMAND,
                    text: '加载图片([IMAGE_ID])',
                    arguments: {
                        IMAGE_ID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://40code-cdn.zq990.com/static/internalapi/asset/0214ed33dab7c5614594feecd44e5e4f.jpg'
                        }
                    }
                },
                {
                    opcode: 'drawImage',
                    blockType: BlockType.COMMAND,
                    text: '绘制图片([IMAGE_ID],[X],[Y])',
                    arguments: {
                        IMAGE_ID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://40code-cdn.zq990.com/static/internalapi/asset/0214ed33dab7c5614594feecd44e5e4f.jpg'
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'drawImage2',
                    blockType: BlockType.COMMAND,
                    text: '绘制图片([IMAGE_ID] X[X] Y[Y] 宽度[w] 高度[h])',
                    arguments: {
                        IMAGE_ID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://40code-cdn.zq990.com/static/internalapi/asset/0214ed33dab7c5614594feecd44e5e4f.jpg'
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        w: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        h: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'drawImage3',
                    blockType: BlockType.COMMAND,
                    text: '绘制图片([IMAGE_ID] 起始X[SX] Y[SY] 宽度[sw] 高度[sh]；结束X[X] Y[Y] 宽度[w] 高度[h])',
                    arguments: {
                        IMAGE_ID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://40code-cdn.zq990.com/static/internalapi/asset/0214ed33dab7c5614594feecd44e5e4f.jpg'
                        },
                        SX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        SY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        sw: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        sh: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        w: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        h: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'iw',
                    blockType: BlockType.REPORTER,
                    text: '图片([IMAGE_ID])宽度',
                    arguments: {
                        IMAGE_ID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://40code-cdn.zq990.com/static/internalapi/asset/0214ed33dab7c5614594feecd44e5e4f.jpg'
                        },
                    }
                },
                {
                    opcode: 'ih',
                    blockType: BlockType.REPORTER,
                    text: '图片([IMAGE_ID])高度',
                    arguments: {
                        IMAGE_ID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://40code-cdn.zq990.com/static/internalapi/asset/0214ed33dab7c5614594feecd44e5e4f.jpg'
                        },
                    }
                },
                
                ,{
                    opcode: 'drawv',
                    blockType: BlockType.COMMAND,
                    text: '绘制视频当前帧([IMAGE_ID],[X],[Y])',
                    arguments: {
                        IMAGE_ID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://sccode.52msr.cn/vedio/sea.mp4'
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'drawv2',
                    blockType: BlockType.COMMAND,
                    text: '绘制视频当前帧([IMAGE_ID] X[X] Y[Y] 宽度[w] 高度[h])',
                    arguments: {
                        IMAGE_ID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://40code-cdn.zq990.com/static/internalapi/asset/0214ed33dab7c5614594feecd44e5e4f.jpg'
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        w: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        h: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'drawv3',
                    blockType: BlockType.COMMAND,
                    text: '绘制视频当前帧([IMAGE_ID] 起始X[SX] Y[SY] 宽度[sw] 高度[sh]；结束X[X] Y[Y] 宽度[w] 高度[h])',
                    arguments: {
                        IMAGE_ID: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://40code-cdn.zq990.com/static/internalapi/asset/0214ed33dab7c5614594feecd44e5e4f.jpg'
                        },
                        SX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        SY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        sw: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        sh: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        w: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        h: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'scale',
                    blockType: BlockType.COMMAND,
                    text: 'scale([SCALE_W],[SCALE_H])',
                    arguments: {
                        SCALE_W: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1.0'
                        },
                        SCALE_H: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1.0'
                        }
                    }
                },
                {
                    opcode: 'rotate',
                    blockType: BlockType.COMMAND,
                    text: 'rotate([ANGLE])',
                    arguments: {
                        ANGLE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'translate',
                    blockType: BlockType.COMMAND,
                    text: 'translate([X],[Y])',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'transform',
                    blockType: BlockType.COMMAND,
                    text: 'transform([A],[B],[C],[D],[E],[F])',
                    arguments: {
                        A: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        B: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        C: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        D: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        E: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        F: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'clearTransform',
                    blockType: BlockType.COMMAND,
                    text: 'clearTransform'
                },
                {
                    opcode: 'save',
                    blockType: BlockType.COMMAND,
                    text: 'save'
                },
                {
                    opcode: 'restore',
                    blockType: BlockType.COMMAND,
                    text: 'restore'
                },
                {
                    opcode: 'setGlobalAlpha',
                    blockType: BlockType.COMMAND,
                    text: 'setGlobalAlpha([ALPHA])',
                    arguments: {
                        ALPHA: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1.0'
                        }
                    }
                },
                {
                    opcode: 'setGlobalCompositeOperation',
                    blockType: BlockType.COMMAND,
                    text: 'setGlobalCompositeOperation([CompositeOperation])',
                    arguments: {
                        CompositeOperation: {
                            type: ArgumentType.STRING,
                            defaultValue: 'source-over'
                        }
                    }
                },
                {
                    opcode: 'switchCanvas',
                    blockType: BlockType.COMMAND,
                    text: 'switchCanvas([NUMBER])',
                    arguments: {
                        NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'stampOnStage',
                    blockType: BlockType.COMMAND,
                    text: '显示canvas内容'
                },
                {
                    opcode: 'stampOnStageDev',
                    blockType: BlockType.COMMAND,
                    text: '显示canvas内容([ox],[oy],[ox2],[oy2])',
                    arguments: {
                        ox: {
                            type: ArgumentType.STRING,
                            defaultValue: '0'
                        },
                        oy: {
                            type: ArgumentType.STRING,
                            defaultValue: '0'
                        },
                        ox2: {
                            type: ArgumentType.STRING,
                            defaultValue: '480'
                        },
                        oy2: {
                            type: ArgumentType.STRING,
                            defaultValue: '360'
                        }
                    }
                },
                {
                    opcode: 'setLineDash',
                    blockType: BlockType.COMMAND,
                    text: 'setLineDash([c1],[c])',
                    arguments: {
                        c1: {
                            type: ArgumentType.STRING,
                            defaultValue: '20'
                        },
                        c: {
                            type: ArgumentType.STRING,
                            defaultValue: '5'
                        }
                    }
                },
                {
                    opcode: 'lineDashOffset',
                    blockType: BlockType.COMMAND,
                    text: 'setlineDashOffset[c]',
                    arguments: {
                        c: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'strokeRect',
                    blockType: BlockType.COMMAND,
                    text: 'setstrokeRect([c1],[c2],[c3],[c4])',
                    arguments: {
                        c1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        c2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        c3: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        c4: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },/*
                {
                    opcode: 'createLinearGradient',
                    blockType: BlockType.COMMAND,
                    text: 'createLinearGradient([c1],[c2],[c3],[c4])',
                    arguments: {
                        c1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        c2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        c3: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        c4: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'addColorStop',
                    blockType: BlockType.COMMAND,
                    text: 'addColorStop([c1],[c2])',
                    arguments: {
                        c1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        c2: {
                            type: ArgumentType.STRING,
                            defaultValue: '#00FF00'
                        }
                       
                    }
                },
                {
                    opcode: 'fillss',
                    blockType: BlockType.COMMAND,
                    text: '设置填充颜色为渐变'
                },*/
                {
                    opcode: 'fillRect',
                    blockType: BlockType.COMMAND,
                    text: 'fillRect([c1],[c2],[c3],[c4])',
                    arguments: {
                        c1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        c2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        c3: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        c4: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'shadowBlur',
                    blockType: BlockType.COMMAND,
                    text: 'setshadowBlur[c1]',
                    arguments: {
                        c1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'shadowColor',
                    blockType: BlockType.COMMAND,
                    text: 'setshadowColor[c1]',
                    arguments: {
                        c1: {
                            type: ArgumentType.STRING,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'shadowOffsetX',
                    blockType: BlockType.COMMAND,
                    text: 'setshadowOffsetX[c1]',
                    arguments: {
                        c1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'shadowOffsetY',
                    blockType: BlockType.COMMAND,
                    text: 'setshadowOffsetY[c1]',
                    arguments: {
                        c1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'textAlign',
                    blockType: BlockType.COMMAND,
                    text: 'settextAlign[c1]',
                    arguments: {
                        c1: {
                            type: ArgumentType.STRING,
                            defaultValue: 'left'
                        }
                    }
                },
                {
                    opcode: 'getcolor',
                    blockType: BlockType.REPORTER,
                    text: '获取canvas第[c]个像素点颜色[color]',
                    arguments: {
                        color: {
                            type: ArgumentType.STRING,
                            menu: 'color',
                            defaultValue: 'red'
                        },
                        c: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1'
                        }
                    }
                },
                {
                    opcode: 'saveccolor',
                    blockType: BlockType.COMMAND,
                    text: '保存canvas颜色',
                },
                {
                    opcode: 'setccolor',
                    blockType: BlockType.COMMAND,
                    text: '设置canvas第[c]个像素点颜色[color][c2]',
                    arguments: {
                        color: {
                            type: ArgumentType.STRING,
                            menu: 'color2',
                            defaultValue: 'red'
                        },
                        c: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1'
                        },
                        c2:{
                            type: ArgumentType.NUMBER,
                            defaultValue: '144'
                        }
                    }
                },
                {
                    opcode: 'isin',
                    blockType: BlockType.BOOLEAN,
                    text: 'x[x],[y]在当前路径上吗',
                    arguments: {
                        x: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1'
                        },
                        y:{
                            type: ArgumentType.NUMBER,
                            defaultValue: '144'
                        }
                    }
                },
                {
                    opcode: 'showccolor',
                    blockType: BlockType.COMMAND,
                    text: '显示保存的颜色',
                },
                
            ],
            menus: {
                color:['red','green','blue','alpha','全部'],
                color2:['red','green','blue','alpha'],
            }
        };
    }

    _createCanvas() {
        var penSkinId = vm.runtime.ext_pen._penSkinId;
        this.runtime.penSkinId = penSkinId;
        if (penSkinId == undefined) return null;
        var penSkin = this.runtime.renderer._allSkins[penSkinId];
        var size = penSkin.size;
        var w = size[0];
        var h = size[1];
        var tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = w;
        tmpCanvas.height = h;
        var tmpCtx = tmpCanvas.getContext("2d");
        return {
            canvas: tmpCanvas,
            ctx: tmpCtx
        };
    }

    _getContext(idx) {
        if (!this._ctx) {
            this._canvasList = [];
            for (var i = 0; i < 8; i++) this._canvasList.push(null);
            var tmpCanvas = this._createCanvas();
            if (!tmpCanvas) return null;
            this._canvasList[0] = tmpCanvas;
            this._canvas = tmpCanvas.canvas;
            this._ctx = tmpCanvas.ctx;
            this._bufferedImages = {};

            this._skinId = this.runtime.renderer.createBitmapSkin(this._createCanvas().canvas, 1);
            this._drawableId = this.runtime.renderer.createDrawable(StageLayering.PEN_LAYER);
            this.runtime.renderer.updateDrawableSkinId(this._drawableId, this._skinId);
            this.runtime.renderer.updateDrawableVisible(this._drawableId, false);
        }
        if (idx != null) {
            var tmpCanvas = this._canvasList[idx];
            if (!tmpCanvas) {
                tmpCanvas = this._createCanvas();
                this._canvasList[idx] = tmpCanvas;
            }
            this._canvas = tmpCanvas.canvas;
            this._ctx = tmpCanvas.ctx;
        }
        return this._ctx;
    }

    beginPath() {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.beginPath();
    }

    closePath() {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.closePath();
    }

    moveTo(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        ctx.moveTo(x, y);
    }

    lineTo(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        ctx.lineTo(x, y);
    }

    rect(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const w = Cast.toNumber(args.W);
        const h = Cast.toNumber(args.H);
        ctx.rect(x, y, w, h);
    }

    arc(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const radius = Cast.toNumber(args.RADIUS);
        const startAngle = Cast.toNumber(args.START_ANGLE);
        const endAngle = Cast.toNumber(args.END_ANGLE);
        ctx.arc(x, y, radius, startAngle, endAngle);
    }

    clip() {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.clip();
    }

    setLineWidth(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const lineWidth = args.LINE_WIDTH;
        ctx.lineWidth = lineWidth;
    }

    setLineCap(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const lineCap = args.LINE_CAP;
        ctx.lineCap = lineCap;
    }

    setStrokeStyle(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const strokeStyle = args.STROKE_STYLE;
        ctx.strokeStyle = strokeStyle;
    }

    setFillStyle(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const fillStyle = args.FILL_STYLE;
        ctx.fillStyle = fillStyle;
    }

    stroke() {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.stroke();
    }

    fill() {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.fill();
    }

    setFont(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const font = args.FONT;
        ctx.font = font;
    }

    strokeText(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const text = args.TEXT;
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        ctx.strokeText(text, x, y);
    }

    fillText(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const text = args.TEXT;
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        ctx.fillText(text, x, y);
    }

    measureText(args, util) {
        try {
            const ctx = this._getContext();
            if (!ctx) return;
            const text = args.TEXT;
            return ctx.measureText(text).width;
        } catch (error) {
            console.log(error)
        }

    }

    clearRect(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const w = Cast.toNumber(args.W);
        const h = Cast.toNumber(args.H);
        ctx.clearRect(x, y, w, h);
    }
    loadImage(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const imageId = args.IMAGE_ID;
        if (!this._bufferedImages[imageId]) {
            return new Promise(resolve => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    this._bufferedImages[imageId] = img;
                    resolve();
                };
                img.onerror = () => {
                    resolve();
                };
                var extUtils = this.runtime.extUtils;
                img.src = /*extUtils.getAssetFetchUrl(*/imageId;//);
            });
        }
    }
    // drawImage(args, util) {
    //     const ctx = this._getContext();
    //     if (!ctx) return;
    //     const imageId = Cast.toString(args.IMAGE_ID);
    //     const x = Cast.toNumber(args.X);
    //     const y = Cast.toNumber(args.Y);
    //     var img = new Image();
    //     console.log('draw');
    //     img.onload = function(){
    //         console.log('图片加载完毕');
            
    //         // 将图片画到canvas上面上去！
    //         ctx.drawImage(img,100,100);
    //     }

    //     img.src = imageId;
    // }
    drawImage(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const imageId = Cast.toString(args.IMAGE_ID);
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        if (imageId.length > 10) {
            const img = this._bufferedImages[imageId];
            if (!img) return;
            ctx.drawImage(img, x, y);
        } else {
            var idx = Math.min(Math.max(0, Cast.toNumber(args.IMAGE_ID)), 7);
            var tmpCanvas = this._canvasList[idx];
            if (tmpCanvas) ctx.drawImage(tmpCanvas.canvas, x, y);
        }
    }
    drawImage2(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const imageId = Cast.toString(args.IMAGE_ID);
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const w = Cast.toNumber(args.w);
        const h = Cast.toNumber(args.h);
        if (imageId.length > 10) {
            const img = this._bufferedImages[imageId];
            if (!img) return;
            ctx.drawImage(img, x, y, w, h);
        } else {
            var idx = Math.min(Math.max(0, Cast.toNumber(args.IMAGE_ID)), 7);
            var tmpCanvas = this._canvasList[idx];
            if (tmpCanvas) ctx.drawImage(tmpCanvas.canvas, x, y, w, h);
        }
    }
    drawImage3(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const imageId = Cast.toString(args.IMAGE_ID);
        const sx = Cast.toNumber(args.SX);
        const sy = Cast.toNumber(args.SY);
        const sw = Cast.toNumber(args.sw);
        const sh = Cast.toNumber(args.sh);
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const w = Cast.toNumber(args.w);
        const h = Cast.toNumber(args.h);
        if (imageId.length > 10) {
            const img = this._bufferedImages[imageId];
            if (!img) return;
            ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        } else {
            var idx = Math.min(Math.max(0, Cast.toNumber(args.IMAGE_ID)), 7);
            var tmpCanvas = this._canvasList[idx];
            if (tmpCanvas) ctx.drawImage(tmpCanvas.canvas, sx, sy, sw, sh, x, y, w, h);
        }
    }
    iw(args){
        const ctx = this._getContext();
        if (!ctx) return;
        const imageId = Cast.toString(args.IMAGE_ID);
        if (imageId.length > 10) {
            const img = this._bufferedImages[imageId];
            if (!img) return;
            return img.width;
        } else {
            var idx = Math.min(Math.max(0, Cast.toNumber(args.IMAGE_ID)), 7);
            var tmpCanvas = this._canvasList[idx];
            if (tmpCanvas) return tmpCanvas.canvas.width;
        }
    }
    ih(args){
        const ctx = this._getContext();
        if (!ctx) return;
        const imageId = Cast.toString(args.IMAGE_ID);
        if (imageId.length > 10) {
            const img = this._bufferedImages[imageId];
            if (!img) return;
            return img.height;
        } else {
            var idx = Math.min(Math.max(0, Cast.toNumber(args.IMAGE_ID)), 7);
            var tmpCanvas = this._canvasList[idx];
            if (tmpCanvas) return tmpCanvas.canvas.height;
        }
    }
    _ad(){
        if(!temp2['music']){
            temp2['music']={};
        }
    }
    drawv(args, util) {
        try{
            const ctx = this._getContext();
            if (!ctx) return;
            const mp3 = Cast.toString(args.IMAGE_ID);
            const x = Cast.toNumber(args.X);
            const y = Cast.toNumber(args.Y);
            this._ad();
            if(temp2['music'][mp3])
            ctx.drawImage(temp2['music'][mp3], x, y);
        }catch(e){
            console.log(e);

        }
    }
    drawv2(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const mp3 = Cast.toString(args.IMAGE_ID);
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const w = Cast.toNumber(args.w);
        const h = Cast.toNumber(args.h);
        this._ad();
        if(temp2['music'][mp3])
        ctx.drawImage(temp2['music'][mp3], x, y, w, h);
    }
    drawv3(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const mp3 = Cast.toString(args.IMAGE_ID);
        const sx = Cast.toNumber(args.SX);
        const sy = Cast.toNumber(args.SY);
        const sw = Cast.toNumber(args.sw);
        const sh = Cast.toNumber(args.sh);
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const w = Cast.toNumber(args.w);
        const h = Cast.toNumber(args.h);
        this._ad();
        if(temp2['music'][mp3])
        ctx.drawImage(temp2['music'][mp3], sx, sy, sw, sh, x, y, w, h);
    }

    // loadImage(args, util) {
    //     const ctx = this._getContext();
    //     if (!ctx) return;
    //     const str = args.IMAGE_ID;
    //     var strAscii = new Array();//用于接收ASCII码
    //     for(var i = 0 ; i < str.length ; i++ ){
    //     strAscii[i] = str.charCodeAt(i);//只能把字符串中的字符一个一个的解码
    //     }
    //     var getAscii = "img";//把这些ASCII码按顺序排列
    //     for(var i = 0 ; i < strAscii.length ; i++ ){
    //     getAscii += strAscii[i];
    //     }
    //     if(!$('#'+getAscii).length)
    //     $('html').append('<img src="'+str+'" style="display:none" id="'+getAscii+'"/>');
    //     /*$('#'+getAscii).onload = async function(){

    //     }
    //     //await
    //     //alert("这些字符的ASCII码依次是："+getAscii);//输出结果给人看
    //     /*if (!this._bufferedImages[imageId]) {
    //         return new Promise(resolve => {
    //             const img = new Image();
    //             img.crossOrigin = "anonymous";
    //             img.onload = () => {
    //                 this._bufferedImages[imageId] = img;
    //                 resolve();
    //             };
    //             img.onerror = () => {
    //                 resolve();
    //             };
    //             var extUtils = this.runtime.extUtils;
    //             img.src = extUtils.getAssetFetchUrl(imageId);
    //         });
    //     }*/
    // }

    // drawImage(args, util) {
    //     const ctx = this._getContext();
    //     if (!ctx) return;
    //     const str = Cast.toString(args.IMAGE_ID);
    //     const x = Cast.toNumber(args.X);
    //     const y = Cast.toNumber(args.Y);
    //     //const str = args.IMAGE_ID;
    //     var strAscii = new Array();//用于接收ASCII码
    //     for(var i = 0 ; i < str.length ; i++ ){
    //     strAscii[i] = str.charCodeAt(i);//只能把字符串中的字符一个一个的解码
    //     }
    //     var getAscii = "img";//把这些ASCII码按顺序排列
    //     for(var i = 0 ; i < strAscii.length ; i++ ){
    //     getAscii += strAscii[i];
    //     }
    //     var img=$('#'+getAscii).length;
    //     console.log(img,$('#'+getAscii))
    //     if(img);
        
    //     //ctx.drawImage($('#'+getAscii), x, y);
    //     //else
    //     //$('html').append('<img src="'+str+'" style="display:none" id="'+getAscii+'"/>');
    //     /*if (imageId.length > 10) {
    //         const img = this._bufferedImages[imageId];
    //         if (!img) return;
    //         ctx.drawImage(img, x, y);
    //     } else {
    //         var idx = Math.min(Math.max(0, Cast.toNumber(args.IMAGE_ID)), 7);
    //         var tmpCanvas = this._canvasList[idx];
    //         if (tmpCanvas) ctx.drawImage(tmpCanvas.canvas, x, y);
    //     }*/
    // }

    scale(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const scaleW = Cast.toNumber(args.SCALE_W);
        const scaleH = Cast.toNumber(args.SCALE_H);
        ctx.scale(scaleW, scaleH);
    }

    rotate(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const angle = Cast.toNumber(args.ANGLE);
        ctx.rotate(angle);
    }

    translate(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        ctx.translate(x, y);
    }

    transform(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const a = Cast.toNumber(args.A);
        const b = Cast.toNumber(args.B);
        const c = Cast.toNumber(args.C);
        const d = Cast.toNumber(args.D);
        const e = Cast.toNumber(args.E);
        const f = Cast.toNumber(args.F);
        ctx.transform(a, b, c, d, e, f);
    }

    clearTransform(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    save() {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.save();
    }

    restore() {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.restore();
    }

    setGlobalAlpha(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const alpha = Cast.toNumber(args.ALPHA);
        ctx.globalAlpha = alpha;
    }

    setGlobalCompositeOperation(args, util) {
        const ctx = this._getContext();
        if (!ctx) return;
        const compositeOperation = args.CompositeOperation;
        ctx.globalCompositeOperation = compositeOperation;
    }

    switchCanvas(args, util) {
        const number = Math.min(Math.max(0, Cast.toNumber(args.NUMBER)), 7);
        const ctx = this._getContext(number); //使用指定编号获取ctx时会自动设置为当前ctx
    }

    stampOnStage() {
        const ctx = this._getContext();
        if (!ctx) return;

        var imageData = ctx.getImageData(0, 0, 480, 360);
        var skin = this.runtime.renderer._allSkins[this._skinId];
        skin._setTexture(imageData);
        this.runtime.renderer.penStamp(this.runtime.penSkinId, this._drawableId);
        this.runtime.requestRedraw();
    }
    stampOnStageDev({ox,oy,ox2,oy2}) {
        const ctx = this._getContext();
        if (!ctx) return;

        var imageData = ctx.getImageData(ox, oy,ox2,oy2);
        var skin = this.runtime.renderer._allSkins[this._skinId];
        skin._setTexture(imageData);
        this.runtime.renderer.penStamp(this.runtime.penSkinId, this._drawableId);
        this.runtime.requestRedraw();
    }

    setLineDash(a) {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.setLineDash([a.c1,a.c]);
    }
    lineDashOffset(a) {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.lineDashOffset=a.c;
    }
    strokeRect(a) {
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.strokeRect(a.c1,a.c2,a.c3,a.c4);
    }
    createLinearGradient(a) {
        const ctx = this._getContext();
        if (!ctx) return;
        grd=ctx.createLinearGradient(a.c1,a.c2,a.c3,a.c4);
    }
    addColorStop(a){
        const ctx = this._getContext();
        if (!ctx) return;
        try{
            grd.addColorStop(a.c1,a.c2);
        }catch{}
    }
    fillss(a){
        const ctx = this._getContext();
        if (!ctx) return;
        try{
            cxt.fillStyle=grd;
        }catch{}
    }
    fillRect(a){
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.fillRect(a.c1,a.c2,a.c3,a.c4);
    }
    shadowBlur(a){
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.shadowBlur=a.c1;
    }
    shadowColor(a){
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.shadowColor=a.c1;
    }
    shadowOffsetX(a){
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.shadowOffsetX=a.c1;
    }
    shadowOffsetY(a){
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.shadowOffsetY=a.c1;
    }
    textAlign(a){
        const ctx = this._getContext();
        if (!ctx) return;
        ctx.textAlign=a.c1;
    }
    getcolor(a){
        const ctx = this._getContext();
        if (!ctx) return;
        var imageData = (ctx.getImageData(0, 0, 480, 360))['data'];
        //console.log(imageData);
        var aa={
            'red':0,
            'green':1,
            'blue':2,
            'alpha':3
        };
        if(a.color=="全部"){
            var n=a.c*4;
            var ddd='rgba('+imageData[n]+','+imageData[n+1]+','+imageData[n+2]+','+imageData[n+3]+')';
            console.log(ddd);
            return ddd;
        } 
        else{
            var n=a.c*4+aa[a.color];
            return imageData[n];
        }
    }
    setccolor(a){
        const ctx = this._getContext();
        if (!ctx) return;
        if (!temp2.color) return;
        var imageData = temp2.color;
        console.log(imageData);
        var aa={
            'red':0,
            'green':1,
            'blue':2,
            'alpha':3
        };
        var n=a.c*4+aa[a.color];
        temp2.color.data[n]=a.c2;
        //return imageData[n];
    }
    saveccolor(a){
        const ctx = this._getContext();
        if (!ctx) return;
        temp2.color=(ctx.getImageData(0, 0, 480, 360));//['data'];
    }
    showccolor(a){
        const ctx = this._getContext();
        if (!ctx) return;
        if (!temp2.color) return;
        ctx.putImageData(temp2.color,0,0);
        
    }
    isin(a){
        try{
            return isPointInPath(a.x,a.y);
        }catch(e){
            return '';
        }
        
    }
}

module.exports = Scratch3CanvasBlocks;