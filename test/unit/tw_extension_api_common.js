const ScratchCommon = require('../../src/extension-support/tw-extension-api-common');
const {test} = require('tap');

test('ArgumentType', t => {
    t.equal(ScratchCommon.ArgumentType.ANGLE, 'angle');
    t.end();
});

test('BlockType', t => {
    t.equal(ScratchCommon.BlockType.BOOLEAN, 'Boolean');
    t.end();
});

test('TargetType', t => {
    t.equal(ScratchCommon.TargetType.SPRITE, 'sprite');
    t.end();
});

test('Cast', t => {
    // Cast is thoroughly tested elsewhere. We just want to make sure that the public methods
    // don't get deleted unexpectedly.
    t.equal(ScratchCommon.Cast.toNumber('5'), 5);
    t.equal(ScratchCommon.Cast.toBoolean('true'), true);
    t.equal(ScratchCommon.Cast.toString('something'), 'something');
    t.same(ScratchCommon.Cast.toRgbColorList('#abcdef'), [0xab, 0xcd, 0xef]);
    t.same(ScratchCommon.Cast.toRgbColorObject('#abcdef'), {r: 0xab, g: 0xcd, b: 0xef});
    t.equal(ScratchCommon.Cast.isWhiteSpace(''), true);
    t.equal(ScratchCommon.Cast.compare(1, 2), -1);
    t.equal(ScratchCommon.Cast.isInt(5.5), false);
    t.type(ScratchCommon.Cast.LIST_INVALID, 'string');
    t.type(ScratchCommon.Cast.LIST_ALL, 'string');
    t.equal(ScratchCommon.Cast.toListIndex('1.5', 10, false), 1);
    t.end();
});
