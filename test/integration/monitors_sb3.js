const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');
const Variable = require('../../src/engine/variable');

const projectUri = path.resolve(__dirname, '../fixtures/monitors.sb3');
const project = readFileToBuffer(projectUri);

test('importing sb3 project with monitors', (t, done) => {
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
        assert.strictEqual(lastStepUpdatedMonitorThreads.length, 17);

        // There should be one additional hidden monitor that is in the monitorState but
        // does not start a thread.
        assert.strictEqual(vm.runtime._monitorState.size, 18);

        const stage = vm.runtime.targets[0];
        const shirtSprite = vm.runtime.targets[1];
        const heartSprite = vm.runtime.targets[2];

        // Global variable named "my variable" exists
        let variableId = Object.keys(stage.variables).filter(k => stage.variables[k].name === 'my variable')[0];
        let monitorRecord = vm.runtime._monitorState.get(variableId);
        let monitorBlock = vm.runtime.monitorBlocks.getBlock(variableId);
        assert.strictEqual(monitorRecord.opcode, 'data_variable');
        assert.strictEqual(monitorRecord.mode, 'default');
        // The following few properties are imported for all monitors, just check once.
        assert.strictEqual(monitorRecord.sliderMin, 0);
        assert.strictEqual(monitorRecord.sliderMax, 100);
        assert.strictEqual(monitorRecord.isDiscrete, true); // The default if not present
        assert.strictEqual(monitorRecord.x, 10);
        assert.strictEqual(monitorRecord.y, 62);
        // Height and width are only used for list monitors and should default to 0
        // for all other monitors
        assert.strictEqual(monitorRecord.width, 0);
        assert.strictEqual(monitorRecord.height, 0);
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(typeof monitorRecord.params, 'object');
        // The variable name should be stored in the monitor params
        assert.strictEqual(monitorRecord.params.VARIABLE, 'my variable');
        // Test that the monitor block and its fields were constructed correctly
        assert.strictEqual(monitorBlock.fields.VARIABLE.value, 'my variable');
        assert.strictEqual(monitorBlock.fields.VARIABLE.name, 'VARIABLE');
        assert.strictEqual(monitorBlock.fields.VARIABLE.id, variableId);
        assert.strictEqual(monitorBlock.fields.VARIABLE.variableType, Variable.SCALAR_TYPE);

        // There is a global variable named 'secret_slide' which has a hidden monitor
        variableId = Object.keys(stage.variables).filter(k => stage.variables[k].name === 'secret_slide')[0];
        monitorRecord = vm.runtime._monitorState.get(variableId);
        monitorBlock = vm.runtime.monitorBlocks.getBlock(variableId);
        assert.strictEqual(monitorRecord.opcode, 'data_variable');
        assert.strictEqual(monitorRecord.mode, 'slider');
        assert.strictEqual(monitorRecord.visible, false);
        assert.strictEqual(monitorRecord.sliderMin, 0);
        assert.strictEqual(monitorRecord.sliderMax, 100);
        assert.strictEqual(typeof monitorRecord.params, 'object');
        assert.strictEqual(monitorRecord.params.VARIABLE, 'secret_slide');
        // Test that the monitor block and its fields were constructed correctly
        assert.strictEqual(monitorBlock.fields.VARIABLE.value, 'secret_slide');
        assert.strictEqual(monitorBlock.fields.VARIABLE.name, 'VARIABLE');
        assert.strictEqual(monitorBlock.fields.VARIABLE.id, variableId);
        assert.strictEqual(monitorBlock.fields.VARIABLE.variableType, Variable.SCALAR_TYPE);


        // Shirt sprite has a local list named "fashion"
        variableId = Object.keys(shirtSprite.variables).filter(k => shirtSprite.variables[k].name === 'fashion')[0];
        monitorRecord = vm.runtime._monitorState.get(variableId);
        monitorBlock = vm.runtime.monitorBlocks.getBlock(variableId);
        assert.strictEqual(monitorRecord.opcode, 'data_listcontents');
        assert.strictEqual(monitorRecord.mode, 'list');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.height, 122);
        assert.strictEqual(monitorRecord.width, 104);
        assert.strictEqual(typeof monitorRecord.params, 'object');
        // The list name should be stored in the monitor params
        assert.strictEqual(monitorRecord.params.LIST, 'fashion');
        // Test that the monitor block and its fields were constructed correctly
        assert.strictEqual(monitorBlock.fields.LIST.value, 'fashion');
        assert.strictEqual(monitorBlock.fields.LIST.name, 'LIST');
        assert.strictEqual(monitorBlock.fields.LIST.id, variableId);
        assert.strictEqual(monitorBlock.fields.LIST.variableType, Variable.LIST_TYPE);

        // Shirt sprite has a local variable named "tee"
        variableId = Object.keys(shirtSprite.variables).filter(k => shirtSprite.variables[k].name === 'tee')[0];
        monitorRecord = vm.runtime._monitorState.get(variableId);
        monitorBlock = vm.runtime.monitorBlocks.getBlock(variableId);
        assert.strictEqual(monitorRecord.opcode, 'data_variable');
        assert.strictEqual(monitorRecord.mode, 'slider');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.sliderMin, 0);
        assert.strictEqual(monitorRecord.sliderMax, 100);
        assert.strictEqual(typeof monitorRecord.params, 'object');
        assert.strictEqual(monitorRecord.params.VARIABLE, 'tee');
        // Test that the monitor block and its fields were constructed correctly
        assert.strictEqual(monitorBlock.fields.VARIABLE.value, 'tee');
        assert.strictEqual(monitorBlock.fields.VARIABLE.name, 'VARIABLE');
        assert.strictEqual(monitorBlock.fields.VARIABLE.id, variableId);
        assert.strictEqual(monitorBlock.fields.VARIABLE.variableType, Variable.SCALAR_TYPE);

        // Heart sprite has a local list named "hearty"
        variableId = Object.keys(heartSprite.variables).filter(k => heartSprite.variables[k].name === 'hearty')[0];
        monitorRecord = vm.runtime._monitorState.get(variableId);
        monitorBlock = vm.runtime.monitorBlocks.getBlock(variableId);
        assert.strictEqual(monitorRecord.opcode, 'data_variable');
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(typeof monitorRecord.params, 'object');
        // The variable name should be stored in the monitor params
        assert.strictEqual(monitorRecord.params.VARIABLE, 'hearty');
        // Test that the monitor block and its fields were constructed correctly
        assert.strictEqual(monitorBlock.fields.VARIABLE.value, 'hearty');
        assert.strictEqual(monitorBlock.fields.VARIABLE.name, 'VARIABLE');
        assert.strictEqual(monitorBlock.fields.VARIABLE.id, variableId);
        assert.strictEqual(monitorBlock.fields.VARIABLE.variableType, Variable.SCALAR_TYPE);

        // Backdrop name monitor is visible, not sprite specific
        // should get imported with id that references the name parameter
        // via '_name' at the end since the 3.0 block has a dropdown.
        let monitorId = 'backdropnumbername_name';
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'looks_backdropnumbername');
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, null);
        assert.strictEqual(monitorRecord.targetId, null);
        // Test that the monitor block and its fields were constructed correctly
        assert.strictEqual(monitorBlock.fields.NUMBER_NAME.value, 'name');

        // Backdrop name monitor is visible, not sprite specific
        // should get imported with id that references the name parameter
        // via '_number' at the end since the 3.0 block has a dropdown.
        monitorId = 'backdropnumbername_number';
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'looks_backdropnumbername');
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, null);
        assert.strictEqual(monitorRecord.targetId, null);
        // Test that the monitor block and its fields were constructed correctly
        assert.strictEqual(monitorBlock.fields.NUMBER_NAME.value, 'number');

        // x position monitor is in large mode, specific to shirt sprite
        monitorId = `${shirtSprite.id}_xposition`;
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'motion_xposition');
        assert.strictEqual(monitorRecord.mode, 'large');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, 'Shirt-T');
        assert.strictEqual(monitorRecord.targetId, shirtSprite.id);

        // y position monitor is in large mode, specific to shirt sprite
        monitorId = `${shirtSprite.id}_yposition`;
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'motion_yposition');
        assert.strictEqual(monitorRecord.mode, 'large');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, 'Shirt-T');
        assert.strictEqual(monitorRecord.targetId, shirtSprite.id);

        // direction monitor is in large mode, specific to shirt sprite
        monitorId = `${shirtSprite.id}_direction`;
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'motion_direction');
        assert.strictEqual(monitorRecord.mode, 'large');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, 'Shirt-T');
        assert.strictEqual(monitorRecord.targetId, shirtSprite.id);

        monitorId = `${shirtSprite.id}_size`;
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'looks_size');
        assert.strictEqual(monitorRecord.mode, 'large');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, 'Shirt-T');
        assert.strictEqual(monitorRecord.targetId, shirtSprite.id);

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

        monitorId = 'current_year';
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'sensing_current');
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorBlock.fields.CURRENTMENU.value, 'YEAR');
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, null);
        assert.strictEqual(monitorRecord.targetId, null);

        monitorId = 'current_month';
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'sensing_current');
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorBlock.fields.CURRENTMENU.value, 'MONTH');
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, null);
        assert.strictEqual(monitorRecord.targetId, null);

        // Extension Monitors
        monitorId = 'music_getTempo';
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'music_getTempo');
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, null);
        assert.strictEqual(monitorRecord.targetId, null);
        assert.strictEqual(vm.extensionManager.isExtensionLoaded('music'), true);

        monitorId = 'ev3_getDistance';
        monitorRecord = vm.runtime._monitorState.get(monitorId);
        assert.strictEqual(monitorRecord.opcode, 'ev3_getDistance');
        monitorBlock = vm.runtime.monitorBlocks.getBlock(monitorId);
        assert.strictEqual(monitorRecord.mode, 'default');
        assert.strictEqual(monitorRecord.visible, true);
        assert.strictEqual(monitorRecord.spriteName, null);
        assert.strictEqual(monitorRecord.targetId, null);
        assert.strictEqual(vm.extensionManager.isExtensionLoaded('ev3'), true);

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
