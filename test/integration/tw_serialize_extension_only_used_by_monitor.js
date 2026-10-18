const {test} = require('node:test');
const assert = require('node:assert');
const VM = require('../../src/virtual-machine');
const MonitorRecord = require('../../src/engine/monitor-record');

test('Correctly serializes native extension only used by monitors', () => {
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
    assert.deepEqual(json.extensions, ['pen', 'translate']);
    assert.ok(!('customExtensions' in json));
});

test('Correctly serializes custom extension only used by monitors', () => {
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
    assert.deepEqual(json.extensions, ['fetch']);
    assert.deepEqual(json.extensionURLs, {
        fetch: 'https://extensions.turbowarp.org/fetch.js'
    });
});
