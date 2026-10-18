const {test} = require('node:test');
const assert = require('node:assert');
const math = require('../../src/util/math-util');

test('degToRad', () => {
    assert.strictEqual(math.degToRad(0), 0);
    assert.strictEqual(math.degToRad(1), 0.017453292519943295);
    assert.strictEqual(math.degToRad(180), Math.PI);
    assert.strictEqual(math.degToRad(360), 2 * Math.PI);
    assert.strictEqual(math.degToRad(720), 4 * Math.PI);
});

test('radToDeg', () => {
    assert.strictEqual(math.radToDeg(0), 0);
    assert.strictEqual(math.radToDeg(1), 57.29577951308232);
    assert.strictEqual(math.radToDeg(180), 10313.240312354817);
    assert.strictEqual(math.radToDeg(360), 20626.480624709635);
    assert.strictEqual(math.radToDeg(720), 41252.96124941927);
});

test('clamp', () => {
    assert.strictEqual(math.clamp(0, 0, 10), 0);
    assert.strictEqual(math.clamp(1, 0, 10), 1);
    assert.strictEqual(math.clamp(-10, 0, 10), 0);
    assert.strictEqual(math.clamp(100, 0, 10), 10);
});

test('wrapClamp', () => {
    assert.strictEqual(math.wrapClamp(0, 0, 10), 0);
    assert.strictEqual(math.wrapClamp(1, 0, 10), 1);
    assert.strictEqual(math.wrapClamp(-10, 0, 10), 1);
    assert.strictEqual(math.wrapClamp(100, 0, 10), 1);
});

test('tan', () => {
    assert.strictEqual(math.tan(90), Infinity);
    assert.strictEqual(math.tan(180), -0);
    assert.strictEqual(math.tan(-90), -Infinity);
    assert.strictEqual(math.tan(33), 0.6494075932);
});

test('reducedSortOrdering', () => {
    assert.deepEqual(math.reducedSortOrdering([5, 18, 6, 3]), [1, 3, 2, 0]);
    assert.deepEqual(math.reducedSortOrdering([5, 1, 56, 19]), [1, 0, 3, 2]);
});

test('inclusiveRandIntWithout', () => {
    const withRandomValue = function (randValue, ...args) {
        const oldMathRandom = Math.random;
        Object.assign(global.Math, {random: () => randValue});
        const result = math.inclusiveRandIntWithout(...args);
        Object.assign(global.Math, {random: oldMathRandom});
        return result;
    };

    assert.strictEqual(withRandomValue(3 / 6, 0, 6, 2), 4);
    assert.strictEqual(withRandomValue(2 / 6, 0, 6, 2), 3);
    assert.strictEqual(withRandomValue(1 / 6, 0, 6, 2), 1);
    assert.strictEqual(withRandomValue(1.9 / 6, 0, 6, 2), 1);

    assert.strictEqual(withRandomValue(3 / 4, 10, 14, 10), 14);
    assert.strictEqual(withRandomValue(0 / 4, 10, 14, 10), 11);
});
