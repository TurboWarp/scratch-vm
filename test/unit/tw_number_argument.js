const {test} = require('node:test');
const assert = require('node:assert');
const Runtime = require('../../src/engine/runtime');
const BlockType = require('../../src/extension-support/block-type');
const ArgumentType = require('../../src/extension-support/argument-type');

test('NUMBER argument defaultValue', (t, done) => {
    const runtime = new Runtime();
    runtime.on(Runtime.EXTENSION_ADDED, categoryInfo => {
        /* eslint-disable max-len */
        assert.strictEqual(
            categoryInfo.blocks[0].xml,
            '<block type="testextension_testNone"><value name="a"><shadow type="math_number"></shadow></value></block>'
        );
        assert.strictEqual(
            categoryInfo.blocks[1].xml,
            '<block type="testextension_testEmptyString"><value name="a"><shadow type="math_number"><field name="NUM"></field></shadow></value></block>'
        );
        assert.strictEqual(
            categoryInfo.blocks[2].xml,
            '<block type="testextension_testZeroString"><value name="a"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block>'
        );
        assert.strictEqual(
            categoryInfo.blocks[3].xml,
            '<block type="testextension_testZeroNumber"><value name="a"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block>'
        );
        /* eslint-enable max-len */
        done();
    });
    runtime._registerExtensionPrimitives({
        id: 'testextension',
        blocks: [
            {
                type: BlockType.COMMAND,
                opcode: 'testNone',
                text: 'block [a]',
                arguments: {
                    a: {
                        type: ArgumentType.NUMBER
                    }
                }
            },
            {
                type: BlockType.COMMAND,
                opcode: 'testEmptyString',
                text: 'block [a]',
                arguments: {
                    a: {
                        type: ArgumentType.NUMBER,
                        defaultValue: ''
                    }
                }
            },
            {
                type: BlockType.COMMAND,
                opcode: 'testZeroString',
                text: 'block [a]',
                arguments: {
                    a: {
                        type: ArgumentType.NUMBER,
                        defaultValue: '0'
                    }
                }
            },
            {
                type: BlockType.COMMAND,
                opcode: 'testZeroNumber',
                text: 'block [a]',
                arguments: {
                    a: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0
                    }
                }
            }
        ]
    });
});
