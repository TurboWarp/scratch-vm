const {test} = require('node:test');
const assert = require('node:assert');
const Runtime = require('../../src/engine/runtime');
const Scratch = require('../../src/extension-support/tw-extension-api-common');

test('blockShape', () => {
    const rt = new Runtime();
    rt._registerExtensionPrimitives({
        id: 'shapetest',
        name: 'shapetest',
        blocks: [
            {
                blockType: Scratch.BlockType.REPORTER,
                blockShape: Scratch.BlockShape.HEXAGONAL,
                opcode: 'hexagonal',
                text: 'hexagonal'
            },
            {
                blockType: Scratch.BlockType.BOOLEAN,
                blockShape: Scratch.BlockShape.ROUND,
                opcode: 'round',
                text: 'round'
            },
            {
                blockType: Scratch.BlockType.REPORTER,
                blockShape: Scratch.BlockShape.SQUARE,
                opcode: 'square',
                text: 'square'
            }
        ]
    });

    const json = rt.getBlocksJSON();
    assert.strictEqual(json.length, 3);
    assert.strictEqual(json[0].outputShape, 1);
    assert.strictEqual(json[1].outputShape, 2);
    assert.strictEqual(json[2].outputShape, 3);
});
