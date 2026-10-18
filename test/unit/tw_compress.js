const {test} = require('node:test');
const assert = require('node:assert');
const compress = require('../../src/serialization/tw-compress-sb3');
const uid = require('../../src/util/uid');

test('handles type INPUT_DIFF_BLOCK_SHADOW (3) compressed inputs', () => {
    const data = {
        targets: [
            {
                isStage: true,
                name: 'Stage',
                variables: {},
                lists: {},
                broadcasts: {},
                blocks: {
                    'CmRa^i]o}QL77;hk:54o': {
                        opcode: 'looks_switchbackdropto',
                        next: null,
                        parent: null,
                        inputs: {
                            BACKDROP: [
                                3,
                                'cq84G6uywD{m2R,E03Ci',
                                'E3/*4H*xk38{=*U;bVWm'
                            ]
                        },
                        fields: {},
                        shadow: false,
                        topLevel: true,
                        x: 409,
                        y: 300
                    },
                    'cq84G6uywD{m2R,E03Ci': {
                        opcode: 'operator_not',
                        next: null,
                        parent: 'CmRa^i]o}QL77;hk:54o',
                        inputs: {},
                        fields: {},
                        shadow: false,
                        topLevel: false
                    },
                    'E3/*4H*xk38{=*U;bVWm': {
                        opcode: 'looks_backdrops',
                        next: null,
                        parent: 'CmRa^i]o}QL77;hk:54o',
                        inputs: {},
                        fields: {
                            BACKDROP: [
                                'backdrop1',
                                null
                            ]
                        },
                        shadow: true,
                        topLevel: false
                    }
                },
                comments: {},
                currentCostume: 0,
                costumes: [],
                sounds: [],
                volume: 100,
                layerOrder: 0,
                tempo: 60,
                videoTransparency: 50,
                videoState: 'on',
                textToSpeechLanguage: null
            }
        ],
        monitors: [],
        extensions: [],
        meta: {
            semver: '3.0.0',
            vm: '0.2.0',
            agent: ''
        }
    };
    compress(data);

    const blocks = Object.entries(data.targets[0].blocks);
    assert.strictEqual(blocks.length, 3);

    const [parentId, parentBlock] = blocks.find(i => i[1].opcode === 'looks_switchbackdropto');
    const [inputId, inputBlock] = blocks.find(i => i[1].opcode === 'operator_not');
    const [shadowId, shadowBlock] = blocks.find(i => i[1].opcode === 'looks_backdrops');

    assert.strictEqual(parentBlock.inputs.BACKDROP.length, 3);
    assert.strictEqual(parentBlock.inputs.BACKDROP[0], 3);
    assert.strictEqual(parentBlock.inputs.BACKDROP[1], inputId);
    assert.strictEqual(parentBlock.inputs.BACKDROP[2], shadowId);

    assert.strictEqual(inputBlock.parent, parentId);
    assert.strictEqual(shadowBlock.parent, parentId);
});

test('Compressed IDs will not collide with uncompressed IDs', () => {
    const soup = 'abcdefghjijklmnopqstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
    const items = [
        [soup, '', ''],
        ['', soup, ''],
        ['', '', soup]
    ];
    for (const [variableSoup, listSoup, broadcastSoup] of items) {
        const data = {
            targets: [
                {
                    isStage: true,
                    name: 'Stage',
                    variables: Object.fromEntries(
                        variableSoup.split('').map(id => [id, [id, 0]])
                    ),
                    lists: Object.fromEntries(
                        listSoup.split('').map(id => [id, [id, []]])
                    ),
                    broadcasts: Object.fromEntries(
                        broadcastSoup.split('').map(id => [id, id])
                    ),
                    blocks: {
                        'CmRa^i]o}QL77;hk:54o': {
                            opcode: 'looks_switchbackdropto',
                            next: null,
                            parent: null,
                            inputs: {
                                BACKDROP: [
                                    3,
                                    'cq84G6uywD{m2R,E03Ci',
                                    'E3/*4H*xk38{=*U;bVWm'
                                ]
                            },
                            fields: {},
                            shadow: false,
                            topLevel: true,
                            x: 409,
                            y: 300
                        },
                        'cq84G6uywD{m2R,E03Ci': {
                            opcode: 'operator_not',
                            next: null,
                            parent: 'CmRa^i]o}QL77;hk:54o',
                            inputs: {},
                            fields: {},
                            shadow: false,
                            topLevel: false
                        },
                        'E3/*4H*xk38{=*U;bVWm': {
                            opcode: 'looks_backdrops',
                            next: null,
                            parent: 'CmRa^i]o}QL77;hk:54o',
                            inputs: {},
                            fields: {
                                BACKDROP: [
                                    'backdrop1',
                                    null
                                ]
                            },
                            shadow: true,
                            topLevel: false
                        }
                    },
                    comments: {
                        'ds{.EoY%0^6vO1WH0/9d': {
                            blockId: null,
                            x: 400,
                            y: 401,
                            width: 402,
                            height: 403,
                            minimized: false,
                            text: '4'
                        },
                        'blh[bsi@XtCkGh!-J5aa': {
                            blockId: null,
                            x: 500,
                            y: 501,
                            width: 502,
                            height: 503,
                            minimized: false,
                            text: '5'
                        },
                        '7#YgytOiJHs(Ne6,2i9(': {
                            blockId: null,
                            x: 600,
                            y: 601,
                            width: 602,
                            height: 603,
                            minimized: false,
                            text: '6'
                        }
                    },
                    currentCostume: 0,
                    costumes: [],
                    sounds: [],
                    volume: 100,
                    layerOrder: 0,
                    tempo: 60,
                    videoTransparency: 50,
                    videoState: 'on',
                    textToSpeechLanguage: null
                }
            ],
            monitors: [],
            extensions: [],
            meta: {
                semver: '3.0.0',
                vm: '0.2.0',
                agent: ''
            }
        };
        compress(data);

        const uncompressedIDs = [
            ...Object.keys(data.targets[0].variables),
            ...Object.keys(data.targets[0].lists),
            ...Object.keys(data.targets[0].broadcasts)
        ];
        const compressedIDs = [
            ...Object.keys(data.targets[0].blocks),
            ...Object.keys(data.targets[0].comments)
        ];
        for (const compressedID of compressedIDs) {
            assert.ok(!uncompressedIDs.includes(compressedID), `${compressedID} does not collide`);
        }
    }
});

