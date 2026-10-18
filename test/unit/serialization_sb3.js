const {test} = require('node:test');
const assert = require('node:assert');
const path = require('path');
const VirtualMachine = require('../../src/index');
const Runtime = require('../../src/engine/runtime');
const sb3 = require('../../src/serialization/sb3');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const exampleProjectPath = path.resolve(__dirname, '../fixtures/clone-cleanup.sb2');
const commentsSB2ProjectPath = path.resolve(__dirname, '../fixtures/comments.sb2');
const commentsSB3ProjectPath = path.resolve(__dirname, '../fixtures/comments.sb3');
const commentsSB3NoDupeIds = path.resolve(__dirname, '../fixtures/comments_no_duplicate_id_serialization.sb3');
const variableReporterSB2ProjectPath = path.resolve(__dirname, '../fixtures/top-level-variable-reporter.sb2');
const topLevelReportersProjectPath = path.resolve(__dirname, '../fixtures/top-level-reporters.sb3');
const draggableSB3ProjectPath = path.resolve(__dirname, '../fixtures/draggable.sb3');
const originSB3ProjectPath = path.resolve(__dirname, '../fixtures/origin.sb3');
const originAbsentSB3ProjectPath = path.resolve(__dirname, '../fixtures/origin-absent.sb3');
const FakeRenderer = require('../fixtures/fake-renderer');

test('serialize', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(exampleProjectPath));
    const result = sb3.serialize(vm.runtime);
    // @todo Analyze
    assert.strictEqual(typeof JSON.stringify(result), 'string');
});

test('deserialize', async () => {
    const vm = new VirtualMachine();
    const {targets} = await sb3.deserialize('', vm.runtime);
    // @todo Analyze
    assert.strictEqual(typeof targets, 'object');
});


test('serialize sb2 project with comments as sb3', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(commentsSB2ProjectPath));
    const result = sb3.serialize(vm.runtime);

    assert.strictEqual(typeof JSON.stringify(result), 'string');
    assert.strictEqual(typeof result.targets, 'object');
    assert.strictEqual(Array.isArray(result.targets), true);
    assert.strictEqual(result.targets.length, 2);

    const stage = result.targets[0];
    assert.strictEqual(stage.isStage, true);
    // The stage has 0 blocks, and 1 workspace comment
    assert.strictEqual(typeof stage.blocks, 'object');
    assert.strictEqual(Object.keys(stage.blocks).length, 0);
    assert.strictEqual(typeof stage.comments, 'object');
    assert.strictEqual(Object.keys(stage.comments).length, 1);
    const stageBlockComments = Object.values(stage.comments).filter(comment => !!comment.blockId);
    const stageWorkspaceComments = Object.values(stage.comments).filter(comment => comment.blockId === null);
    assert.strictEqual(stageBlockComments.length, 0);
    assert.strictEqual(stageWorkspaceComments.length, 1);

    const sprite = result.targets[1];
    assert.strictEqual(sprite.isStage, false);
    assert.strictEqual(typeof sprite.blocks, 'object');
    // Sprite 1 has 6 blocks, 5 block comments, and 1 workspace comment
    assert.strictEqual(Object.keys(sprite.blocks).length, 6);
    assert.strictEqual(typeof sprite.comments, 'object');
    assert.strictEqual(Object.keys(sprite.comments).length, 6);

    const spriteBlockComments = Object.values(sprite.comments).filter(comment => !!comment.blockId);
    const spriteWorkspaceComments = Object.values(sprite.comments).filter(comment => comment.blockId === null);
    assert.strictEqual(spriteBlockComments.length, 5);
    assert.strictEqual(spriteWorkspaceComments.length, 1);
});

test('deserialize sb3 project with comments', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(commentsSB3ProjectPath));
    const runtime = vm.runtime;

    assert.strictEqual(typeof runtime.targets, 'object');
    assert.strictEqual(Array.isArray(runtime.targets), true);
    assert.strictEqual(runtime.targets.length, 2);

    const stage = runtime.targets[0];
    assert.strictEqual(stage.isStage, true);
    // The stage has 0 blocks, and 1 workspace comment
    assert.strictEqual(typeof stage.blocks, 'object');
    assert.strictEqual(Object.keys(stage.blocks._blocks).length, 0);
    assert.strictEqual(typeof stage.comments, 'object');
    assert.strictEqual(Object.keys(stage.comments).length, 1);
    const stageBlockComments = Object.values(stage.comments).filter(comment => !!comment.blockId);
    const stageWorkspaceComments = Object.values(stage.comments).filter(comment => comment.blockId === null);
    assert.strictEqual(stageBlockComments.length, 0);
    assert.strictEqual(stageWorkspaceComments.length, 1);

    const sprite = runtime.targets[1];
    assert.strictEqual(sprite.isStage, false);
    assert.strictEqual(typeof sprite.blocks, 'object');
    // Sprite 1 has 6 blocks, 5 block comments, and 1 workspace comment
    assert.strictEqual(Object.values(sprite.blocks._blocks).filter(block => !block.shadow).length, 6);
    assert.strictEqual(typeof sprite.comments, 'object');
    assert.strictEqual(Object.keys(sprite.comments).length, 6);

    const spriteBlockComments = Object.values(sprite.comments).filter(comment => !!comment.blockId);
    const spriteWorkspaceComments = Object.values(sprite.comments).filter(comment => comment.blockId === null);
    assert.strictEqual(spriteBlockComments.length, 5);
    assert.strictEqual(spriteWorkspaceComments.length, 1);
});

