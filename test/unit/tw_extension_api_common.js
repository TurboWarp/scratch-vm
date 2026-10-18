const ScratchCommon = require('../../src/extension-support/tw-extension-api-common');
const {test} = require('node:test');
const assert = require('node:assert');

test('ArgumentType', () => {
    assert.strictEqual(ScratchCommon.ArgumentType.ANGLE, 'angle');
});

test('BlockType', () => {
    assert.strictEqual(ScratchCommon.BlockType.BOOLEAN, 'Boolean');
});

test('TargetType', () => {
    assert.strictEqual(ScratchCommon.TargetType.SPRITE, 'sprite');
});

test('Cast', () => {
    // Cast is thoroughly tested elsewhere. We just want to make sure that the public methods
    // don't get deleted unexpectedly.
    assert.strictEqual(ScratchCommon.Cast.toNumber('5'), 5);
    assert.strictEqual(ScratchCommon.Cast.toBoolean('true'), true);
    assert.strictEqual(ScratchCommon.Cast.toString('something'), 'something');
    assert.deepEqual(ScratchCommon.Cast.toRgbColorList('#abcdef'), [0xab, 0xcd, 0xef]);
    assert.deepEqual(ScratchCommon.Cast.toRgbColorObject('#abcdef'), {r: 0xab, g: 0xcd, b: 0xef});
    assert.strictEqual(ScratchCommon.Cast.isWhiteSpace(''), true);
    assert.strictEqual(ScratchCommon.Cast.compare(1, 2), -1);
    assert.strictEqual(ScratchCommon.Cast.isInt(5.5), false);
    assert.strictEqual(typeof ScratchCommon.Cast.LIST_INVALID, 'string');
    assert.strictEqual(typeof ScratchCommon.Cast.LIST_ALL, 'string');
    assert.strictEqual(ScratchCommon.Cast.toListIndex('1.5', 10, false), 1);
});

test('external', async () => {
    // has more tests in separate file, mostly just making sure that external exists at all
    const r = await ScratchCommon.external.fetch('data:text/plain;,test');
    const text = await r.text();
    assert.strictEqual(text, 'test');
});
