const {test} = require('node:test');
const assert = require('node:assert');
const ExtensionManager = require('../../src/extension-support/extension-manager');
const VM = require('../../src/virtual-machine');

test('isBuiltinExtension', () => {
    const fakeRuntime = {};
    const manager = new ExtensionManager(fakeRuntime);
    assert.strictEqual(manager.isBuiltinExtension('pen'), true);
    assert.strictEqual(manager.isBuiltinExtension('lksdfjlskdf'), false);
});

test('_isValidExtensionURL', () => {
    const fakeRuntime = {};
    const manager = new ExtensionManager(fakeRuntime);
    assert.strictEqual(manager._isValidExtensionURL('fetch'), false);
    assert.strictEqual(manager._isValidExtensionURL(''), false);
    assert.strictEqual(manager._isValidExtensionURL('extensions.turbowarp.org/fetch.js'), false);
    assert.strictEqual(manager._isValidExtensionURL('https://extensions.turbowarp.org/fetch.js'), true);
    assert.strictEqual(manager._isValidExtensionURL('http://extensions.turbowarp.org/fetch.js'), true);
    assert.strictEqual(manager._isValidExtensionURL('http://localhost:8000'), true);
    assert.strictEqual(manager._isValidExtensionURL('data:application/javascript;base64,YWxlcnQoMSk='), true);
    assert.strictEqual(manager._isValidExtensionURL('file:///home/test/extension.js'), true);
});

test('loadExtensionURL, getExtensionURLs, deduplication', async () => {
    const vm = new VM();

    let loadedExtensions = 0;
    vm.extensionManager.securityManager.getSandboxMode = () => 'unsandboxed';
    global.document = {
        createElement: () => {
            loadedExtensions++;
            const element = {};
            setTimeout(() => {
                global.Scratch.extensions.register({
                    getInfo: () => ({
                        id: `extension${loadedExtensions}`
                    })
                });
            });
            return element;
        },
        body: {
            appendChild: () => {}
        }
    };
    global.window = {
        addEventListener: () => {},
        removeEventListener: () => {}
    };

    const url1 = 'https://turbowarp.org/1.js';
    assert.strictEqual(vm.extensionManager.isExtensionURLLoaded(url1), false);
    assert.deepEqual(vm.extensionManager.getExtensionURLs(), {});
    await vm.extensionManager.loadExtensionURL(url1);
    assert.strictEqual(vm.extensionManager.isExtensionURLLoaded(url1), true);
    assert.strictEqual(loadedExtensions, 1);
    assert.deepEqual(vm.extensionManager.getExtensionURLs(), {
        extension1: url1
    });

    // Loading the extension again should do nothing.
    await vm.extensionManager.loadExtensionURL(url1);
    assert.strictEqual(vm.extensionManager.isExtensionURLLoaded(url1), true);
    assert.strictEqual(loadedExtensions, 1);
    assert.deepEqual(vm.extensionManager.getExtensionURLs(), {
        extension1: url1
    });

    // Loading another extension should work
    const url2 = 'https://turbowarp.org/2.js';
    assert.strictEqual(vm.extensionManager.isExtensionURLLoaded(url2), false);
    await vm.extensionManager.loadExtensionURL(url2);
    assert.strictEqual(vm.extensionManager.isExtensionURLLoaded(url2), true);
    assert.strictEqual(loadedExtensions, 2);
    assert.deepEqual(vm.extensionManager.getExtensionURLs(), {
        extension1: url1,
        extension2: url2
    });
});