test('Script execution order is preserved', () => {
    const originalBlocks = {};

    const blockIds = [];
    for (let i = 0; i < 1000; i++) {
        if (i === 339) {
            blockIds.push('muffin');
        } else if (i === 555) {
            blockIds.push('555');
        }
        blockIds.push(uid());
    }
    blockIds.push('apple');
    blockIds.push('-1');
    blockIds.push('45');

    for (const blockId of blockIds) {
        originalBlocks[blockId] = {
            opcode: 'event_whenbroadcastreceived',
            next: null,
            parent: null,
            inputs: {},
            fields: {
                BROADCAST_OPTION: [
                    `broadcast-name-${blockId}`,
                    `broadcast-id-${blockId}`
                ]
            },
            shadow: false,
            topLevel: true,
            x: -10,
            y: 420
        };
    }

    const data = {
        targets: [
            {
                isStage: true,
                name: 'Stage',
                variables: {},
                lists: {},
                broadcasts: {},
                blocks: originalBlocks,
                comments: {},
                currentCostume: 0,
                costumes: [],
                sounds: [],
                volume: 100,
                layerOrder: 0,
                tempo: 60,
                videoTransparency: 50,
                videoState: 'on',
                textToSpeechLanguage: null
            }
        ],
        monitors: [],
        extensions: [],
        meta: {
            semver: '3.0.0',
            vm: '0.2.0',
            agent: ''
        }
    };
    compress(data);

    // Sanity check: Make sure the new object is actually different
    const newBlocks = data.targets[0].blocks;
    assert.notStrictEqual(originalBlocks, newBlocks);
    assert.notDeepEqual(Object.keys(originalBlocks), Object.keys(newBlocks));

    // Check that the order has not changed
    const newBlockValues = Object.values(newBlocks);
    assert.deepEqual(Object.values(originalBlocks), newBlockValues);
    assert.strictEqual(newBlockValues[0].fields.BROADCAST_OPTION[0], 'broadcast-name-45');
    assert.strictEqual(newBlockValues[1].fields.BROADCAST_OPTION[0], 'broadcast-name-555');
    assert.strictEqual(newBlockValues[339 + 2].fields.BROADCAST_OPTION[0], 'broadcast-name-muffin');
    assert.strictEqual(newBlockValues[newBlockValues.length - 2].fields.BROADCAST_OPTION[0], 'broadcast-name-apple');
    assert.strictEqual(newBlockValues[newBlockValues.length - 1].fields.BROADCAST_OPTION[0], 'broadcast-name--1');

    // Check that the new IDs do not look like array indexes as their enumeration
    // order could cause unexpected behavior in other places.
    for (const newBlockId of Object.keys(newBlocks)) {
        // The actual definition of an array index is: https://tc39.es/ecma262/#array-index
        // This approximation is currently good enough
        if (!Number.isNaN(+newBlockId)) {
            assert.fail(`${newBlockId} might be treated as an array index`);
        }
    }
});