test('deserialize sb3 project with comments - no duplicate id serialization', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(commentsSB3NoDupeIds));
    const runtime = vm.runtime;

    assert.strictEqual(typeof runtime.targets, 'object');
    assert.strictEqual(Array.isArray(runtime.targets), true);
    assert.strictEqual(runtime.targets.length, 2);

    const stage = runtime.targets[0];
    assert.strictEqual(stage.isStage, true);
    // The stage has 0 blocks, and 0 workspace comment
    assert.strictEqual(typeof stage.blocks, 'object');
    assert.strictEqual(Object.keys(stage.blocks._blocks).length, 0);
    assert.strictEqual(typeof stage.comments, 'object');
    assert.strictEqual(Object.keys(stage.comments).length, 0);

    const sprite = runtime.targets[1];
    assert.strictEqual(sprite.isStage, false);
    assert.strictEqual(typeof sprite.blocks, 'object');
    // Sprite1 has 1 blocks, 1 block comment, and 1 workspace comment
    assert.strictEqual(Object.values(sprite.blocks._blocks).filter(block => !block.shadow).length, 1);
    assert.strictEqual(typeof sprite.comments, 'object');
    assert.strictEqual(Object.keys(sprite.comments).length, 2);

    const spriteBlockComments = Object.values(sprite.comments).filter(comment => !!comment.blockId);
    const spriteWorkspaceComments = Object.values(sprite.comments).filter(comment => comment.blockId === null);
    assert.strictEqual(spriteBlockComments.length, 1);
    assert.strictEqual(spriteWorkspaceComments.length, 1);
});

test('serializing and deserializing sb3 preserves sprite layer order', async () => {
    const vm = new VirtualMachine();
    vm.attachRenderer(new FakeRenderer());
    await vm.loadProject(readFileToBuffer(path.resolve(__dirname, '../fixtures/ordering.sb2')));
    // Target get layer order needs a renderer,
    // fake the numbers we would get back from the
    // renderer in order to test that they are serialized
    // correctly
    vm.runtime.targets[0].getLayerOrder = () => 0;
    vm.runtime.targets[1].getLayerOrder = () => 20;
    vm.runtime.targets[2].getLayerOrder = () => 10;
    vm.runtime.targets[3].getLayerOrder = () => 30;

    const result = sb3.serialize(vm.runtime);

    assert.strictEqual(typeof JSON.stringify(result), 'string');
    assert.strictEqual(typeof result.targets, 'object');
    assert.strictEqual(Array.isArray(result.targets), true);
    assert.strictEqual(result.targets.length, 4);

    // First check that the sprites are ordered correctly (as they would
    // appear in the target pane)
    assert.strictEqual(result.targets[0].name, 'Stage');
    assert.strictEqual(result.targets[1].name, 'First');
    assert.strictEqual(result.targets[2].name, 'Second');
    assert.strictEqual(result.targets[3].name, 'Third');

    // Check that they are in the correct layer order (as they would render
    // back to front on the stage)
    assert.strictEqual(result.targets[0].layerOrder, 0);
    assert.strictEqual(result.targets[1].layerOrder, 2);
    assert.strictEqual(result.targets[2].layerOrder, 1);
    assert.strictEqual(result.targets[3].layerOrder, 3);

    const serializedObject = await result;
    const {targets, layerOrder} = await sb3.deserialize(
        JSON.parse(JSON.stringify(serializedObject)), new Runtime(), null, false);
    // First check that the sprites are ordered correctly (as they would
    // appear in the target pane)
    assert.strictEqual(targets[0].sprite.name, 'Stage');
    assert.strictEqual(targets[1].sprite.name, 'First');
    assert.strictEqual(targets[2].sprite.name, 'Second');
    assert.strictEqual(targets[3].sprite.name, 'Third');

    // Check that they are in the correct layer order (as they would render
    // back to front on the stage)
    assert.deepEqual(layerOrder, [0, 2, 1, 3]);
});

test('serializeBlocks', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(commentsSB3ProjectPath));
    const blocks = vm.runtime.targets[1].blocks._blocks;
    const result = sb3.serializeBlocks(blocks);
    // @todo Analyze
    assert.strictEqual(typeof result[0], 'object');
    assert.ok(Object.keys(result[0]).length < Object.keys(blocks).length, 'less blocks in serialized format');
    assert.ok(Array.isArray(result[1]));
});

