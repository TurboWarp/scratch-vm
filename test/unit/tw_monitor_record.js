const {test} = require('node:test');
const assert = require('node:assert');
const MonitorRecord = require('../../src/engine/monitor-record');

test('new and get', () => {
    const record = new MonitorRecord({
        id: 'a',
        x: 10,
        y: 20
    });

    assert.strictEqual(record.id, 'a');
    assert.strictEqual(record.x, 10);
    assert.strictEqual(record.y, 20);

    assert.strictEqual(record.get('id'), 'a');
    assert.strictEqual(record.get('x'), 10);
    assert.strictEqual(record.get('y'), 20);
});

test('merge', () => {
    const record = new MonitorRecord({
        id: 'a',
        x: 10,
        y: 20
    });

    assert.strictEqual(record.merge({
        x: 40,
        y: null
    }), true);
    assert.strictEqual(record.x, 40);
    assert.strictEqual(record.y, 20);

    assert.strictEqual(record.merge({
        x: 40,
        y: undefined
    }), false);
    assert.strictEqual(record.x, 40);
    assert.strictEqual(record.y, 20);
});

test('externalDeltaToJS', () => {
    assert.deepEqual(MonitorRecord.externalDeltaToJS({
        whatever: 'a'
    }), {whatever: 'a'});

    assert.deepEqual(MonitorRecord.externalDeltaToJS({
        toJS: () => ({whatever: 'a'})
    }), {whatever: 'a'});

    assert.deepEqual(MonitorRecord.externalDeltaToJS(
        new Map([['whatever', 'a']])
    ), {whatever: 'a'});
});
