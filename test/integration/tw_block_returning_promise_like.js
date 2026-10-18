const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const VirtualMachine = require('../../src/virtual-machine');
const Scratch = require('../../src/extension-support/tw-extension-api-common');

// based on https://github.com/TurboWarp/scratch-vm/issues/184

class TestExtension {
    getInfo () {
        return {
            id: 'testextension',
            name: 'test',
            blocks: [
                {
                    opcode: 'test',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'test block'
                }
            ]
        };
    }
    test () {
        // returns a PromiseLike that calls handler immediately instead of in next microtask.
        const promise = {
            then (callbackFn) {
                callbackFn();
                return promise;
            }
            // intentionally omit catch() as that is not part of PromiseLike, so it should not be used
        };
        return promise;
    }
}

const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-block-returning-promise-like.sb3'));

for (const compilerEnabled of [false, true]) {
    // eslint-disable-next-line max-len
    test(`handles blocks that return a promise-like object - ${compilerEnabled ? 'compiled' : 'interpreted'}`, async () => {
        const vm = new VirtualMachine();
        vm.extensionManager.addBuiltinExtension('testextension', TestExtension);

        vm.setCompilerOptions({
            enabled: compilerEnabled
        });
        assert.strictEqual(vm.runtime.compilerOptions.enabled, compilerEnabled, 'sanity check');

        vm.runtime.on('COMPILE_ERROR', () => {
            assert.fail('Compile error');
        });

        await vm.loadProject(fixture);
        let ended = 0;
        vm.runtime.on('SAY', (target, type, text) => {
            if (text === 'end') {
                ended++;
            } else {
                assert.fail('said something unknown');
            }
        });

        vm.greenFlag();
        vm.runtime._step();

        assert.strictEqual(ended, 1, 'script ran once immediately');
    });
}
