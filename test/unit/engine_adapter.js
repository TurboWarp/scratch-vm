const {test} = require('node:test');
const assert = require('node:assert');
const adapter = require('../../src/engine/adapter');
const events = require('../fixtures/events.json');

test('spec', () => {
    assert.strictEqual(typeof adapter, 'function');
});

test('invalid inputs', () => {
    let nothing = adapter('not an object');
    assert.strictEqual(typeof nothing, 'undefined');
    nothing = adapter({noxmlproperty: true});
    assert.strictEqual(typeof nothing, 'undefined');
});

test('create event', () => {
    const result = adapter(events.create);

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 2);

    // Outer block
    assert.strictEqual(typeof result[0].id, 'string');
    assert.strictEqual(typeof result[0].opcode, 'string');
    assert.strictEqual(typeof result[0].comment, 'undefined');
    assert.strictEqual(typeof result[0].fields, 'object');
    assert.strictEqual(typeof result[0].inputs, 'object');
    assert.strictEqual(typeof result[0].inputs.DURATION, 'object');
    assert.strictEqual(typeof result[0].topLevel, 'boolean');
    assert.strictEqual(result[0].topLevel, true);

    // Enclosed shadow block
    assert.strictEqual(typeof result[1].id, 'string');
    assert.strictEqual(typeof result[1].opcode, 'string');
    assert.strictEqual(typeof result[1].fields, 'object');
    assert.strictEqual(typeof result[1].inputs, 'object');
    assert.strictEqual(typeof result[1].fields.NUM, 'object');
    assert.strictEqual(result[1].fields.NUM.value, '10');
    assert.strictEqual(typeof result[1].topLevel, 'boolean');
    assert.strictEqual(result[1].topLevel, false);
});

test('create with comment', () => {
    const result = adapter(events.createComment);

    // This test should be the same as above except that it also has a comment.

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 2);

    assert.strictEqual(typeof result[0].comment, 'string');
    assert.strictEqual(result[0].comment, 'aCommentId');
});

test('create with branch', () => {
    const result = adapter(events.createbranch);
    // Outer block
    assert.strictEqual(typeof result[0].id, 'string');
    assert.strictEqual(typeof result[0].opcode, 'string');
    assert.strictEqual(typeof result[0].fields, 'object');
    assert.strictEqual(typeof result[0].inputs, 'object');
    assert.strictEqual(typeof result[0].inputs.SUBSTACK, 'object');
    assert.strictEqual(typeof result[0].topLevel, 'boolean');
    assert.strictEqual(result[0].topLevel, true);
    // In branch
    const branchBlockId = result[0].inputs.SUBSTACK.block;
    const branchShadowId = result[0].inputs.SUBSTACK.shadow;
    assert.strictEqual(typeof branchBlockId, 'string');
    assert.strictEqual(branchShadowId, null);
    // Find actual branch block
    let branchBlock = null;
    for (let i = 0; i < result.length; i++) {
        if (result[i].id === branchBlockId) {
            branchBlock = result[i];
        }
    }
    assert.strictEqual(typeof branchBlock, 'object');
});

test('create with two branches', () => {
    const result = adapter(events.createtwobranches);
    // Outer block
    assert.strictEqual(typeof result[0].id, 'string');
    assert.strictEqual(typeof result[0].opcode, 'string');
    assert.strictEqual(typeof result[0].fields, 'object');
    assert.strictEqual(typeof result[0].inputs, 'object');
    assert.strictEqual(typeof result[0].inputs.SUBSTACK, 'object');
    assert.strictEqual(typeof result[0].inputs.SUBSTACK2, 'object');
    assert.strictEqual(typeof result[0].topLevel, 'boolean');
    assert.strictEqual(result[0].topLevel, true);
    // In branchs
    const firstBranchBlockId = result[0].inputs.SUBSTACK.block;
    const secondBranchBlockId = result[0].inputs.SUBSTACK2.block;
    assert.strictEqual(typeof firstBranchBlockId, 'string');
    assert.strictEqual(typeof secondBranchBlockId, 'string');
    const firstBranchShadowBlockId = result[0].inputs.SUBSTACK.shadow;
    const secondBranchShadowBlockId = result[0].inputs.SUBSTACK2.shadow;
    assert.strictEqual(firstBranchShadowBlockId, null);
    assert.strictEqual(secondBranchShadowBlockId, null);
    // Find actual branch blocks
    let firstBranchBlock = null;
    let secondBranchBlock = null;
    for (let i = 0; i < result.length; i++) {
        if (result[i].id === firstBranchBlockId) {
            firstBranchBlock = result[i];
        }
        if (result[i].id === secondBranchBlockId) {
            secondBranchBlock = result[i];
        }
    }
    assert.strictEqual(typeof firstBranchBlock, 'object');
    assert.strictEqual(typeof secondBranchBlock, 'object');
});

