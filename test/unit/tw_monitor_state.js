const {test} = require('node:test');
const assert = require('node:assert');
const MonitorState = require('../../src/engine/tw-monitor-state');
const MonitorRecord = require('../../src/engine/monitor-record');

test('basic operation', () => {
    const state = new MonitorState();

    assert.strictEqual(state.dirty, false);
    assert.strictEqual(state.has('id'), false);
    assert.strictEqual(state.size, 0);
    assert.strictEqual(state.empty(), true);

    state.set('id', new MonitorRecord({
        id: 'id',
        value: 0
    }));
    assert.strictEqual(state.has('id'), true);
    assert.strictEqual(state.get('id').id, 'id');
    assert.strictEqual(state.get('id').value, 0);
    assert.strictEqual(state.size, 1);
    assert.strictEqual(state.empty(), false);
    assert.strictEqual(state.dirty, true);

    state.dirty = false;
    state.set('id', new MonitorRecord({
        id: 'id',
        value: -0
    }));
    assert.strictEqual(state.get('id').value, -0);
    assert.strictEqual(state.dirty, true);

    state.dirty = false;
    state.set('id', new MonitorRecord({
        id: 'id',
        value: -0
    }));
    assert.strictEqual(state.dirty, false);

    state.dirty = false;
    state.delete('id');
    assert.strictEqual(state.has('id'), false);
    assert.strictEqual(state.get('id'), undefined);
    assert.strictEqual(state.size, 0);
    assert.strictEqual(state.empty(), true);
    assert.strictEqual(state.dirty, true);

    state.dirty = false;
    state.delete('id');
    assert.strictEqual(state.dirty, false);
});

test('filter', () => {
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
    assert.strictEqual(state.dirty, true);
    assert.strictEqual(state.has('id1'), true);
    assert.strictEqual(state.has('id2'), false);
    assert.strictEqual(state.has('id3'), true);

    state.dirty = false;
    state.filter(record => record.value !== 10);
    assert.strictEqual(state.dirty, false);
});

test('value', () => {
    const state = new MonitorState();

    const a = new MonitorRecord({
        id: 'a'
    });
    const b = new MonitorRecord({
        id: 'b'
    });
    state.set('a', a);
    state.set('b', b);

    assert.deepEqual(state.values(), [a, b]);
    assert.deepEqual(state.valueSeq(), [a, b]);
});

test('shallowClone', () => {
    const state = new MonitorState();

    state.set('id', new MonitorRecord({
        id: 'id'
    }));

    const clone = state.shallowClone();
    assert.notStrictEqual(state, clone);
    assert.strictEqual(state.map, clone.map);
    assert.strictEqual(clone.dirty, false);
});
