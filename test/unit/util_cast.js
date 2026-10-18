const {test} = require('node:test');
const assert = require('node:assert');
const cast = require('../../src/util/cast');

test('toNumber', () => {
    // Numeric
    assert.strictEqual(cast.toNumber(0), 0);
    assert.strictEqual(cast.toNumber(1), 1);
    assert.strictEqual(cast.toNumber(3.14), 3.14);

    // String
    assert.strictEqual(cast.toNumber('0'), 0);
    assert.strictEqual(cast.toNumber('1'), 1);
    assert.strictEqual(cast.toNumber('3.14'), 3.14);
    assert.strictEqual(cast.toNumber('0.1e10'), 1000000000);
    assert.strictEqual(cast.toNumber('foobar'), 0);

    // Boolean
    assert.strictEqual(cast.toNumber(true), 1);
    assert.strictEqual(cast.toNumber(false), 0);
    assert.strictEqual(cast.toNumber('true'), 0);
    assert.strictEqual(cast.toNumber('false'), 0);

    // Undefined & object
    assert.strictEqual(cast.toNumber(undefined), 0);
    assert.strictEqual(cast.toNumber({}), 0);
    assert.strictEqual(cast.toNumber(NaN), 0);
});

test('toBoolean', () => {
    // Numeric
    assert.strictEqual(cast.toBoolean(0), false);
    assert.strictEqual(cast.toBoolean(1), true);
    assert.strictEqual(cast.toBoolean(3.14), true);

    // String
    assert.strictEqual(cast.toBoolean('0'), false);
    assert.strictEqual(cast.toBoolean('1'), true);
    assert.strictEqual(cast.toBoolean('3.14'), true);
    assert.strictEqual(cast.toBoolean('0.1e10'), true);
    assert.strictEqual(cast.toBoolean('foobar'), true);

    // Boolean
    assert.strictEqual(cast.toBoolean(true), true);
    assert.strictEqual(cast.toBoolean(false), false);

    // Undefined & object
    assert.strictEqual(cast.toBoolean(undefined), false);
    assert.strictEqual(cast.toBoolean({}), true);
});

test('toString', () => {
    // Numeric
    assert.strictEqual(cast.toString(0), '0');
    assert.strictEqual(cast.toString(1), '1');
    assert.strictEqual(cast.toString(3.14), '3.14');

    // String
    assert.strictEqual(cast.toString('0'), '0');
    assert.strictEqual(cast.toString('1'), '1');
    assert.strictEqual(cast.toString('3.14'), '3.14');
    assert.strictEqual(cast.toString('0.1e10'), '0.1e10');
    assert.strictEqual(cast.toString('foobar'), 'foobar');

    // Boolean
    assert.strictEqual(cast.toString(true), 'true');
    assert.strictEqual(cast.toString(false), 'false');

    // Undefined & object
    assert.strictEqual(cast.toString(undefined), 'undefined');
    assert.strictEqual(cast.toString({}), '[object Object]');
});

test('toRgbColorList', () => {
    // Hex (minimal, see "color" util tests)
    assert.deepEqual(cast.toRgbColorList('#000'), [0, 0, 0]);
    assert.deepEqual(cast.toRgbColorList('#000000'), [0, 0, 0]);
    assert.deepEqual(cast.toRgbColorList('#fff'), [255, 255, 255]);
    assert.deepEqual(cast.toRgbColorList('#ffffff'), [255, 255, 255]);

    // Decimal (minimal, see "color" util tests)
    assert.deepEqual(cast.toRgbColorList(0), [0, 0, 0]);
    assert.deepEqual(cast.toRgbColorList(1), [0, 0, 1]);
    assert.deepEqual(cast.toRgbColorList(16777215), [255, 255, 255]);

    // Malformed
    assert.deepEqual(cast.toRgbColorList('ffffff'), [0, 0, 0]);
    assert.deepEqual(cast.toRgbColorList('foobar'), [0, 0, 0]);
    assert.deepEqual(cast.toRgbColorList('#nothex'), [0, 0, 0]);
});

