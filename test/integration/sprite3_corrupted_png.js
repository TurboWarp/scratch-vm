/**
 * This test mocks render breaking on loading a sprite3 with a
 * corrupted bitmap costume.
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
const FakeBitmapAdapter = require('../fixtures/fake-bitmap-adapter');
const {extractAsset, readFileToBuffer} = require('../fixtures/readProjectFile');
const VirtualMachine = require('../../src/index');
const {serializeCostumes} = require('../../src/serialization/serialize-assets');

const projectUri = path.resolve(__dirname, '../fixtures/default.sb3');
const project = readFileToBuffer(projectUri);

const spriteUri = path.resolve(__dirname, '../fixtures/corrupt_png.sprite3');
const sprite = readFileToBuffer(spriteUri);

const costumeFileName = 'e1320c21995dcf6de10119be7f08c26b.png';
const originalCostume = extractAsset(spriteUri, costumeFileName);
// We need to get the actual md5 because we hand modified the png to corrupt it
// after we downloaded the project from Scratch
// Loading the project back into the VM will correct the assetId and md5
const brokenCostumeMd5 = md5(originalCostume);

global.Image = function () {
    const image = {
        width: 1,
        height: 1
    };
    setTimeout(() => {
        const base64Image = image.src.split(',')[1];
        const decodedText = Buffer.from(base64Image, 'base64').toString();
        if (decodedText.includes('Here is some')) {
            image.onerror();
        } else {
            image.onload();
        }
    }, 100);
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
let defaultBitmapAssetId;


beforeEach(async () => {
    const storage = makeTestStorage();

    vm = new VirtualMachine();
    vm.attachStorage(storage);
    defaultBitmapAssetId = vm.runtime.storage.defaultAssetId.ImageBitmap;

    vm.attachRenderer(new FakeRenderer());
    vm.attachV2BitmapAdapter(new FakeBitmapAdapter());

    await vm.loadProject(project);
    return vm.addSprite(sprite);
});

test('load sprite3 with corrupted bitmap costume file', () => {
    assert.strictEqual(vm.runtime.targets.length, 3);

    const stage = vm.runtime.targets[0];
    assert.ok(stage.isStage);

    const greenGuySprite = vm.runtime.targets[2];
    assert.strictEqual(greenGuySprite.getName(), 'Green Guy');
    assert.strictEqual(greenGuySprite.getCostumes().length, 1);

    const corruptedCostume = greenGuySprite.getCostumes()[0];
    assert.strictEqual(corruptedCostume.name, 'Green Guy');
    assert.strictEqual(corruptedCostume.assetId, defaultBitmapAssetId);
    assert.strictEqual(corruptedCostume.dataFormat, 'png');
    // Runtime should have info about broken asset
    assert.ok(corruptedCostume.broken);
    assert.strictEqual(corruptedCostume.broken.assetId, brokenCostumeMd5);
    // Verify that we saved the original asset data
    assert.strictEqual(md5(corruptedCostume.broken.asset.data), brokenCostumeMd5);
});

test('load and then save sprite with corrupted costume file', () => {
    const resavedSprite = JSON.parse(vm.toJSON(vm.runtime.targets[2].id));

    assert.strictEqual(resavedSprite.name, 'Green Guy');
    assert.strictEqual(resavedSprite.costumes.length, 1);

    const corruptedCostume = resavedSprite.costumes[0];
    assert.strictEqual(corruptedCostume.name, 'Green Guy');
    // Resaved project costume should have the metadata that corresponds to the original broken costume
    assert.strictEqual(corruptedCostume.assetId, brokenCostumeMd5);
    assert.strictEqual(corruptedCostume.dataFormat, 'png');
    // Test that we didn't save any data about the costume being broken
    assert.ok(!corruptedCostume.broken);
});

test('serializeCostume saves orignal broken costume', () => {
    const costumeDescs = serializeCostumes(vm.runtime, vm.runtime.targets[2].id);
    assert.strictEqual(costumeDescs.length, 1);
    const costume = costumeDescs[0];
    assert.strictEqual(costume.fileName, `${brokenCostumeMd5}.png`);
    assert.strictEqual(md5(costume.fileContent), brokenCostumeMd5);
});
