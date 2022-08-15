const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const Clone = require('../../util/clone');
const Color = require('../../util/color');
const MathUtil = require('../../util/math-util');
const RenderedTarget = require('../../sprites/rendered-target');
const log = require('../../util/log');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0i5Zu+5bGCXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSItMjMzIDM1Ni45IDEyOC4zIDEyOCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAtMjMzIDM1Ni45IDEyOC4zIDEyODsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4NCgkuc3Qwe2ZpbGw6IzdGM0Y5ODt9DQo8L3N0eWxlPg0KPHBhdGggY2xhc3M9InN0MCIgZD0iTS0xNDQuOCw0MjQuMWMtMiwwLTMuOCwwLjgtNS4yLDEuOWwtMTkuNi0xMS4xYzAuNC0xLjQsMC42LTIuOCwwLjYtNC4yYzAtMS4yLTAuMS0yLjMtMC41LTMuNWwxMy43LTYuOA0KCWMxLjQsMS40LDMuNSwyLjMsNS42LDIuM2M0LjUsMCw4LjEtMy42LDguMS04LjFjMC00LjUtMy42LTguMS04LjEtOC4xcy04LjEsMy42LTguMSw4LjF2MWwtMTMuNyw2LjhjLTIuNC0zLjEtNi4zLTUuMS0xMC42LTUuMQ0KCWMtNy40LDAtMTMuNCw2LTEzLjQsMTMuNGMwLDUuOCwzLjYsMTAuNiw4LjYsMTIuNWwtMS44LDExLjZjLTMuOCwwLjYtNi43LDQtNi43LDcuOWMwLDQuNSwzLjYsOC4xLDguMSw4LjFzOC4xLTMuNiw4LjEtOC4xDQoJYzAtMy4xLTEuNy01LjYtNC4yLTdsMS45LTExLjhjMy44LTAuMSw3LjMtMS45LDkuNi00LjZsMTkuNiwxMS4xYy0wLjEsMC41LTAuMSwwLjktMC4xLDEuNGMwLDQuNSwzLjYsOC4xLDguMSw4LjENCgljNC41LDAsOC4xLTMuNiw4LjEtOC4xQy0xMzYuNyw0MjcuOC0xNDAuNSw0MjQuMS0xNDQuOCw0MjQuMXoiLz4NCjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0tMTM2LjksMzY0LjdILTIwMWwtMzIsNTUuNmwzMi4xLDU1LjZoNjRsMzIuMS01NS42TC0xMzYuOSwzNjQuN3ogTS0xNDIuOCw0NjUuNmgtNTIuNGwtMjYuMS00NS4zbDI2LjEtNDUuMw0KCWg1Mi40bDI2LjEsNDUuM0MtMTE2LjYsNDIwLjMtMTQyLjgsNDY1LjYtMTQyLjgsNDY1LjZ6Ii8+DQo8L3N2Zz4=';

/**
 * Host for the Pen-related blocks in Scratch 3.0
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */
class Scratch3CommunityBlocks {
    constructor(runtime) {

        this.lastPayTime = 0;
        this._error = '';

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
            id: 'community',
            name: 'Community',
            blockIconURI: blockIconURI,
            blocks: [{
                    opcode: 'getUserInfo',
                    blockType: BlockType.REPORTER,
                    text: '[USER_ATTR]',
                    arguments: {
                        USER_ATTR: {
                            type: ArgumentType.STRING,
                            menu: 'USER_ATTR',
                            defaultValue: 'user level'
                        }
                    }
                },
                {
                    opcode: 'isFollower',
                    blockType: BlockType.BOOLEAN,
                    text: 'is follower?',
                },
                {
                    opcode: 'isProjectLover',
                    blockType: BlockType.BOOLEAN,
                    text: 'love this project?',
                },
                {
                    opcode: 'openUrl',
                    blockType: BlockType.COMMAND,
                    text: 'open [URL]',
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://114514-1919-810.tk'
                        }
                    }
                },
                {
                    opcode: 'redirectUrl',
                    blockType: BlockType.COMMAND,
                    text: 'redirect [URL]',
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://114514-1919-810.tk'
                        }
                    }
                },
                {
                    opcode: 'pay',
                    blockType: BlockType.COMMAND,
                    text: 'pay [AMOUNT] for [ITEM]',
                    arguments: {
                        AMOUNT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '10'
                        },
                        ITEM: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        }
                    }
                },
                {
                    opcode: 'getError',
                    blockType: BlockType.REPORTER,
                    text: 'error',
                }
            ],
            menus: {
                USER_ATTR: ['user id', 'username', 'user level']
            }
        };
    }
    // getUserInfo由于技术问题不予支持
    getUserInfo(args, util) {
        var extUtils = this.runtime.extUtils;
        var loggedInUser = extUtils.getContext().loggedInUser;
        if (!loggedInUser) return "";
        var attr = args.USER_ATTR;
        if (attr == "user id") return loggedInUser.id;
        else if (attr == "username") return loggedInUser.username;
        else if (attr == "user level") return loggedInUser.level;
        else return "";
    }
    // isFollower由于技术问题不予支持
    isFollower() {
        return true;
    }
    // isProjectLover由于技术问题不予支持
    isProjectLover() {
        return true;
    }

    isValidUrl(url) {
        var regex = /^((https|http)?:\/\/(gitblock\.cn|aerfaying\.com)|(\/[^\/]))/;
        return regex.test(url.toLowerCase());
    }

    openUrl(args, util) {
        alert('此时正在打开页面:' + args.URL);
    }

    redirectUrl(args, util) {
        alert('此时正在跳转页面:' + args.URL);
    }
    // pay由于技术问题不予支持
    pay(args, util) {
        alert('此时正在使用' + args.AMOUNT +'金币购买:' + args.ITEM)
    }

    getError(args, util) {
        return '';
    }

}

module.exports = Scratch3CommunityBlocks;