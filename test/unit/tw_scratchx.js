const ScratchXUtilities = require('../../src/extension-support/tw-scratchx-utilities');
const createScratchX = require('../../src/extension-support/tw-scratchx-compatibility-layer');
const {test} = require('node:test');
const assert = require('node:assert');

test('argument index to id', () => {
    assert.strictEqual(ScratchXUtilities.argumentIndexToId(0), '0');
    assert.strictEqual(ScratchXUtilities.argumentIndexToId(1), '1');
    assert.strictEqual(ScratchXUtilities.argumentIndexToId(2), '2');
    assert.strictEqual(ScratchXUtilities.argumentIndexToId(3), '3');
    assert.strictEqual(ScratchXUtilities.argumentIndexToId(39), '39');
    assert.strictEqual(ScratchXUtilities.argumentIndexToId(1000000000), '1000000000');
});

test('generate extension id', () => {
    assert.strictEqual(ScratchXUtilities.generateExtensionId('Spotify'), 'sbxspotify');
    assert.strictEqual(ScratchXUtilities.generateExtensionId('Spo _t ify'), 'sbxspotify');
    assert.strictEqual(ScratchXUtilities.generateExtensionId('Spo _t $#@! 3ify😮'), 'sbxspot3ify');
});

const mockScratchExtensions = () => {
    const mockScratch = {};
    return createScratchX(mockScratch);
};

const convert = (...args) => {
    let registered = null;
    const mockScratch = {
        extensions: {
            register: extensionObject => {
                if (registered) {
                    // In tests we don't want this
                    throw new Error('register() called twice');
                }
                registered = extensionObject;
            }
        }
    };
    const ScratchExtensions = createScratchX(mockScratch);
    ScratchExtensions.register(...args);
    if (!registered) {
        throw new Error('Did not register()');
    }
    return registered;
};

test('register', () => {
    const ScratchExtensions = mockScratchExtensions();
    assert.strictEqual(typeof ScratchExtensions.register, 'function');
});

test('complex extension', async () => {
    let stepsMoved = 0;
    const moveSteps = n => {
        stepsMoved += n;
    };

    let doNothingCalled = false;
    const doNothing = () => {
        doNothingCalled = true;
    };

    const fetch = (url, callback) => {
        callback(`Fetched: ${url}`);
        return 'This value should be ignored.';
    };

    const multiplyAndAppend = (a, b, c) => `${a * b}${c}`;

    const repeat = (string, count, callback) => {
        callback(string.repeat(count));
        return 'This value should be ignored.';
    };

    const touching = (sprite, bool) => sprite === 'Sprite9' && bool === true;

    const converted = convert(
        'My Extension',
        {
            blocks: [
                ['', 'move %n steps', 'moveSteps', 50],
                [' ', 'do nothing', 'doNothing', 100, 200],
                ['w', 'fetch %m:urls1', 'fetch'],
                [' '],
                ['r', 'multiply %n by %n and append %s', 'multiplyAndAppend'],
                ['R', 'repeat %m.myMenu %n', 'repeat', ''],
                ['-'],
                ['b', 'touching %s %b', 'touching', 'Sprite1', 'ignored']
            ],
            menus: {
                myMenu: ['abc', 'def', 123, true, false],
                urls1: ['https://example.com/', 'https://example.org/']
            },
            url: 'https://turbowarp.org/myextensiondocs.html'
        },
        {
            unusedGarbage: 10,
            moveSteps,
            doNothing,
            fetch,
            multiplyAndAppend,
            repeat,
            touching
        }
    );

    const info = converted.getInfo();
    assert.strictEqual(info.id, 'sbxmyextension');
    assert.strictEqual(info.docsURI, 'https://turbowarp.org/myextensiondocs.html');

    assert.deepEqual(info.blocks, [
        {
            opcode: 'moveSteps',
            text: 'move [0] steps',
            blockType: 'command',
            arguments: [
                {
                    type: 'number',
                    defaultValue: 50
                }
            ]
        },
        {
            opcode: 'doNothing',
            text: 'do nothing',
            blockType: 'command',
            arguments: []
        },
        {
            opcode: 'fetch',
            text: 'fetch [0]',
            blockType: 'command',
            arguments: [
                {
                    type: 'string',
                    menu: 'urls1'
                }
            ]
        },
        '---',
        {
            opcode: 'multiplyAndAppend',
            text: 'multiply [0] by [1] and append [2]',
            blockType: 'reporter',
            arguments: [
                {
                    type: 'number',
                    defaultValue: 0
                },
                {
                    type: 'number',
                    defaultValue: 0
                },
                {
                    type: 'string',
                    defaultValue: ''
                }
            ]
        },
        {
            opcode: 'repeat',
            text: 'repeat [0] [1]',
            blockType: 'reporter',
            arguments: [
                {
                    type: 'string',
                    menu: 'myMenu',
                    defaultValue: ''
                },
                {
                    type: 'number',
                    defaultValue: 0
                }
            ]
        },
        '---',
        {
            opcode: 'touching',
            text: 'touching [0] [1]',
            blockType: 'Boolean',
            arguments: [
                {
                    type: 'string',
                    defaultValue: 'Sprite1'
                },
                {
                    type: 'Boolean'
                }
            ]
        }
    ]);

    assert.deepEqual(info.menus, {
        myMenu: {
            items: ['abc', 'def', 123, true, false]
        },
        urls1: {
            items: ['https://example.com/', 'https://example.org/']
        }
    });

    // Now let's make sure that the converter has properly wrapped our functions.
    assert.strictEqual(stepsMoved, 0);
    assert.strictEqual(converted.moveSteps({
        0: 30
    }), undefined);
    assert.strictEqual(stepsMoved, 30);

    assert.strictEqual(doNothingCalled, false);
    assert.strictEqual(converted.doNothing({}), undefined);
    assert.strictEqual(doNothingCalled, true);

    assert.strictEqual(typeof converted.fetch({
        0: 'https://example.com/'
    }).then, 'function');
    assert.strictEqual(await converted.fetch({
        0: 'https://example.com/'
    }), 'Fetched: https://example.com/');

    assert.strictEqual(converted.multiplyAndAppend({
        0: 31,
        1: 7,
        2: 'Cat'
    }), '217Cat');

    assert.strictEqual(typeof converted.repeat({
        0: '',
        1: 0
    }).then, 'function');
    assert.strictEqual(await converted.repeat({
        0: 'scratchx',
        1: 3
    }), 'scratchxscratchxscratchx');

    assert.strictEqual(converted.touching({
        0: 'Sprite1',
        1: true
    }), false);
    assert.strictEqual(converted.touching({
        0: 'Sprite9',
        1: true
    }), true);
    assert.strictEqual(converted.touching({
        0: 'Sprite9',
        1: false
    }), false);
});

test('display name', () => {
    const converted = convert(
        'Internal Name',
        {
            blocks: [],
            displayName: 'Display Name'
        },
        {

        }
    );
    assert.strictEqual(converted.getInfo().name, 'Display Name');
});

test('_getStatus', () => {
    const _getStatus = () => ({
        status: 2,
        msg: 'Ready'
    });
    const converted = convert(
        'Name',
        {
            blocks: []
        },
        {
            _getStatus: _getStatus,
            unusedProperty: 10
        }
    );
    assert.strictEqual(converted._getStatus, _getStatus);
    assert.strictEqual('unusedProperty' in converted, false);
});
