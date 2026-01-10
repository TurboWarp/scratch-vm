const {test} = require('tap');
const safeStringify = require('../../src/util/tw-safe-stringify');

test('safeStringify', t => {
    t.equal(safeStringify(''), '');
    t.equal(safeStringify('a'), 'a');

    t.equal(safeStringify(true), 'true');
    t.equal(safeStringify(false), 'false');

    t.equal(safeStringify(0), '0');
    t.equal(safeStringify(-0), '-0');
    t.equal(safeStringify(1), '1');
    t.equal(safeStringify(Infinity), 'Infinity');
    t.equal(safeStringify(-Infinity), '-Infinity');
    t.equal(safeStringify(NaN), 'NaN');

    t.equal(safeStringify(null), 'null');
    t.equal(safeStringify(undefined), 'undefined');

    t.equal(safeStringify({}), '{}');
    t.equal(safeStringify({a: 'b'}), '{"a":"b"}');

    t.equal(safeStringify([]), '[]');
    t.equal(safeStringify([1, 2, 3]), '[1,2,3]');

    const circular = {};
    circular.circular = circular;
    t.equal(safeStringify(circular), '{"circular":"{...}"}');

    t.end();
});
