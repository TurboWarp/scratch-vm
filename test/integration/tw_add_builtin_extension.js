const fs = require('fs');
const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const VM = require('../../src/virtual-machine');
const Scratch = require('../../src/extension-support/tw-extension-api-common');

class TestBuiltinExtension {
    getInfo () {
        return {
            id: 'testbuiltin',
            name: 'Test Builtin',
            blocks: [
                {
                    opcode: 'test',
                    blockType: Scratch.BlockType.REPORTER,
                    text: 'test'
                }
            ]
        };
    }
    test () {
        return 'It works! 123';
    }
}

test('addBuiltingExtension', (t, done) => {
    const vm = new VM();

    assert.strictEqual(vm.extensionManager.isBuiltinExtension('testbuiltin'), false, 'extension is not known');
    assert.strictEqual(vm.extensionManager.isExtensionLoaded('testbuiltin'), false, 'extension is not loaded');

    vm.extensionManager.addBuiltinExtension('testbuiltin', TestBuiltinExtension);
    assert.strictEqual(vm.extensionManager.isBuiltinExtension('testbuiltin'), true, 'extension is now known');
    assert.strictEqual(vm.extensionManager.isExtensionLoaded('testbuiltin'), false, 'extension is still not loaded');

    const fixture = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'tw-add-builtin-extension.sb3'));
    vm.loadProject(fixture).then(() => {
        assert.strictEqual(
            vm.extensionManager.isExtensionLoaded('testbuiltin'),
            true,
            'extension was loaded automatically'
        );

        vm.runtime.on('SAY', (target, type, text) => {
            assert.strictEqual(text, 'It works! 123', 'said value from extension');
            done();
        });

        vm.greenFlag();
        vm.runtime._step();
    });
});

test('each runtime has own set of extensions', () => {
    const vm1 = new VM();
    const vm2 = new VM();

    vm1.extensionManager.addBuiltinExtension('testbuiltin', TestBuiltinExtension);

    assert.ok(vm1.extensionManager.isBuiltinExtension('testbuiltin'));
    assert.ok(!vm2.extensionManager.isBuiltinExtension('testbuiltin'));
});
