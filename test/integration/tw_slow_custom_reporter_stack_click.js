const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const VirtualMachine = require('../../src/virtual-machine');

const fixtureData = fs.readFileSync(path.join(__dirname, '../fixtures/tw-slow-custom-reporter-stack-click.sb3'));

// After starting this block, first step will yield, second step will report value
const procedureCallBlockId = 'e';

test('when thread target is editing target', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(fixtureData);
    const visualReports = [];
    vm.on('VISUAL_REPORT', visualReport => {
        visualReports.push(visualReport);
    });

    vm.setEditingTarget(vm.runtime.getSpriteTargetByName('Sprite1').id);
    vm.runtime.toggleScript(procedureCallBlockId, {
        stackClick: true
    });

    assert.deepEqual(visualReports, []);

    vm.runtime._step();
    assert.deepEqual(visualReports, []);

    vm.runtime._step();
    assert.deepEqual(visualReports, [
        {
            id: 'e',
            value: 'return value'
        }
    ]);
});

test('when thread target is not editing target', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(fixtureData);
    const visualReports = [];
    vm.on('VISUAL_REPORT', visualReport => {
        visualReports.push(visualReport);
    });

    vm.setEditingTarget(vm.runtime.getSpriteTargetByName('Sprite1').id);
    vm.runtime.toggleScript(procedureCallBlockId, {
        stackClick: true
    });

    assert.deepEqual(visualReports, []);

    vm.runtime._step();
    assert.deepEqual(visualReports, []);

    vm.setEditingTarget(vm.runtime.getSpriteTargetByName('Sprite2').id);

    vm.runtime._step();
    assert.deepEqual(visualReports, []);
});
