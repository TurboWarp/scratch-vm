const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');

const projectUri = path.resolve(__dirname, '../fixtures/monitored_variables.sb3');
const project = readFileToBuffer(projectUri);

const anotherProjectUri = path.resolve(__dirname, '../fixtures/default.sb2');
const anotherProject = readFileToBuffer(anotherProjectUri);

test('importing one project after the other resets monitored variables', async () => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    vm.start();
    vm.clear();
    vm.setCompatibilityMode(false);
    vm.setTurboMode(false);
    await vm.loadProject(project);
    const refSprite = vm.runtime.targets[1];
    const refVarId = Object.keys(refSprite.variables)[0];
    const refBlock = vm.runtime.monitorBlocks.getBlock(refVarId);
    assert.ok(refBlock);
    const jamalSprite = vm.runtime.targets[2];
    const jamalVarId = Object.keys(jamalSprite.variables)[0];
    const jamalBlock = vm.runtime.monitorBlocks.getBlock(jamalVarId);
    assert.ok(jamalBlock);
    await vm.loadProject(anotherProject);
    // Blocks from the previously loaded project should be gone.
    const refVarBlock = vm.runtime.monitorBlocks.getBlock(refVarId);
    assert.ok(!refVarBlock);
    const jamalVarBlock = vm.runtime.monitorBlocks.getBlock(jamalVarId);
    assert.ok(!jamalVarBlock);

    vm.quit();
});
