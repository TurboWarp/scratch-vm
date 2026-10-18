const {test, beforeEach} = require('node:test');
const assert = require('node:assert');
const path = require('path');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const makeTestStorage = require('../fixtures/make-test-storage');
const VirtualMachine = require('../../src/virtual-machine');

let vm;
let projectChanged;

beforeEach(async () => {
    const projectUri = path.resolve(__dirname, '../fixtures/default.sb2');
    const project = readFileToBuffer(projectUri);

    vm = new VirtualMachine();

    vm.runtime.addListener('PROJECT_CHANGED', () => {
        projectChanged = true;
    });

    vm.attachStorage(makeTestStorage());
    await vm.loadProject(project);
    // The test in project_load_changed_state.js tests
    // that loading a project does not emit a project changed
    // event. This setup tries to be agnostic of whether that
    // test is passing or failing.
    projectChanged = false;
});

test('Adding a sprite (from sprite2) should emit a project changed event', async () => {
    const sprite2Uri = path.resolve(__dirname, '../fixtures/cat.sprite2');
    const sprite2 = readFileToBuffer(sprite2Uri);

    await vm.addSprite(sprite2);
    assert.strictEqual(projectChanged, true);
});

test('Adding a sprite (from sprite3) should emit a project changed event', async () => {
    const sprite3Uri = path.resolve(__dirname, '../fixtures/cat.sprite3');
    const sprite3 = readFileToBuffer(sprite3Uri);

    await vm.addSprite(sprite3);
    assert.strictEqual(projectChanged, true);
});

test('Adding a costume should emit a project changed event', async () => {
    const newCostume = {
        name: 'costume1',
        baseLayerID: 0,
        baseLayerMD5: 'f9a1c175dbe2e5dee472858dd30d16bb.svg',
        bitmapResolution: 1,
        rotationCenterX: 47,
        rotationCenterY: 55
    };

    await vm.addCostume('f9a1c175dbe2e5dee472858dd30d16bb.svg', newCostume);
    assert.strictEqual(projectChanged, true);
});

test('Adding a costume from library should emit a project changed event', async () => {
    const newCostume = {
        name: 'costume1',
        baseLayerID: 0,
        baseLayerMD5: 'f9a1c175dbe2e5dee472858dd30d16bb.svg',
        bitmapResolution: 1,
        rotationCenterX: 47,
        rotationCenterY: 55
    };

    await vm.addCostumeFromLibrary('f9a1c175dbe2e5dee472858dd30d16bb.svg', newCostume);
    assert.strictEqual(projectChanged, true);
});

test('Adding a backdrop should emit a project changed event', async () => {
    const newCostume = {
        name: 'costume1',
        baseLayerID: 0,
        baseLayerMD5: 'f9a1c175dbe2e5dee472858dd30d16bb.svg',
        bitmapResolution: 1,
        rotationCenterX: 47,
        rotationCenterY: 55
    };

    await vm.addBackdrop('f9a1c175dbe2e5dee472858dd30d16bb.svg', newCostume);
    assert.strictEqual(projectChanged, true);
});

test('Adding a sound should emit a project changed event', async () => {
    const newSound = {
        soundName: 'meow',
        soundID: 0,
        md5: '83c36d806dc92327b9e7049a565c6bff.wav',
        sampleCount: 18688,
        rate: 22050
    };

    await vm.addSound(newSound);
    assert.strictEqual(projectChanged, true);
});

test('Deleting a sprite should emit a project changed event', () => {
    const spriteId = vm.editingTarget.id;

    vm.deleteSprite(spriteId);
    assert.strictEqual(projectChanged, true);
});

test('Deleting a costume should emit a project changed event', () => {
    vm.deleteCostume(0);

    assert.strictEqual(projectChanged, true);
});

test('Deleting a sound should emit a project changed event', () => {
    vm.deleteSound(0);

    assert.strictEqual(projectChanged, true);
});

test('Reordering a sprite should emit a project changed event', async () => {
    const sprite3Uri = path.resolve(__dirname, '../fixtures/cat.sprite3');
    const sprite3 = readFileToBuffer(sprite3Uri);

    // Add a new sprite so we have 2 to reorder
    await vm.addSprite(sprite3);
    // Reset the project changed flag to ignore change from adding new sprite
    projectChanged = false;
    assert.strictEqual(vm.runtime.targets.filter(target => !target.isStage).length, 2);
    vm.reorderTarget(2, 1);
    assert.strictEqual(projectChanged, true);
});

test('Reordering a costume should emit a project changed event', () => {
    assert.strictEqual(vm.editingTarget.sprite.costumes.length, 2);
    const spriteId = vm.editingTarget.id;
    const reordered = vm.reorderCostume(spriteId, 1, 0);
    assert.strictEqual(reordered, true);
    assert.strictEqual(projectChanged, true);
});

test('Reordering a sound should emit a project changed event', async () => {
    const spriteId = vm.editingTarget.id;
    const newSound = {
        soundName: 'meow',
        soundID: 0,
        md5: '83c36d806dc92327b9e7049a565c6bff.wav',
        sampleCount: 18688,
        rate: 22050
    };
    await vm.addSound(newSound);
    // Reset the project changed flag to ignore change from adding new sound
    projectChanged = false;
    assert.strictEqual(vm.editingTarget.sprite.sounds.length, 2);
    const reordered = vm.reorderSound(spriteId, 1, 0);
    assert.strictEqual(reordered, true);
    assert.strictEqual(projectChanged, true);
});

test('Renaming a sprite should emit a project changed event', () => {
    const spriteId = vm.editingTarget.id;
    vm.renameSprite(spriteId, 'My Sprite');
    assert.strictEqual(projectChanged, true);
});

test('Renaming a costume should emit a project changed event', () => {
    vm.renameCostume(0, 'My Costume');
    assert.strictEqual(projectChanged, true);
});

test('Renaming a sound should emit a project changed event', () => {
    vm.renameSound(0, 'My Sound');

    assert.strictEqual(projectChanged, true);
});

test('Changing sprite info should emit a project changed event', () => {
    const newSpritePosition = {
        x: 10,
        y: 100
    };

    vm.postSpriteInfo(newSpritePosition);
    assert.strictEqual(projectChanged, true);
    projectChanged = false;

    const newSpriteDirection = {
        direction: -30
    };

    vm.postSpriteInfo(newSpriteDirection);
    assert.strictEqual(projectChanged, true);
    projectChanged = false;

});

test('Editing a vector costume should emit a project changed event', () => {
    const mockSvg = 'svg';
    const mockRotationX = -13;
    const mockRotationY = 25;

    vm.updateSvg(0, mockSvg, mockRotationX, mockRotationY);
    assert.strictEqual(projectChanged, true);
});

test('Editing a sound should emit a project changed event', () => {
    const mockSoundBuffer = [];
    const mockSoundEncoding = [];

    vm.updateSoundBuffer(0, mockSoundBuffer, mockSoundEncoding);
    assert.strictEqual(projectChanged, true);
});
