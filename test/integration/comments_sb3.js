const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');

const projectUri = path.resolve(__dirname, '../fixtures/comments.sb3');
const project = readFileToBuffer(projectUri);

test('load an sb3 project with comments', (t, done) => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Evaluate playground data and exit
    vm.on('playgroundData', e => {
        const threads = JSON.parse(e.threads);
        assert.strictEqual(threads.length, 0);

        const stage = vm.runtime.targets[0];
        const target = vm.runtime.targets[1];

        const stageComments = Object.values(stage.comments);

        // Stage has 1 comment, and it is minimized.
        assert.strictEqual(stageComments.length, 1);
        assert.strictEqual(stageComments[0].minimized, true);
        assert.strictEqual(stageComments[0].text, 'A minimized stage comment.');
        // The stage comment is a workspace comment
        assert.strictEqual(stageComments[0].blockId, null);

        // Sprite 1 has 6 Comments, 1 workspace comment, and 5 block comments
        const targetComments = Object.values(target.comments);
        assert.strictEqual(targetComments.length, 6);
        const spriteWorkspaceComments = targetComments.filter(comment => comment.blockId === null);
        assert.strictEqual(spriteWorkspaceComments.length, 1);
        assert.strictEqual(spriteWorkspaceComments[0].minimized, false);
        assert.strictEqual(spriteWorkspaceComments[0].text, 'This is a workspace comment.');

        // Test the sprite block comments
        const blockComments = targetComments.filter(comment => !!comment.blockId);
        assert.strictEqual(blockComments.length, 5);

        assert.strictEqual(blockComments[0].minimized, true);
        assert.strictEqual(blockComments[0].text, '1. Green Flag Comment.');
        const greenFlagBlock = target.blocks.getBlock(blockComments[0].blockId);
        assert.strictEqual(greenFlagBlock.comment, blockComments[0].id);
        assert.strictEqual(greenFlagBlock.opcode, 'event_whenflagclicked');

        assert.strictEqual(blockComments[1].minimized, true);
        assert.strictEqual(blockComments[1].text, '2. Turn 15 Degrees Comment.');
        const turnRightBlock = target.blocks.getBlock(blockComments[1].blockId);
        assert.strictEqual(turnRightBlock.comment, blockComments[1].id);
        assert.strictEqual(turnRightBlock.opcode, 'motion_turnright');

        assert.strictEqual(blockComments[2].minimized, false);
        assert.strictEqual(blockComments[2].text, '3. Comment for a loop.');
        const repeatBlock = target.blocks.getBlock(blockComments[2].blockId);
        assert.strictEqual(repeatBlock.comment, blockComments[2].id);
        assert.strictEqual(repeatBlock.opcode, 'control_repeat');

        assert.strictEqual(blockComments[3].minimized, false);
        assert.strictEqual(blockComments[3].text, '4. Comment for a block nested in a loop.');
        const changeColorBlock = target.blocks.getBlock(blockComments[3].blockId);
        assert.strictEqual(changeColorBlock.comment, blockComments[3].id);
        assert.strictEqual(changeColorBlock.opcode, 'looks_changeeffectby');

        assert.strictEqual(blockComments[4].minimized, false);
        assert.strictEqual(blockComments[4].text, '5. Comment for a block outside of a loop.');
        const stopAllBlock = target.blocks.getBlock(blockComments[4].blockId);
        assert.strictEqual(stopAllBlock.comment, blockComments[4].id);
        assert.strictEqual(stopAllBlock.opcode, 'control_stop');

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
