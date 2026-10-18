/**
 * This test ensures that the VM gracefully handles an sb2 project with
 * a missing bitmap costume. The VM should handle this safely by displaying
 * a Gray Question Mark, but keeping track of the original costume data
 * and serializing the original costume data back out. The saved project.json
 * should not reflect that the costume is broken and should therefore re-attempt
 * to load the costume if the saved project is re-loaded.
 */
const path = require('path');
const {test, beforeEach} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const FakeRenderer = require('../fixtures/fake-renderer');
const FakeBitmapAdapter = require('../fixtures/fake-bitmap-adapter');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');
const {serializeCostumes} = require('../../src/serialization/serialize-assets');

const projectUri = path.resolve(__dirname, '../fixtures/missing_png.sb2');
const project = readFileToBuffer(projectUri);


const missingCostumeAssetId = 'aadce129bfe4e57f0dd81478f3ed82aa';

global.Image = function () {
    const image = {
        width: 1,
        height: 1
    };
    setTimeout(() => image.onload(), 100);
    return image;
};

global.document = {
    createElement: () => ({
        // Create mock canvas
        getContext: () => ({
            drawImage: () => ({})
        })
    })
};

let vm;

beforeEach(() => {
    const storage = makeTestStorage();

    vm = new VirtualMachine();
    vm.attachStorage(storage);
    vm.attachRenderer(new FakeRenderer());
    vm.attachV2BitmapAdapter(new FakeBitmapAdapter());

    return vm.loadProject(project);
});

test('loading sb2 project with missing bitmap costume file', () => {
    assert.strictEqual(vm.runtime.targets.length, 2);

    const stage = vm.runtime.targets[0];
    assert.ok(stage.isStage);

    const greenGuySprite = vm.runtime.targets[1];
    assert.strictEqual(greenGuySprite.getName(), 'GreenGuy');
    assert.strictEqual(greenGuySprite.getCostumes().length, 1);

    const missingCostume = greenGuySprite.getCostumes()[0];
    assert.strictEqual(missingCostume.name, 'GreenGuy');
    // Costume should have both default cosutme (e.g. Gray Question Mark) data and original data
    const defaultVectorAssetId = vm.runtime.storage.defaultAssetId.ImageBitmap;
    assert.strictEqual(missingCostume.assetId, defaultVectorAssetId);
    assert.strictEqual(missingCostume.dataFormat, 'png');
    // Runtime should have info about broken asset
    assert.ok(missingCostume.broken);
    assert.strictEqual(missingCostume.broken.assetId, missingCostumeAssetId);
});

test('load and then save sb2 project with missing costume file', () => {
    const resavedProject = JSON.parse(vm.toJSON());

    assert.strictEqual(resavedProject.targets.length, 2);

    const stage = resavedProject.targets[0];
    assert.ok(stage.isStage);

    const greenGuySprite = resavedProject.targets[1];
    assert.strictEqual(greenGuySprite.name, 'GreenGuy');
    assert.strictEqual(greenGuySprite.costumes.length, 1);

    const missingCostume = greenGuySprite.costumes[0];
    assert.strictEqual(missingCostume.name, 'GreenGuy');
    // Costume should have both default cosutme (e.g. Gray Question Mark) data and original data
    assert.strictEqual(missingCostume.assetId, missingCostumeAssetId);
    assert.strictEqual(missingCostume.dataFormat, 'png');
    // Test that we didn't save any data about the costume being broken
    assert.ok(!missingCostume.broken);
});

test('serializeCostume does not save data for missing costume', () => {
    const costumeDescs = serializeCostumes(vm.runtime);

    assert.strictEqual(costumeDescs.length, 1); // Should only have one costume, the backdrop
    assert.notStrictEqual(costumeDescs[0].fileName, `${missingCostumeAssetId}.png`);
});
