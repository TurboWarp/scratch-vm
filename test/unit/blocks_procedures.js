const {test} = require('node:test');
const assert = require('node:assert');
const Procedures = require('../../src/blocks/scratch3_procedures');

const blocks = new Procedures(null);

test('getPrimitives', () => {
    assert.strictEqual(typeof blocks.getPrimitives(), 'object');
});

// Originally inspired by https://github.com/scratchfoundation/scratch-gui/issues/809
test('calling a custom block with no definition does not throw', () => {
    const args = {
        mutation: {
            proccode: 'undefined proc'
        }
    };
    const util = {
        getProcedureParamNamesIdsAndDefaults: () => null,
        stackFrame: {
            executed: false
        }
    };
    assert.doesNotThrow(() => {
        blocks.call(args, util);
    });
});