test('toRgbColorObject', () => {
    // Hex (minimal, see "color" util tests)
    assert.deepEqual(cast.toRgbColorObject('#000'), {r: 0, g: 0, b: 0});
    assert.deepEqual(cast.toRgbColorObject('#000000'), {r: 0, g: 0, b: 0});
    assert.deepEqual(cast.toRgbColorObject('#fff'), {r: 255, g: 255, b: 255});
    assert.deepEqual(cast.toRgbColorObject('#ffffff'), {r: 255, g: 255, b: 255});

    // Decimal (minimal, see "color" util tests)
    assert.deepEqual(cast.toRgbColorObject(0), {a: 255, r: 0, g: 0, b: 0});
    assert.deepEqual(cast.toRgbColorObject(1), {a: 255, r: 0, g: 0, b: 1});
    assert.deepEqual(cast.toRgbColorObject(16777215), {a: 255, r: 255, g: 255, b: 255});
    assert.deepEqual(cast.toRgbColorObject('0x80010203'), {a: 128, r: 1, g: 2, b: 3});

    // Malformed
    assert.deepEqual(cast.toRgbColorObject('ffffff'), {a: 255, r: 0, g: 0, b: 0});
    assert.deepEqual(cast.toRgbColorObject('foobar'), {a: 255, r: 0, g: 0, b: 0});
    assert.deepEqual(cast.toRgbColorObject('#nothex'), {a: 255, r: 0, g: 0, b: 0});
});

test('compare', () => {
    // Numeric
    assert.strictEqual(cast.compare(0, 0), 0);
    assert.strictEqual(cast.compare(1, 0), 1);
    assert.strictEqual(cast.compare(0, 1), -1);
    assert.strictEqual(cast.compare(1, 1), 0);

    // String
    assert.strictEqual(cast.compare('0', '0'), 0);
    assert.strictEqual(cast.compare('0.1e10', '1000000000'), 0);
    assert.strictEqual(cast.compare('foobar', 'FOOBAR'), 0);
    assert.ok(cast.compare('dog', 'cat') > 0);

    // Boolean
    assert.strictEqual(cast.compare(true, true), 0);
    assert.strictEqual(cast.compare(true, false), 1);
    assert.strictEqual(cast.compare(false, true), -1);
    assert.strictEqual(cast.compare(true, true), 0);

    // Undefined & object
    assert.strictEqual(cast.compare(undefined, undefined), 0);
    assert.strictEqual(cast.compare(undefined, 'undefined'), 0);
    assert.strictEqual(cast.compare({}, {}), 0);
    assert.strictEqual(cast.compare({}, '[object Object]'), 0);
});

test('isInt', () => {
    // Numeric
    assert.strictEqual(cast.isInt(0), true);
    assert.strictEqual(cast.isInt(1), true);
    assert.strictEqual(cast.isInt(0.0), true);
    assert.strictEqual(cast.isInt(3.14), false);
    assert.strictEqual(cast.isInt(NaN), true);

    // String
    assert.strictEqual(cast.isInt('0'), true);
    assert.strictEqual(cast.isInt('1'), true);
    assert.strictEqual(cast.isInt('0.0'), false);
    assert.strictEqual(cast.isInt('0.1e10'), false);
    assert.strictEqual(cast.isInt('3.14'), false);

    // Boolean
    assert.strictEqual(cast.isInt(true), true);
    assert.strictEqual(cast.isInt(false), true);

    // Undefined & object
    assert.strictEqual(cast.isInt(undefined), false);
    assert.strictEqual(cast.isInt({}), false);
});

test('toListIndex', () => {
    const list = [0, 1, 2, 3, 4, 5];
    const empty = [];

    // Valid
    assert.strictEqual(cast.toListIndex(1, list.length, false), 1);
    assert.strictEqual(cast.toListIndex(6, list.length, false), 6);

    // Invalid
    assert.strictEqual(cast.toListIndex(-1, list.length, false), cast.LIST_INVALID);
    assert.strictEqual(cast.toListIndex(0.1, list.length, false), cast.LIST_INVALID);
    assert.strictEqual(cast.toListIndex(0, list.length, false), cast.LIST_INVALID);
    assert.strictEqual(cast.toListIndex(7, list.length, false), cast.LIST_INVALID);

    // "all"
    assert.strictEqual(cast.toListIndex('all', list.length, true), cast.LIST_ALL);
    assert.strictEqual(cast.toListIndex('all', list.length, false), cast.LIST_INVALID);

    // "last"
    assert.strictEqual(cast.toListIndex('last', list.length, false), list.length);
    assert.strictEqual(cast.toListIndex('last', empty.length, false), cast.LIST_INVALID);

    // "random"
    const random = cast.toListIndex('random', list.length, false);
    assert.ok(random <= list.length);
    assert.ok(random > 0);
    assert.strictEqual(cast.toListIndex('random', empty.length, false), cast.LIST_INVALID);

    // "any" (alias for "random")
    const any = cast.toListIndex('any', list.length, false);
    assert.ok(any <= list.length);
    assert.ok(any > 0);
    assert.strictEqual(cast.toListIndex('any', empty.length, false), cast.LIST_INVALID);
});
