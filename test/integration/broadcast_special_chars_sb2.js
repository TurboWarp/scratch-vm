const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');
const Variable = require('../../src/engine/variable');
const StringUtil = require('../../src/util/string-util');
const VariableUtil = require('../../src/util/variable-util');

const projectUri = path.resolve(__dirname, '../fixtures/broadcast_special_chars.sb2');
const project = readFileToBuffer(projectUri);

test('importing sb2 project with special chars in message names', (t, done) => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Evaluate playground data and exit
    vm.on('playgroundData', e => {
        const threads = JSON.parse(e.threads);
        assert.strictEqual(threads.length, 0);

        assert.strictEqual(vm.runtime.targets.length, 2);

        const stage = vm.runtime.targets[0];
        const cat = vm.runtime.targets[1];

        const allBroadcastFields = VariableUtil.getAllVarRefsForTargets(vm.runtime.targets, true);

        const abMessageId = Object.keys(stage.variables).filter(k => stage.variables[k].name === 'a&b')[0];
        const abMessage = stage.variables[abMessageId];
        // Check for unsafe characters, replaceUnsafeChars should just result in the original string
        // (e.g. there was nothing to replace)
        // Check that the message ID does not have any unsafe characters
        assert.strictEqual(StringUtil.replaceUnsafeChars(abMessageId), abMessageId);

        // Check that the message still has the correct info
        assert.strictEqual(StringUtil.replaceUnsafeChars(abMessage.id), abMessage.id);
        assert.strictEqual(abMessage.id, abMessageId);
        assert.strictEqual(abMessage.type, Variable.BROADCAST_MESSAGE_TYPE);
        assert.strictEqual(abMessage.value, 'a&b');


        const ltPerfectMessageId = Object.keys(stage.variables).filter(k => stage.variables[k].name === '< perfect')[0];
        const ltPerfectMessage = stage.variables[ltPerfectMessageId];
        // Check for unsafe characters, replaceUnsafeChars should just result in the original string
        // (e.g. there was nothing to replace)
        // Check that the message ID does not have any unsafe characters
        assert.strictEqual(StringUtil.replaceUnsafeChars(ltPerfectMessageId), ltPerfectMessageId);

        // Check that the message still has the correct info
        assert.strictEqual(StringUtil.replaceUnsafeChars(ltPerfectMessage.id), ltPerfectMessage.id);
        assert.strictEqual(ltPerfectMessage.id, ltPerfectMessageId);
        assert.strictEqual(ltPerfectMessage.type, Variable.BROADCAST_MESSAGE_TYPE);
        assert.strictEqual(ltPerfectMessage.value, '< perfect');

        // Find all the references for these messages, and verify they have the correct ID
        assert.strictEqual(allBroadcastFields[ltPerfectMessageId].length, 1);
        assert.strictEqual(allBroadcastFields[abMessageId].length, 1);
        const catBlocks = Object.keys(cat.blocks._blocks).map(blockId => cat.blocks._blocks[blockId]);
        const catMessageBlocks = catBlocks.filter(
            block => Object.prototype.hasOwnProperty.call(block.fields, 'BROADCAST_OPTION')
        );
        assert.strictEqual(catMessageBlocks.length, 2);
        assert.strictEqual(catMessageBlocks[0].fields.BROADCAST_OPTION.id, ltPerfectMessageId);
        assert.strictEqual(catMessageBlocks[1].fields.BROADCAST_OPTION.id, abMessageId);

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
