const Runtime = require('../../src/engine/runtime');
const {test} = require('tap');
const {serialize} = require('../../src/serialization/sb3');
const MonitorRecord = require('../../src/engine/monitor-record');

test('does not serialize hidden monitors from extensions', t => {
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
    t.ok(monitorsWhenVisible[0].id === 'timer');
    t.ok(monitorsWhenVisible[1].id === 'other_monitor');
    t.equal(monitorsWhenVisible.length, 2);

    rt.requestHideMonitor('timer');
    rt.requestHideMonitor('other_monitor');
    const monitorsWhenHidden = serialize(rt).monitors;
    t.ok(monitorsWhenHidden[0].id === 'timer');
    t.equal(monitorsWhenHidden.length, 1);

    t.end();
});