test('create with top-level shadow', () => {
    const result = adapter(events.createtoplevelshadow);
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);

    // Outer block
    assert.strictEqual(typeof result[0].id, 'string');
    assert.strictEqual(typeof result[0].opcode, 'string');
    assert.strictEqual(typeof result[0].fields, 'object');
    assert.strictEqual(typeof result[0].inputs, 'object');
    assert.strictEqual(typeof result[0].topLevel, 'boolean');
    assert.strictEqual(result[0].topLevel, true);
});

test('create with next connection', () => {
    const result = adapter(events.createwithnext);

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 2);

    // First block
    assert.strictEqual(typeof result[0].id, 'string');
    assert.strictEqual(typeof result[0].opcode, 'string');
    assert.strictEqual(typeof result[0].fields, 'object');
    assert.strictEqual(typeof result[0].inputs, 'object');
    assert.strictEqual(typeof result[0].topLevel, 'boolean');
    assert.strictEqual(result[0].topLevel, true);
    assert.strictEqual(typeof result[0].next, 'string');
    assert.strictEqual(result[0].next, result[1].id);

    // Second block
    assert.strictEqual(typeof result[1].id, 'string');
    assert.strictEqual(typeof result[1].opcode, 'string');
    assert.strictEqual(typeof result[1].fields, 'object');
    assert.strictEqual(typeof result[1].inputs, 'object');
    assert.strictEqual(typeof result[1].topLevel, 'boolean');
    assert.strictEqual(result[1].topLevel, false);
    assert.strictEqual(result[1].next, null);
});

test('create with obscured shadow', () => {
    const result = adapter(events.createobscuredshadow);
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 4);
});

test('create variable with entity in name', () => {
    const result = adapter(events.createvariablewithentity);

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);

    assert.strictEqual(typeof result[0].id, 'string');
    assert.strictEqual(typeof result[0].opcode, 'string');
    assert.strictEqual(typeof result[0].fields, 'object');
    assert.strictEqual(typeof result[0].fields.VARIABLE, 'object');
    assert.strictEqual(typeof result[0].fields.VARIABLE.value, 'string');
    assert.strictEqual(result[0].fields.VARIABLE.value, 'this & that');
    assert.strictEqual(typeof result[0].inputs, 'object');
    assert.strictEqual(typeof result[0].topLevel, 'boolean');
    assert.strictEqual(result[0].topLevel, true);
});

test('create with invalid block xml', () => {
    // Entirely invalid block XML
    const result = adapter(events.createinvalid);
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);

    // Invalid grandchild tag
    const result2 = adapter(events.createinvalidgrandchild);
    assert.ok(Array.isArray(result2));
    assert.strictEqual(result2.length, 1);
    assert.strictEqual(typeof result2[0].id, 'string');
    assert.strictEqual(Object.keys(result2[0].inputs).length, 0);
    assert.strictEqual(Object.keys(result2[0].fields).length, 0);
});

test('create with invalid xml', () => {
    const result = adapter(events.createbadxml);
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
});

test('create with empty field', () => {
    const result = adapter(events.createemptyfield);
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 3);
});