test('serializeBlocks serializes x and y for topLevel blocks with x,y of 0,0', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(topLevelReportersProjectPath));
    // Verify that there are 2 blocks and they are both top level
    const blocks = vm.runtime.targets[1].blocks._blocks;
    const blockIds = Object.keys(blocks);
    assert.strictEqual(blockIds.length, 2);
    const blocksArray = blockIds.map(key => blocks[key]);
    assert.strictEqual(blocksArray.every(b => b.topLevel), true);
    // Simulate cleaning up the blocks by resetting x and y positions to 0
    blockIds.forEach(blockId => {
        blocks[blockId].x = 0;
        blocks[blockId].y = 0;
    });
    const result = sb3.serializeBlocks(blocks);
    const serializedBlocks = result[0];

    assert.strictEqual(typeof serializedBlocks, 'object');
    const serializedBlockIds = Object.keys(serializedBlocks);
    assert.strictEqual(serializedBlockIds.length, 2);
    const firstBlock = serializedBlocks[serializedBlockIds[0]];
    const secondBlock = serializedBlocks[serializedBlockIds[1]];
    assert.strictEqual(firstBlock.x, 0);
    assert.strictEqual(firstBlock.y, 0);
    assert.strictEqual(secondBlock.x, 0);
    assert.strictEqual(secondBlock.y, 0);
});

test('deserializeBlocks', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(commentsSB3ProjectPath));
    const blocks = vm.runtime.targets[1].blocks._blocks;
    const serialized = sb3.serializeBlocks(blocks)[0];
    const deserialized = sb3.deserializeBlocks(serialized);
    assert.strictEqual(Object.keys(deserialized).length, Object.keys(blocks).length, 'same number of blocks');
});

test('deserializeBlocks on already deserialized input', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(commentsSB3ProjectPath));
    const blocks = vm.runtime.targets[1].blocks._blocks;
    const serialized = sb3.serializeBlocks(blocks)[0];
    const deserialized = sb3.deserializeBlocks(serialized);
    const deserializedAgain = sb3.deserializeBlocks(deserialized);
    assert.deepEqual(deserialized, deserializedAgain, 'no change from second pass of deserialize');
});

test('getExtensionIdForOpcode', () => {
    assert.strictEqual(sb3.getExtensionIdForOpcode('wedo_loopy'), 'wedo');

    // does not consider CORE to be extensions
    assert.ok(!sb3.getExtensionIdForOpcode('control_loopy'));

    // only considers things before the first underscore
    assert.strictEqual(sb3.getExtensionIdForOpcode('hello_there_loopy'), 'hello');

    // does not return anything for opcodes with no extension
    assert.ok(!sb3.getExtensionIdForOpcode('hello'));

    // forbidden characters must be replaced with '-'
    assert.strictEqual(sb3.getExtensionIdForOpcode('hi:there/happy_people'), 'hi-there-happy');
});

test('(#1608) serializeBlocks maintains top level variable reporters', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(variableReporterSB2ProjectPath));
    const blocks = vm.runtime.targets[0].blocks._blocks;
    const result = sb3.serialize(vm.runtime);
    // Project should have 1 block, a top-level variable reporter
    assert.strictEqual(Object.keys(blocks).length, 1);
    assert.strictEqual(Object.keys(result.targets[0].blocks).length, 1);

    // Make sure deserializing these blocks works
    assert.doesNotThrow(() => {
        sb3.deserialize(JSON.parse(JSON.stringify(result)), vm.runtime);
    });
});

test('(#1850) sprite draggability state read when loading SB3 file', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(draggableSB3ProjectPath));
    const sprite1Obj = vm.runtime.targets.find(target => target.sprite.name === 'Sprite1');
    // Sprite1 in project should have draggable set to true
    assert.strictEqual(sprite1Obj.draggable, true);
});

test('load origin value from SB3 file json metadata', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(originSB3ProjectPath));
    assert.strictEqual(typeof vm.runtime.origin, 'string');
    await vm.loadProject(readFileToBuffer(originAbsentSB3ProjectPath));
    // After loading a project with an origin, then loading one without an origin,
    // origin value should no longer be set.
    assert.strictEqual(vm.runtime.origin, null);
});

test('serialize origin value if it is present', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(originSB3ProjectPath));
    const result = sb3.serialize(vm.runtime);
    assert.strictEqual(typeof result.meta.origin, 'string');
});

test('do not serialize origin value if it is not present', async () => {
    const vm = new VirtualMachine();
    await vm.loadProject(readFileToBuffer(originAbsentSB3ProjectPath));
    const result = sb3.serialize(vm.runtime);
    assert.strictEqual(result.meta.origin, undefined);
});
