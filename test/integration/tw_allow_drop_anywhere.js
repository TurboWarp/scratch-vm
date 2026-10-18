const {test} = require('node:test');
const Runtime = require('../../src/engine/runtime');
const BlockType = require('../../src/extension-support/block-type');

test('allowDropAnywhere', (t, done) => {
    t.plan(2);

    const rt = new Runtime();

    rt.on('EXTENSION_ADDED', json => {
        t.assert.strictEqual(json.blocks[0].json.output, 'String');
        t.assert.strictEqual(json.blocks[1].json.output, null);
        done();
    });

    rt._registerExtensionPrimitives({
        id: 'testextension',
        name: 'test',
        blocks: [
            {
                opcode: 'drop1',
                text: 'drop not anywhere',
                blockType: BlockType.REPORTER
            },
            {
                opcode: 'drop2',
                text: 'drop anywhere',
                blockType: BlockType.REPORTER,
                allowDropAnywhere: true
            }
        ]
    });
});
