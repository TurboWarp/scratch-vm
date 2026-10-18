const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');

const projectUri = path.resolve(__dirname, '../fixtures/monitors.sb2');
const project = readFileToBuffer(projectUri);

test('importing sb2 project with monitors', (t, done) => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Evaluate playground data and exit
    vm.on('playgroundData', e => {
        const threads = JSON.parse(e.threads);
        // All monitors should create threads that finish during the step and
        // are revoved from runtime.threads.
        assert.strictEqual(threads.length, 0);

        // we care that the last step updated the right number of monitors
        // we don't care whether the last step ran other threads or not
        const lastStepUpdatedMonitorThreads = vm.runtime._lastStepDoneThreads.filter(thread => thread.updateMonitor);
        assert.strictEqual(lastStepUpdatedMonitorThreads.length, 8);

        // There should be one additional hidden monitor that is in the monitorState but
        // does not start a thread.
        assert.strictEqual(vm.runtime._monitorState.size, 9);

        const stage = vm.runtime.targets[0];
        const target = vm.runtime.targets[1];

        // Global variable named "global" is a slider
        let variableId = Object.keys(stage.variables).filter(k => stage.variables[k].name === 'global')[0];
        let monitorRecord = vm.runtime._monitorState.get(variableId);
        assert.strictEqual(monitorRecord.opcode, 'data_variable');
        assert.strictEqual(monitorRecord.mode, 'slider');
        assert.strictEqual(monitorRecord.sliderMin, -200); // Make sure these are imported for sliders.
        assert.strictEqual(monitorRecord.sliderMax, 30);
        assert.strictEqual(monitorRecord.isDiscrete, false);
        assert.strictEqual(monitorRecord.x, 5); // These are imported for all monitors, just check once.
        assert.strictEqual(monitorRecord.y, 59);
        assert.strictEqual(monitorRecord.visible, true);

        // Global variable named "global list" is a list
        variableId = Object.keys(stage.variables).filter(k => stage.variables[k].name === 'global list')[0];
        monitorRecord = vm.runtime._monitorState.get(variableId);
        assert.strictEqual(monitorRecord.opcode, 'data_listcontents');
        assert.strictEqual(monitorRecord.mode, 'list');
        assert.strictEqual(monitorRecord.visible, true);

        // Local variable named "local" is hidden
        variableId = Object.keys(target.variables).filter(k => target.variables[k].name === 'local')[0];
        monitorRecord = vm.runtime._monitorState.get(variableId);
        assert.strictEqual(monitorRecord.opcode, 'data_variable');
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, false);

        // Local list named "local list" is visible
        variableId = Object.keys(target.variables).filter(k => target.variables[k].name === 'local list')[0];
        monitorRecord = vm.runtime._monitorState.get(variableId);
        assert.strictEqual(monitorRecord.opcode, 'data_listcontents');
        assert.strictEqual(monitorRecord.mode, 'list');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.width, 106); // Make sure these are imported from lists.
        assert.strictEqual(monitorRecord.height, 206);

        // Backdrop name monitor is visible, not sprite specific
        // should get imported with id that references the name parameter
        // via '_name' at the end since the 3.0 block has a dropdown.
        monitorRecord = vm.runtime._monitorState.get('backdropnumbername_name');
        assert.strictEqual(monitorRecord.opcode, 'looks_backdropnumbername');
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, null);
        assert.strictEqual(monitorRecord.targetId, null);

        // x position monitor is in large mode, specific to sprite 1
        monitorRecord = vm.runtime._monitorState.get(`${target.id}_xposition`);
        assert.strictEqual(monitorRecord.opcode, 'motion_xposition');
        assert.strictEqual(monitorRecord.mode, 'large');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, 'Sprite1');
        assert.strictEqual(monitorRecord.targetId, target.id);


        let monitorId;
        let monitorBlock;

        // The monitor IDs for the sensing_current block should be unique
        // to the parameter that is selected on the block being monitored.
        // The paramater portion of the id should be lowercase even
        // though the field value on the block is uppercase.

        monitorId = 'current_date';
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'sensing_current');
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorBlock.fields.CURRENTMENU.value, 'DATE');
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, null);
        assert.strictEqual(monitorRecord.targetId, null);

        monitorId = 'current_minute';
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'sensing_current');
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorBlock.fields.CURRENTMENU.value, 'MINUTE');
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, null);
        assert.strictEqual(monitorRecord.targetId, null);

        monitorId = 'current_dayofweek';
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'sensing_current');
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorBlock.fields.CURRENTMENU.value, 'DAYOFWEEK');
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, null);
        assert.strictEqual(monitorRecord.targetId, null);

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
