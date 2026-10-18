const Runtime = require('../../src/engine/runtime');
const {test} = require('node:test');
const assert = require('node:assert');
const {serialize} = require('../../src/serialization/sb3');
const MonitorRecord = require('../../src/engine/monitor-record');

test('does not serialize hidden monitors from extensions', () => {
    const rt = new Runtime();
    rt.requestAddMonitor(new MonitorRecord({
        id: 'timer',
        opcode: 'sensing_timer',
        visible: true
    }));
    rt.requestAddMonitor(new MonitorRecord({
        id: 'other_monitor',
        opcode: 'tw_someOpcodeThatIsntPartOfACoreExtension',
        visible: true
    }));

    const monitorsWhenVisible = serialize(rt).monitors;
    assert.ok(monitorsWhenVisible[0].id === 'timer');
    assert.ok(monitorsWhenVisible[1].id === 'other_monitor');
    assert.strictEqual(monitorsWhenVisible.length, 2);

    rt.requestHideMonitor('timer');
    rt.requestHideMonitor('other_monitor');
    const monitorsWhenHidden = serialize(rt).monitors;
    assert.ok(monitorsWhenHidden[0].id === 'timer');
    assert.strictEqual(monitorsWhenHidden.length, 1);
});
