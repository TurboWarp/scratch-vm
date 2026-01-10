const {test} = require('tap');
const VM = require('../../src/virtual-machine');
const MonitorRecord = require('../../src/engine/monitor-record');

test('Correctly serializes native extension only used by monitors', t => {
    const vm = new VM();
    vm.runtime.requestAddMonitor(new MonitorRecord({
        id: 'fakeblock1',
        opcode: 'pen_fakeblock',
        visiblle: true
    }));
    vm.runtime.requestAddMonitor(new MonitorRecord({
        id: 'fakeblock2',
        opcode: 'translate_fakeblock',
        visiblle: false
    }));
    const json = JSON.parse(vm.toJSON());
    t.same(json.extensions, ['pen', 'translate']);
    t.not('customExtensions' in json);
    t.end();
});

test('Correctly serializes custom extension only used by monitors', t => {
    const vm = new VM();
    vm.runtime.requestAddMonitor(new MonitorRecord({
        id: 'fakeblock1',
        opcode: 'fetch_fakeblock',
        visible: true
    }));
    vm.runtime.requestAddMonitor(new MonitorRecord({
        // should not be serialized at all
        id: 'fakeblock2',
        opcode: 'bitwise_fakeblock',
        visible: false
    }));
    vm.extensionManager.getExtensionURLs = () => ({
        fetch: 'https://extensions.turbowarp.org/fetch.js'
    });
    const json = JSON.parse(vm.toJSON());
    t.same(json.extensions, ['fetch']);
    t.same(json.extensionURLs, {
        fetch: 'https://extensions.turbowarp.org/fetch.js'
    });
    t.end();
});
