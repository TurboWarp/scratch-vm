const fs = require('fs');
const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const VM = require('../../src/virtual-machine');

for (const compilerEnabled of [false, true]) {
    const prefix = compilerEnabled ? 'compiler' : 'interpreter';
    test(`${prefix} - quirks when block field has literal null for variable ID`, async () => {
        const vm = new VM();
        vm.setCompilerOptions({
            enabled: compilerEnabled
        });
        assert.strictEqual(vm.runtime.compilerOptions.enabled, compilerEnabled, 'compiler options sanity check');

        // The execute tests ensure that this fixture compiles and runs fine and the snapshot test ensures
        // it compiles correctly. This additional test will ensure that the internal variable objects are
        // being created with the expected properties.
        const fixturePath = path.join(
            __dirname,
            '../fixtures/execute/tw-automatic-variable-creation-literal-null-id.sb3'
        );

        await vm.loadProject(fs.readFileSync(fixturePath));
        vm.greenFlag();
        vm.runtime._step();

        // Variable does not exist, should get made as local variable in sprite
        const variables = vm.runtime.targets[1].variables;
        assert.strictEqual(Object.keys(variables).length, 1, 'created 1 new variable');

        // Scratch quirk - the entry in .variables should have key "null"
        const newVariableKey = Object.keys(variables)[0];
        assert.strictEqual(newVariableKey, 'null', 'key is "null"');

        // Scratch quirk - the actual variable.id should be the random string
        const newVariable = Object.values(variables)[0];
        assert.notStrictEqual(newVariable.id, 'null', 'variable.id is not "null"');
        assert.strictEqual(typeof newVariable.id, 'string', 'variable.id is a string');
    });
}
