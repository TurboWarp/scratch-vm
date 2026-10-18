const {test} = require('node:test');
const assert = require('node:assert');
const safeStringify = require('../../src/util/tw-safe-stringify');

test('safeStringify', () => {
    assert.strictEqual(safeStringify(''), '');
    assert.strictEqual(safeStringify('a'), 'a');

    assert.strictEqual(safeStringify(true), 'true');
    assert.strictEqual(safeStringify(false), 'false');

    assert.strictEqual(safeStringify(0), '0');
    assert.strictEqual(safeStringify(-0), '-0');
    assert.strictEqual(safeStringify(1), '1');
    assert.strictEqual(safeStringify(Infinity), 'Infinity');
    assert.strictEqual(safeStringify(-Infinity), '-Infinity');
    assert.strictEqual(safeStringify(NaN), 'NaN');

    assert.strictEqual(safeStringify(null), 'null');
    assert.strictEqual(safeStringify(undefined), 'undefined');

    assert.strictEqual(safeStringify({}), '{}');
    assert.strictEqual(safeStringify({a: 'b'}), '{"a":"b"}');

    assert.strictEqual(safeStringify([]), '[]');
    assert.strictEqual(safeStringify([1, 2, 3]), '[1,2,3]');

    const circular = {};
    circular.circular = circular;
    assert.strictEqual(safeStringify(circular), '{"circular":"{...}"}');
});
