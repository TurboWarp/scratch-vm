const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');

const uri = path.resolve(__dirname, '../fixtures/unknown-opcode-as-reporter-block.sb2');
const project = readFileToBuffer(uri);

test('unknown opcode', async () => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    vm.start();
    vm.clear();
    vm.setCompatibilityMode(false);
    vm.setTurboMode(false);
    await vm.loadProject(project);
    vm.greenFlag();

    // The project has 4 blocks in a single stack:
    //      when green flag
    //      if "unknown block"
    //      set volume to "unknown block"
    //      play sound "unknown block"
    // the "unknown block" has unknown opcode and was created by
    // dragging a discontinued extension.
    // It should be parsed in without error and a shadow block
    // should be created where appropriate.
    const blocks = vm.runtime.targets[0].blocks;
    const topBlockId = blocks.getScripts()[0];
    const secondBlockId = blocks.getNextBlock(topBlockId);
    const thirdBlockId = blocks.getNextBlock(secondBlockId);
    const fourthBlockId = blocks.getNextBlock(thirdBlockId);

    assert.strictEqual(blocks.getBlock(topBlockId).opcode, 'event_whenflagclicked');
    assert.strictEqual(blocks.getBlock(secondBlockId).opcode, 'control_wait_until');
    assert.strictEqual(blocks.getBlock(thirdBlockId).opcode, 'sound_setvolumeto');
    assert.strictEqual(blocks.getBlock(fourthBlockId).opcode, 'sound_play');

    const secondBlockInputId = blocks.getBlock(secondBlockId).inputs.CONDITION.block;
    const thirdBlockInputId = blocks.getBlock(thirdBlockId).inputs.VOLUME.block;
    const fourthBlockInputId = blocks.getBlock(fourthBlockId).inputs.SOUND_MENU.block;

    assert.strictEqual(secondBlockInputId, null);
    assert.ok(blocks.getBlock(thirdBlockInputId).shadow);
    assert.strictEqual(blocks.getBlock(thirdBlockInputId).opcode, 'math_number');
    assert.ok(blocks.getBlock(fourthBlockInputId).shadow);
    assert.strictEqual(blocks.getBlock(fourthBlockInputId).opcode, 'sound_sounds_menu');

    vm.quit();
});
