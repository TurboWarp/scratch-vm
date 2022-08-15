const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const Clone = require('../../util/clone');
const Color = require('../../util/color');
const formatMessage = require('format-message');
const MathUtil = require('../../util/math-util');
const RenderedTarget = require('../../sprites/rendered-target');
const log = require('../../util/log');

class Scratch3DeviceInfoBlocks {
    constructor(runtime) {


        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'deviceinfo',
            name: 'DeviceInfo',
            blocks: [{
                    opcode: 'isMobile',
                    blockType: BlockType.BOOLEAN,
                    text: '用户设备是移动设备?',
                }
                ,{
                    opcode: 'isPC',
                    blockType: BlockType.BOOLEAN,
                    text: '用户设备是PC设备?',
                },
                {
                    opcode: 'isTouchDeivce',
                    blockType: BlockType.BOOLEAN,
                    text: '用户设备是触屏设备?',
                },
                {
                    opcode: 'isDackMode',
                    blockType: BlockType.BOOLEAN,
                    text: '用户处于暗黑模式?',
                },
                {
                    opcode: 'getUserAgent',
                    blockType: BlockType.REPORTER,
                    text: '获取用户设备的UserAgent',
                },
                {
                    opcode: 'getScreensizex',
                    blockType: BlockType.REPORTER,
                    text: '获取用户屏幕横向长度(单位:像素)',
                    }
                ,{
                    opcode: 'getScreensizey',
                    blockType: BlockType.REPORTER,
                    text: '获取用户屏幕纵向长度(单位:像素)',
                },
                
            ],
        };
    }
    // 以下代码来自https://blog.csdn.net/Marcuslu/article/details/121415370
    isMobile(args, util){
        if(window.navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)) {
          return true; // 移动端
        }else{
          return false; // PC端
        }
    }

    isPC(args, util){
        if(window.navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)) {
          return false; // 移动端
        }else{
          return true; // PC端
        }
    }

    isTouchDeivce(args, util){
        return 'ontouchstart' in document.documentElement;
    }

    getUserAgent(args, util){
        return navigator.userAgent;
    }

    isDackMode(args, util){ 
        return window.matchMedia('(prefers-color-scheme: dark)').matches; //唔唔唔 暗黑模式
    }

    getScreensizex(args, util) {
        return screen.width;
    }

    getScreensizey(args, util) {
        return screen.height;
    }
}


module.exports = Scratch3DeviceInfoBlocks;