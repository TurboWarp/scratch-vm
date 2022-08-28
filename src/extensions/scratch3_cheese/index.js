const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const Clone = require('../../util/clone');
const Color = require('../../util/color');
const formatMessage = require('format-message');
const MathUtil = require('../../util/math-util');
const RenderedTarget = require('../../sprites/rendered-target');
const log = require('../../util/log');


fileContent = null;

function xml_parse(input) {
    //支持chrome IE10  
    if (window.FileReader) {
        var file = input.files[0];
        var reader = new FileReader();
        reader.onload = function (event) {

        }
        reader.readAsText(file);
        console.log(reader.result);
    }
}

function xml_openSelectionBox() {
    var inputObj = document.createElement('input')
    inputObj.setAttribute('id', 'my_inputObj');
    inputObj.setAttribute('type', 'file');
    inputObj.setAttribute("style", 'visibility:hidden');
    document.body.appendChild(inputObj);

    inputObj.onchange = xml_parse(inputObj);//选中文件时触发的方法
    inputObj.click();
}


class Scratch3CheeseInfoBlocks {
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
            id: 'cheese',
            name: 'Cheese',
            blocks: [
                {
                    opcode: 'getTextFile',
                    blockType: BlockType.REPORTER,
                    text: '获取一个后缀为 [SUFFIX] 且编码方式为 [BMFS] 的文本文件的内容',
                    arguments: {
                        SUFFIX: {
                            type: ArgumentType.STRING,
                            defaultValue: 'txt',
                        },
                        BMFS: {
                            type: ArgumentType.STRING,
                            defaultValue: 'UTF-8',
                        },
                    }
                },
                {
                    opcode: 'saveTextFile',
                    blockType: BlockType.REPORTER,
                    text: '保存一个后缀为 [SUFFIX] 且内容为 [CONTENT] 、编码方式为 [BMFS] 的文本文件',
                    arguments: {
                        SUFFIX: {
                            type: ArgumentType.STRING,
                            defaultValue: 'TFG',
                        },
                        CONTENT: {
                            type: ArgumentType.STRING,
                            defaultValue: '唔唔唔给我9999999金币！',
                        },
                        BMFS: {
                            type: ArgumentType.STRING,
                            defaultValue: 'UTF-8',
                        }
                    }
                },
            ]
        }
    }


    getTextFile(args, util) {

        var inputObj = document.createElement('input')
        inputObj.setAttribute('id', 'inputObj');
        inputObj.setAttribute('type', 'file');
        inputObj.setAttribute("style", 'visibility:hidden');
        document.body.appendChild(inputObj);
        var fileReader = new FileReader();
        inputObj.onchange = () => {
            fileReader.onload = () => {
                fileContent = fileReader.result;
            }
            fileReader.readAsText(inputObj.files[0]);
            console.log(fileReader.readAsText(inputObj.files[0]));
        }

        inputObj.click();


        return fileReader.result;


    }
}

module.exports = Scratch3CheeseInfoBlocks;