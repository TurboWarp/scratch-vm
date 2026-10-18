/**
 * This test ensures that the VM gracefully handles an sb3 project with
 * a missing vector costume. The VM should handle this safely by displaying
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
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');
const {serializeCostumes} = require('../../src/serialization/serialize-assets');

const projectUri = path.resolve(__dirname, '../fixtures/missing_svg.sb3');
const project = readFileToBuffer(projectUri);

const missingCostumeAssetId = 'a267f8b97ee9cf8aa9832aa0b4cfd9eb';

let vm;

beforeEach(() => {
    const storage = makeTestStorage();

    vm = new VirtualMachine();
    vm.attachStorage(storage);
    vm.attachRenderer(new FakeRenderer());

    return vm.loadProject(project);
});

test('loading sb3 project with missing vector costume file', () => {
    assert.strictEqual(vm.runtime.targets.length, 2);

    const stage = vm.runtime.targets[0];
    assert.ok(stage.isStage);

    const blueGuySprite = vm.runtime.targets[1];
    assert.strictEqual(blueGuySprite.getName(), 'Blue Square Guy');
    assert.strictEqual(blueGuySprite.getCostumes().length, 1);

    const missingCostume = blueGuySprite.getCostumes()[0];
    assert.strictEqual(missingCostume.name, 'costume1');
    // Costume should have both default cosutme (e.g. Gray Question Mark) data and original data
    const defaultVectorAssetId = vm.runtime.storage.defaultAssetId.ImageVector;
    assert.strictEqual(missingCostume.assetId, defaultVectorAssetId);
    assert.strictEqual(missingCostume.dataFormat, 'svg');
    // Runtime should have info about broken asset
    assert.ok(missingCostume.broken);
    assert.strictEqual(missingCostume.broken.assetId, missingCostumeAssetId);
});

test('load and then save sb3 project with missing costume file', () => {
    const resavedProject = JSON.parse(vm.toJSON());

    assert.strictEqual(resavedProject.targets.length, 2);

    const stage = resavedProject.targets[0];
    assert.ok(stage.isStage);

    const blueGuySprite = resavedProject.targets[1];
    assert.strictEqual(blueGuySprite.name, 'Blue Square Guy');
    assert.strictEqual(blueGuySprite.costumes.length, 1);

    const missingCostume = blueGuySprite.costumes[0];
    assert.strictEqual(missingCostume.name, 'costume1');
    // Costume should have both default cosutme (e.g. Gray Question Mark) data and original data
    assert.strictEqual(missingCostume.assetId, missingCostumeAssetId);
    assert.strictEqual(missingCostume.dataFormat, 'svg');
    // Test that we didn't save any data about the costume being broken
    assert.ok(!missingCostume.broken);
});

test('serializeCostume does not save data for missing costume', () => {
    const costumeDescs = serializeCostumes(vm.runtime);

    assert.strictEqual(costumeDescs.length, 1); // Should only have one costume, the backdrop
    assert.notStrictEqual(costumeDescs[0].fileName, `${missingCostumeAssetId}.svg`);
});
