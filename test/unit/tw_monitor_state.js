const {test} = require('tap');
const MonitorState = require('../../src/engine/tw-monitor-state');
const MonitorRecord = require('../../src/engine/monitor-record');

test('basic operation', t => {
    const state = new MonitorState();

    t.equal(state.dirty, false);
    t.equal(state.has('id'), false);
    t.equal(state.size, 0);
    t.equal(state.empty(), true);

    state.set('id', new MonitorRecord({
        id: 'id',
        value: 0
    }));
    t.equal(state.has('id'), true);
    t.equal(state.get('id').id, 'id');
    t.equal(state.get('id').value, 0);
    t.equal(state.size, 1);
    t.equal(state.empty(), false);
    t.equal(state.dirty, true);

    state.dirty = false;
    state.set('id', new MonitorRecord({
        id: 'id',
        value: -0
    }));
    t.equal(state.get('id').value, -0);
    t.equal(state.dirty, true);

    state.dirty = false;
    state.set('id', new MonitorRecord({
        id: 'id',
        value: -0
    }));
    t.equal(state.dirty, false);

    state.dirty = false;
    state.delete('id');
    t.equal(state.has('id'), false);
    t.equal(state.get('id'), undefined);
    t.equal(state.size, 0);
    t.equal(state.empty(), true);
    t.equal(state.dirty, true);

    state.dirty = false;
    state.delete('id');
    t.equal(state.dirty, false);

    t.end();
});

test('filter', t => {
    const state = new MonitorState();

    state.set('id1', new MonitorRecord({
        id: 'id1',
        value: 5
    }));
    state.set('id2', new MonitorRecord({
        id: 'id2',
        value: 10
    }));
    state.set('id3', new MonitorRecord({
        id: 'id3',
        value: 15
    }));

    state.dirty = false;
    state.filter(record => record.value !== 10);
    t.equal(state.dirty, true);
    t.equal(state.has('id1'), true);
    t.equal(state.has('id2'), false);
    t.equal(state.has('id3'), true);

    state.dirty = false;
    state.filter(record => record.value !== 10);
    t.equal(state.dirty, false);

    t.end();
});

test('value', t => {
    const state = new MonitorState();

    const a = new MonitorRecord({
        id: 'a'
    });
    const b = new MonitorRecord({
        id: 'b'
    });
    state.set('a', a);
    state.set('b', b);

    t.same(state.values(), [a, b]);
    t.same(state.valueSeq(), [a, b]);

    t.end();
});

test('shallowClone', t => {
    const state = new MonitorState();

    state.set('id', new MonitorRecord({
        id: 'id'
    }));

    const clone = state.shallowClone();
    t.not(state, clone);
    t.equal(state.map, clone.map);
    t.equal(clone.dirty, false);

    t.end();
});
