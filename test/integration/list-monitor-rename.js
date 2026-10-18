const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');

const projectUri = path.resolve(__dirname, '../fixtures/list-monitor-rename.sb3');
const project = readFileToBuffer(projectUri);

test('importing sb3 project with incorrect list monitor name', (t, done) => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Evaluate playground data and exit
    vm.on('playgroundData', () => {
        const stage = vm.runtime.targets[0];
        const cat = vm.runtime.targets[1];

        for (const {target, renamedListName} of [
            {target: stage, renamedListName: 'renamed global'},
            {target: cat, renamedListName: 'renamed local'}
        ]) {
            const listId = Object.keys(target.variables).find(k => target.variables[k].name === renamedListName);

            const monitorRecord = vm.runtime._monitorState.get(listId);
            const monitorBlock = vm.runtime.monitorBlocks.getBlock(listId);
            assert.strictEqual(monitorRecord.opcode, 'data_listcontents');

            // The list name should be properly renamed
            assert.strictEqual(monitorRecord.params.LIST, renamedListName);
            assert.strictEqual(monitorBlock.fields.LIST.value, renamedListName);
        }

        vm.quit();
        done();
    });

    // Start VM, load project, and run
    assert.doesNotThrow(() => {
        vm.start();
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);
        vm.loadProject(project).then(() => {
            vm.greenFlag();
            setTimeout(() => {
                vm.getPlaygroundData();
                vm.stopAll();
            }, 100);
        });
    });
});
