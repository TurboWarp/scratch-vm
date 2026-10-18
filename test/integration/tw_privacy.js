const {test} = require('node:test');
const assert = require('node:assert');
const Runtime = require('../../src/engine/runtime');
const VM = require('../../src/virtual-machine');

const mockRenderer = () => ({
    setLayerGroupOrdering: () => {
        // not relevant to this test
    },

    privateSkinAccess: true,
    setPrivateSkinAccess (enabled) {
        this.privateSkinAccess = enabled;
    }
});

test('baseline: no external communication methods', () => {
    const rt = new Runtime();
    rt.attachRenderer(mockRenderer());
    assert.strictEqual(rt.renderer.privateSkinAccess, true);
});

test('throws errors for unknown method', () => {
    const rt = new Runtime();
    assert.throws(() => {
        rt.setExternalCommunicationMethod('something fake', true);
    }, {
        message: 'Unknown method: something fake'
    });
});

test('communication method enabled after attaching renderer', () => {
    const rt = new Runtime();
    rt.attachRenderer(mockRenderer());
    rt.setExternalCommunicationMethod('cloudVariables', true);
    assert.strictEqual(rt.renderer.privateSkinAccess, false);
});

test('communication method enabled before attaching renderer', () => {
    const rt = new Runtime();
    rt.setExternalCommunicationMethod('cloudVariables', true);
    rt.attachRenderer(mockRenderer());
    assert.strictEqual(rt.renderer.privateSkinAccess, false);
});

test('disable enforcement', () => {
    const rt = new Runtime();
    rt.attachRenderer(mockRenderer());
    rt.setEnforcePrivacy(false);
    rt.setExternalCommunicationMethod('cloudVariables', true);
    assert.strictEqual(rt.renderer.privateSkinAccess, true);
});

test('multiple features toggled', () => {
    const rt = new Runtime();
    rt.attachRenderer(mockRenderer());
    rt.setExternalCommunicationMethod('cloudVariables', true);
    assert.strictEqual(rt.renderer.privateSkinAccess, false);
    rt.setExternalCommunicationMethod('customExtensions', true);
    assert.strictEqual(rt.renderer.privateSkinAccess, false);
    rt.setExternalCommunicationMethod('cloudVariables', false);
    assert.strictEqual(rt.renderer.privateSkinAccess, false);
    rt.setExternalCommunicationMethod('customExtensions', false);
    assert.strictEqual(rt.renderer.privateSkinAccess, true);
});

test('cloud variables', () => {
    const rt = new Runtime();
    rt.attachRenderer(mockRenderer());

    rt.addCloudVariable();
    assert.strictEqual(rt.renderer.privateSkinAccess, false);

    rt.addCloudVariable();
    assert.strictEqual(rt.renderer.privateSkinAccess, false);

    rt.removeCloudVariable();
    assert.strictEqual(rt.renderer.privateSkinAccess, false);

    rt.removeCloudVariable();
    assert.strictEqual(rt.renderer.privateSkinAccess, true);
});

test('custom extensions', async () => {
    const vm = new VM();
    vm.attachRenderer(mockRenderer());

    vm.extensionManager.securityManager.getSandboxMode = () => 'unsandboxed';
    global.document = {
        createElement: () => {
            const element = {};
            setTimeout(() => {
                global.Scratch.extensions.register({
                    getInfo: () => ({})
                });
            });
            return element;
        },
        body: {
            appendChild: () => {}
        }
    };

    assert.strictEqual(vm.renderer.privateSkinAccess, true);
    await vm.extensionManager.loadExtensionURL('data:application/javascript;,');
    assert.strictEqual(vm.renderer.privateSkinAccess, false);
});

test('hasExternalCommunicationMethod', () => {
    const vm = new VM();
    assert.strictEqual(vm.runtime.privacyRestrictionsActive, false);
    vm.runtime.setExternalCommunicationMethod('cloudVariables', true);
    assert.strictEqual(vm.runtime.privacyRestrictionsActive, true);
    vm.runtime.setExternalCommunicationMethod('customExtensions', true);
    assert.strictEqual(vm.runtime.privacyRestrictionsActive, true);
    vm.runtime.setExternalCommunicationMethod('cloudVariables', false);
    assert.strictEqual(vm.runtime.privacyRestrictionsActive, true);
    vm.runtime.setExternalCommunicationMethod('customExtensions', false);
    assert.strictEqual(vm.runtime.privacyRestrictionsActive, false);
});
