const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const VM = require('../../src/virtual-machine');
const Scratch = require('../../src/extension-support/tw-extension-api-common');

const commandFixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-rejected-promise-command.sb3'));
const reporterFixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-rejected-promise-reporter.sb3'));

class TestExtension {
    getInfo () {
        return {
            id: 'test123',
            name: 'test123',
            blocks: [
                {
                    blockType: Scratch.BlockType.COMMAND,
                    opcode: 'command',
                    text: 'return rejected promise'
                },
                {
                    blockType: Scratch.BlockType.REPORTER,
                    opcode: 'reporter',
                    text: 'return rejected promise'
                }
            ]
        };
    }
    command () {
        return Promise.reject(new Error('Test error 1'));
    }
    reporter () {
        return Promise.reject(new Error('Test error 2'));
    }
}

for (const enableCompiler of [true, false]) {
    test(`COMMAND returns rejected promise - ${enableCompiler ? 'compiler' : 'interpreter'}`, async () => {
        const vm = new VM();
        vm.extensionManager.addBuiltinExtension('test123', TestExtension);

        vm.setCompilerOptions({
            enabled: enableCompiler
        });
        assert.strictEqual(vm.runtime.compilerOptions.enabled, enableCompiler);

        await vm.loadProject(commandFixture);
        vm.greenFlag();

        for (let i = 0; i < 12; i++) {
            vm.runtime._step();

            // wait for promise rejection to be handled
            await Promise.resolve();
        }

        const stage = vm.runtime.getTargetForStage();
        assert.strictEqual(stage.lookupVariableByNameAndType('before', '').value, 10);
        assert.strictEqual(stage.lookupVariableByNameAndType('after', '').value, 10);
    });

    test(`REPORTER returns rejected promise - ${enableCompiler ? 'compiler' : 'interpreter'}`, async () => {
        const vm = new VM();
        vm.extensionManager.addBuiltinExtension('test123', TestExtension);

        vm.setCompilerOptions({
            enabled: enableCompiler
        });
        assert.strictEqual(vm.runtime.compilerOptions.enabled, enableCompiler);

        await vm.loadProject(reporterFixture);
        vm.greenFlag();

        for (let i = 0; i < 12; i++) {
            vm.runtime._step();

            // wait for promise rejection to be handled
            await Promise.resolve();
        }

        const stage = vm.runtime.getTargetForStage();
        assert.strictEqual(stage.lookupVariableByNameAndType('before', '').value, 10);
        assert.strictEqual(stage.lookupVariableByNameAndType('after', '').value, 10);
        assert.deepEqual(stage.lookupVariableByNameAndType('values', 'list').value, [
            'Error: Test error 2',
            'Error: Test error 2',
            'Error: Test error 2',
            'Error: Test error 2',
            'Error: Test error 2',
            'Error: Test error 2',
            'Error: Test error 2',
            'Error: Test error 2',
            'Error: Test error 2',
            'Error: Test error 2',
            'Error: Test error 2'
        ]);
    });
}
