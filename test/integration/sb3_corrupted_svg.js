/**
 * This test mocks render breaking on loading a corrupted vector costume.
 * The VM should handle this safely by displaying a Gray Question Mark,
 * but keeping track of the original costume data and serializing the
 * original costume data back out. The saved project.json should not
 * reflect that the costume is broken and should therefore re-attempt
 * to load the costume if the saved project is re-loaded.
 */
const path = require('path');
const {test, beforeEach} = require('node:test');
const assert = require('node:assert');
const md5 = require('js-md5');
const makeTestStorage = require('../fixtures/make-test-storage');
const FakeRenderer = require('../fixtures/fake-renderer');
const {extractAsset, readFileToBuffer} = require('../fixtures/readProjectFile');
const VirtualMachine = require('../../src/index');
const {serializeCostumes} = require('../../src/serialization/serialize-assets');

const projectUri = path.resolve(__dirname, '../fixtures/corrupt_svg.sb3');
const project = readFileToBuffer(projectUri);
const costumeFileName = 'a267f8b97ee9cf8aa9832aa0b4cfd9eb.svg';
const originalCostume = extractAsset(projectUri, costumeFileName);
// We need to get the actual md5 because we hand modified the svg to corrupt it
// after we downloaded the project from Scratch
// Loading the project back into the VM will correct the assetId and md5
const brokenCostumeMd5 = md5(originalCostume);

let vm;
let defaultVectorAssetId;

beforeEach(() => {
    const storage = makeTestStorage();

    vm = new VirtualMachine();
    vm.attachStorage(storage);
    defaultVectorAssetId = vm.runtime.storage.defaultAssetId.ImageVector;

    // Mock renderer breaking on loading a corrupt costume
    FakeRenderer.prototype.createSVGSkin = function (svgString) {
        // Look for text added to costume to make it a corrupt svg
        if (svgString.includes('<here is some')) {
            throw new Error('mock createSVGSkin broke');
        }
        return FakeRenderer._nextSkinId++;
    };

    vm.attachRenderer(new FakeRenderer());

    return vm.loadProject(project);
});

test('load sb3 project with corrupted vector costume file', () => {
    assert.strictEqual(vm.runtime.targets.length, 2);

    const stage = vm.runtime.targets[0];
    assert.ok(stage.isStage);

    const blueGuySprite = vm.runtime.targets[1];
    assert.strictEqual(blueGuySprite.getName(), 'Blue Square Guy');
    assert.strictEqual(blueGuySprite.getCostumes().length, 1);

    const corruptedCostume = blueGuySprite.getCostumes()[0];
    assert.strictEqual(corruptedCostume.name, 'costume1');
    assert.strictEqual(corruptedCostume.assetId, defaultVectorAssetId);
    assert.strictEqual(corruptedCostume.dataFormat, 'svg');
    // Runtime should have info about broken asset
    assert.ok(corruptedCostume.broken);
    assert.strictEqual(corruptedCostume.broken.assetId, brokenCostumeMd5);
    // Verify that we saved the original asset data
    assert.strictEqual(md5(corruptedCostume.broken.asset.data), brokenCostumeMd5);
});

test('load and then save project with corrupted vector costume file', () => {
    const resavedProject = JSON.parse(vm.toJSON());

    assert.strictEqual(resavedProject.targets.length, 2);

    const stage = resavedProject.targets[0];
    assert.ok(stage.isStage);

    const blueGuySprite = resavedProject.targets[1];
    assert.strictEqual(blueGuySprite.name, 'Blue Square Guy');
    assert.strictEqual(blueGuySprite.costumes.length, 1);

    const corruptedCostume = blueGuySprite.costumes[0];
    assert.strictEqual(corruptedCostume.name, 'costume1');
    // Resaved project costume should have the metadata that corresponds to the original broken costume
    assert.strictEqual(corruptedCostume.assetId, brokenCostumeMd5);
    assert.strictEqual(corruptedCostume.dataFormat, 'svg');
    // Test that we didn't save any data about the costume being broken
    assert.ok(!corruptedCostume.broken);
});

test('serializeCostume saves orignal broken costume', () => {
    const costumeDescs = serializeCostumes(vm.runtime, vm.runtime.targets[1].id);
    assert.strictEqual(costumeDescs.length, 1);
    const costume = costumeDescs[0];
    assert.strictEqual(costume.fileName, `${brokenCostumeMd5}.svg`);
    assert.strictEqual(md5(costume.fileContent), brokenCostumeMd5);
});
