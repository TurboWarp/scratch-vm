const {test} = require('tap');
const MonitorRecord = require('../../src/engine/monitor-record');

test('new and get', t => {
    const record = new MonitorRecord({
        id: 'a',
        x: 10,
        y: 20
    });

    t.equal(record.id, 'a');
    t.equal(record.x, 10);
    t.equal(record.y, 20);

    t.equal(record.get('id'), 'a');
    t.equal(record.get('x'), 10);
    t.equal(record.get('y'), 20);

    t.end();
});

test('merge', t => {
    const record = new MonitorRecord({
        id: 'a',
        x: 10,
        y: 20
    });

    t.equal(record.merge({
        x: 40,
        y: null
    }), true);
    t.equal(record.x, 40);
    t.equal(record.y, 20);

    t.equal(record.merge({
        x: 40,
        y: undefined
    }), false);
    t.equal(record.x, 40);
    t.equal(record.y, 20);

    t.end();
});

test('externalDeltaToJS', t => {
    t.same(MonitorRecord.externalDeltaToJS({
        whatever: 'a'
    }), {whatever: 'a'});

    t.same(MonitorRecord.externalDeltaToJS({
        toJS: () => ({whatever: 'a'})
    }), {whatever: 'a'});

    t.end();
});
