class ScbackendBasicExtension {
    constructor(runtime) {
        this.runtime = runtime;
    }

    getInfo() {
        const basicblocks = [
            {
                opcode: 'newconnect',
                blockType: 'event',
                text: '当新的连接收到',
                isEdgeActivated: false
            },
            {
                opcode: 'lastconnect',
                blockType: 'reporter',
                text: '最后一次连接的id',
            },
            {
                opcode: 'message',
                blockType: 'event',
                text: '当 [connectid] 收到消息',
                arguments: {
                    connectid: {
                        type: 'string',
                        defaultValue: 'connectid',
                    }
                },
                isEdgeActivated: false
            },
            {
                opcode: 'sendmessage',
                blockType: 'command',
                text: '向 [connectid] 发送消息 [message]',
                arguments: {
                    connectid: {
                        type: 'string',
                        defaultValue: 'connectid',
                    },
                    message: {
                        type: 'string',
                        defaultValue: 'message',
                    }
                }
            },
            {
                opcode: 'getdata',
                blockType: 'reporter',
                text: '收到的数据'
            },
            {
                opcode: 'log',
                blockType: 'command',
                text: '打印 [message] 到控制台',
                arguments: {
                    message: {
                        type: 'string',
                        defaultValue: 'message',
                    }
                }
            }
        ];
        return {
            id: 'scbackendbasic',
            name: 'scbackend基础接口',
            blocks: basicblocks
        };
    }

    lastconnect(args, util) {
        if (!this.runtime || !this.runtime.scbackend) {
            return '';
        }
        return util.thread.getParam('lastconnect') || '';
    }

    sendmessage(args) {
        const { connectid, message } = args;
        if (!this.runtime || !this.runtime.scbackend) {
            return;
        }
        this.runtime.scbackend.send('message', {dst: connectid, body: message});
    }

    getdata(args, util) {
        if (!this.runtime || !this.runtime.scbackend) {
            return '';
        }
        return util.thread.getParam('data') || '';
    }
    log(args) {
        const { message } = args;
        if (!this.runtime || !this.runtime.scbackend) {
            return;
        }
        this.runtime.scbackend.send('log', {body: message});
    }
}

if (typeof Scratch !== 'undefined') {
    Scratch.extensions.register(new ScbackendBasicExtension());
} else {
    module.exports = ScbackendBasicExtension;
}
