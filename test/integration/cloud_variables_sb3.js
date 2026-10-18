const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');

const cloudVarSimpleUri = path.resolve(__dirname, '../fixtures/cloud_variables_simple.sb3');
const cloudVarLimitUri = path.resolve(__dirname, '../fixtures/cloud_variables_limit.sb3');
const cloudVarExceededLimitUri = path.resolve(__dirname, '../fixtures/cloud_variables_exceeded_limit.sb3');
const cloudVarLocalUri = path.resolve(__dirname, '../fixtures/cloud_variables_local.sb3');

const cloudVarSimple = readFileToBuffer(cloudVarSimpleUri);
const cloudVarLimit = readFileToBuffer(cloudVarLimitUri);
const cloudVarExceededLimit = readFileToBuffer(cloudVarExceededLimitUri);
const cloudVarLocal = readFileToBuffer(cloudVarLocalUri);

test('importing an sb3 project with cloud variables', async () => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    vm.start();
    vm.clear();
    vm.setCompatibilityMode(false);
    vm.setTurboMode(false);
    await vm.loadProject(cloudVarSimple);
    assert.strictEqual(vm.runtime.hasCloudData(), true);

    const stage = vm.runtime.targets[0];
    const stageVars = Object.values(stage.variables);
    assert.strictEqual(stageVars.length, 1);

    const variable = stageVars[0];
    assert.strictEqual(variable.name, '☁ firstCloud');
    assert.strictEqual(Number(variable.value), 100);
    assert.strictEqual(variable.isCloud, true);

    vm.quit();
});

test('importing an sb3 project with cloud variables at the limit for a project', async () => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    vm.start();
    vm.clear();
    vm.setCompatibilityMode(false);
    vm.setTurboMode(false);
    await vm.loadProject(cloudVarLimit);
    assert.strictEqual(vm.runtime.hasCloudData(), true);

    const stage = vm.runtime.targets[0];
    const stageVars = Object.values(stage.variables);

    assert.strictEqual(stageVars.length, 10);
    // All of the 10 stage variables should be cloud variables
    assert.strictEqual(stageVars.filter(v => v.isCloud).length, 10);

    vm.quit();
});

test('importing an sb3 project with cloud variables exceeding the limit for a project', async () => {
    // This tests a hacked project where additional cloud variables exceeding
    // the project limit have been added.
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    vm.start();
    vm.clear();
    vm.setCompatibilityMode(false);
    vm.setTurboMode(false);
    await vm.loadProject(cloudVarExceededLimit);
    assert.strictEqual(vm.runtime.hasCloudData(), true);

    const stage = vm.runtime.targets[0];
    const stageVars = Object.values(stage.variables);

    assert.strictEqual(stageVars.length, 15);
    // Only 8 of the variables should have the isCloud flag set to true
    assert.strictEqual(stageVars.filter(v => v.isCloud).length, 10);

    vm.quit();
});

test('importing one project after the other resets cloud variable limit', async () => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    vm.start();
    vm.clear();
    vm.setCompatibilityMode(false);
    vm.setTurboMode(false);
    await vm.loadProject(cloudVarExceededLimit);
    assert.strictEqual(vm.runtime.canAddCloudVariable(), false);

    await vm.loadProject(cloudVarSimple);
    const stage = vm.runtime.targets[0];
    const stageVars = Object.values(stage.variables);
    assert.strictEqual(stageVars.length, 1);

    const variable = stageVars[0];
    assert.strictEqual(variable.name, '☁ firstCloud');
    assert.strictEqual(Number(variable.value), 100);
    assert.strictEqual(variable.isCloud, true);

    assert.strictEqual(vm.runtime.canAddCloudVariable(), true);

    vm.quit();
});

test('local cloud variables get imported as regular variables', async () => {
    // This tests a hacked project where a sprite-local variable is
    // has the cloud variable flag set.
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    vm.start();
    vm.clear();
    vm.setCompatibilityMode(false);
    vm.setTurboMode(false);
    await vm.loadProject(cloudVarLocal);
    assert.strictEqual(vm.runtime.hasCloudData(), false);

    const stage = vm.runtime.targets[0];
    const stageVars = Object.values(stage.variables);

    assert.strictEqual(stageVars.length, 0);

    const sprite = vm.runtime.targets[1];
    const spriteVars = Object.values(sprite.variables);

    assert.strictEqual(spriteVars.length, 1);
    assert.strictEqual(spriteVars[0].isCloud, false);

    vm.quit();
});
