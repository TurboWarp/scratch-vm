const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');
const Variable = require('../../src/engine/variable');
const StringUtil = require('../../src/util/string-util');
const VariableUtil = require('../../src/util/variable-util');

const projectUri = path.resolve(__dirname, '../fixtures/variable_characters.sb3');
const project = readFileToBuffer(projectUri);

test('importing sb3 project with special chars in variable names', (t, done) => {
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
        assert.strictEqual(lastStepUpdatedMonitorThreads.length, 3);

        assert.strictEqual(vm.runtime.targets.length, 3);

        const stage = vm.runtime.targets[0];
        const cat = vm.runtime.targets[1];
        const bananas = vm.runtime.targets[2];

        const allVarListFields = VariableUtil.getAllVarRefsForTargets(vm.runtime.targets);

        const abVarId = Object.keys(stage.variables).filter(k => stage.variables[k].name === 'a&b')[0];
        const abVar = stage.variables[abVarId];
        const abMonitor = vm.runtime._monitorState.get(abVarId);
        // Check for unsafe characters, replaceUnsafeChars should just result in the original string
        // (e.g. there was nothing to replace)
        // Check that the variable ID does not have any unsafe characters
        assert.strictEqual(StringUtil.replaceUnsafeChars(abVarId), abVarId);
        // Check that the monitor record ID does not have any unsafe characters
        assert.strictEqual(StringUtil.replaceUnsafeChars(abMonitor.id), abMonitor.id);

        // Check that the variable still has the correct info
        assert.strictEqual(StringUtil.replaceUnsafeChars(abVar.id), abVar.id);
        assert.strictEqual(abVar.id, abVarId);
        assert.strictEqual(abVar.type, Variable.LIST_TYPE);
        assert.strictEqual(abVar.value[0], 'thing');
        assert.strictEqual(abVar.value[1], 'thing\'1');

        // Find all the references for this list, and verify they have the correct ID
        // There should be 3 fields, 2 on the stage, and one on the cat
        assert.strictEqual(allVarListFields[abVarId].length, 3);
        const stageBlocks = Object.keys(stage.blocks._blocks).map(blockId => stage.blocks._blocks[blockId]);
        const stageListBlocks = stageBlocks.filter(block => Object.prototype.hasOwnProperty.call(block.fields, 'LIST'));
        assert.strictEqual(stageListBlocks.length, 2);
        assert.strictEqual(stageListBlocks[0].fields.LIST.id, abVarId);
        assert.strictEqual(stageListBlocks[1].fields.LIST.id, abVarId);
        const catBlocks = Object.keys(cat.blocks._blocks).map(blockId => cat.blocks._blocks[blockId]);
        const catListBlocks = catBlocks.filter(block => Object.prototype.hasOwnProperty.call(block.fields, 'LIST'));
        assert.strictEqual(catListBlocks.length, 1);
        assert.strictEqual(catListBlocks[0].fields.LIST.id, abVarId);

        const fooVarId = Object.keys(stage.variables).filter(k => stage.variables[k].name === '"foo')[0];
        const fooVar = stage.variables[fooVarId];
        const fooMonitor = vm.runtime._monitorState.get(fooVarId);
        // Check for unsafe characters, replaceUnsafeChars should just result in the original string
        // (e.g. there was nothing to replace)
        // Check that the variable ID does not have any unsafe characters
        assert.strictEqual(StringUtil.replaceUnsafeChars(fooVarId), fooVarId);
        // Check that the monitor record ID does not have any unsafe characters
        assert.strictEqual(StringUtil.replaceUnsafeChars(fooMonitor.id), fooMonitor.id);

        // Check that the variable still has the correct info
        assert.strictEqual(StringUtil.replaceUnsafeChars(fooVar.id), fooVar.id);
        assert.strictEqual(fooVar.id, fooVarId);
        assert.strictEqual(fooVar.type, Variable.SCALAR_TYPE);
        assert.strictEqual(fooVar.value, 'foo');

        // Find all the references for this variable, and verify they have the correct ID
        // There should be only two, one on the stage and one on bananas
        assert.strictEqual(allVarListFields[fooVarId].length, 2);
        const stageVarBlocks = stageBlocks.filter(
            block => Object.prototype.hasOwnProperty.call(block.fields, 'VARIABLE')
        );
        assert.strictEqual(stageVarBlocks.length, 1);
        assert.strictEqual(stageVarBlocks[0].fields.VARIABLE.id, fooVarId);
        const catVarBlocks = catBlocks.filter(
            block => Object.prototype.hasOwnProperty.call(block.fields, 'VARIABLE')
        );
        assert.strictEqual(catVarBlocks.length, 1);
        assert.strictEqual(catVarBlocks[0].fields.VARIABLE.id, fooVarId);

        const ltPerfectVarId = Object.keys(bananas.variables).filter(k => bananas.variables[k].name === '< Perfect')[0];
        const ltPerfectVar = bananas.variables[ltPerfectVarId];
        const ltPerfectMonitor = vm.runtime._monitorState.get(ltPerfectVarId);
        // Check for unsafe characters, replaceUnsafeChars should just result in the original string
        // (e.g. there was nothing to replace)
        // Check that the variable ID does not have any unsafe characters
        assert.strictEqual(StringUtil.replaceUnsafeChars(ltPerfectVarId), ltPerfectVarId);
        // Check that the monitor record ID does not have any unsafe characters
        assert.strictEqual(StringUtil.replaceUnsafeChars(ltPerfectMonitor.id), ltPerfectMonitor.id);

        // Check that the variable still has the correct info
        assert.strictEqual(StringUtil.replaceUnsafeChars(ltPerfectVar.id), ltPerfectVar.id);
        assert.strictEqual(ltPerfectVar.id, ltPerfectVarId);
        assert.strictEqual(ltPerfectVar.type, Variable.SCALAR_TYPE);
        assert.strictEqual(ltPerfectVar.value, '> perfect');

        // Find all the references for this variable, and verify they have the correct ID
        // There should be one
        assert.strictEqual(allVarListFields[ltPerfectVarId].length, 1);
        const bananasBlocks = Object.keys(bananas.blocks._blocks).map(blockId => bananas.blocks._blocks[blockId]);
        const bananasVarBlocks = bananasBlocks.filter(
            block => Object.prototype.hasOwnProperty.call(block.fields, 'VARIABLE')
        );
        assert.strictEqual(bananasVarBlocks.length, 1);
        assert.strictEqual(bananasVarBlocks[0].fields.VARIABLE.id, ltPerfectVarId);

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
