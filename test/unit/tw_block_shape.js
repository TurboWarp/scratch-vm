const {test} = require('tap');
const Runtime = require('../../src/engine/runtime');
const Scratch = require('../../src/extension-support/tw-extension-api-common');

test('blockShape', t => {
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
    t.equal(json.length, 3);
    t.equal(json[0].outputShape, 1);
    t.equal(json[1].outputShape, 2);
    t.equal(json[2].outputShape, 3);
    t.end();
});
