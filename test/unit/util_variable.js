const {test, beforeEach} = require('node:test');
const assert = require('node:assert');
const Target = require('../../src/engine/target');
const Runtime = require('../../src/engine/runtime');
const VariableUtil = require('../../src/util/variable-util');

let target1;
let target2;

beforeEach(() => {
    const runtime = new Runtime();
    target1 = new Target(runtime);
    target1.blocks.createBlock({
        id: 'a block',
        fields: {
            VARIABLE: {
                id: 'id1',
                value: 'foo'
            }
        }
    });
    target1.blocks.createBlock({
        id: 'another block',
        fields: {
            TEXT: {
                value: 'not a variable'
            }
        }
    });

    target2 = new Target(runtime);
    target2.blocks.createBlock({
        id: 'a different block',
        fields: {
            VARIABLE: {
                id: 'id2',
                value: 'bar'
            }
        }
    });
    target2.blocks.createBlock({
        id: 'another var block',
        fields: {
            VARIABLE: {
                id: 'id1',
                value: 'foo'
            }
        }
    });

    return Promise.resolve(null);
});

test('get all var refs', () => {
    const allVarRefs = VariableUtil.getAllVarRefsForTargets([target1, target2]);
    assert.strictEqual(Object.keys(allVarRefs).length, 2);
    assert.strictEqual(allVarRefs.id1.length, 2);
    assert.strictEqual(allVarRefs.id2.length, 1);
    assert.strictEqual(allVarRefs['not a variable'], undefined);
});

test('merge variable ids', () => {
    // Redo the id for the variable with 'id1'
    VariableUtil.updateVariableIdentifiers(target1.blocks.getAllVariableAndListReferences().id1, 'renamed id');
    const varField = target1.blocks.getBlock('a block').fields.VARIABLE;
    assert.strictEqual(varField.id, 'renamed id');
    assert.strictEqual(varField.value, 'foo');
});

test('merge variable ids but with new name too', () => {
    // Redo the id for the variable with 'id1'
    VariableUtil.updateVariableIdentifiers(target1.blocks.getAllVariableAndListReferences().id1, 'renamed id', 'baz');
    const varField = target1.blocks.getBlock('a block').fields.VARIABLE;
    assert.strictEqual(varField.id, 'renamed id');
    assert.strictEqual(varField.value, 'baz');
});
