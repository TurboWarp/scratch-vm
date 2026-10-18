const {loadCostume} = require('../../src/import/load-costume');
const {loadSound} = require('../../src/import/load-sound');
const Runtime = require('../../src/engine/runtime');
const makeTestStorage = require('../fixtures/make-test-storage');
const FakeRenderer = require('../fixtures/fake-renderer');
const FakeBitmapAdapter = require('../fixtures/fake-bitmap-adapter');
const {test} = require('node:test');
const assert = require('node:assert');

global.Image = function () {
    const image = {
        width: 10,
        height: 10
    };
    setTimeout(() => {
        if (image.onload) {
            image.onload();
        }
    });
    return image;
};

class FakeAudioEngine {
    decodeSoundPlayer () {
        return Promise.resolve({
            id: 0,
            buffer: {
                sampleRate: 1,
                length: 1
            }
        });
    }
}

test('load bitmap in packaged runtime', async () => {
    const rt = new Runtime();
    rt.convertToPackagedRuntime();
    rt.attachRenderer(new FakeRenderer());
    rt.attachV2BitmapAdapter(new FakeBitmapAdapter());
    const storage = makeTestStorage();
    rt.attachStorage(storage);
    const asset = storage.createAsset(
        storage.AssetType.ImageBitmap,
        storage.DataFormat.PNG,
        new ArrayBuffer(10),
        null,
        true
    );
    const costume = await loadCostume(`${asset.assetId}.png`, {asset}, rt);
    assert.strictEqual(costume.asset, null);
});

test('load vector in packaged runtime', async () => {
    const rt = new Runtime();
    rt.convertToPackagedRuntime();
    rt.attachRenderer(new FakeRenderer());
    const storage = makeTestStorage();
    rt.attachStorage(storage);
    const asset = storage.createAsset(
        storage.AssetType.ImageVector,
        storage.DataFormat.SVG,
        new ArrayBuffer(10),
        null,
        true
    );
    const costume = await loadCostume(`${asset.assetId}.svg`, {asset}, rt);
    assert.strictEqual(costume.asset, null);
});

test('load sound in packaged runtime', async () => {
    const rt = new Runtime();
    rt.convertToPackagedRuntime();
    const storage = makeTestStorage();
    rt.attachStorage(storage);
    rt.attachAudioEngine(new FakeAudioEngine());
    const asset = storage.createAsset(
        storage.AssetType.Sound,
        storage.DataFormat.MP3,
        new ArrayBuffer(10),
        null,
        true
    );
    const costume = await loadSound({
        asset,
        md5: `${asset.assetId}.mp3`
    }, rt, null);
    assert.strictEqual(costume.asset, null);
});

test('storage.createAsset never generates real asset IDs', () => {
    const rt = new Runtime();
    rt.convertToPackagedRuntime();
    const storage = makeTestStorage();
    rt.attachStorage(storage);
    const shouldUseGivenID = storage.createAsset(
        storage.AssetType.ImageBitmap,
        storage.DataFormat.PNG,
        new ArrayBuffer(10),
        'a'.repeat(32)
    );
    assert.strictEqual(shouldUseGivenID.assetId, 'a'.repeat(32));
    const shouldUseFakeID = storage.createAsset(
        storage.AssetType.ImageBitmap,
        storage.DataFormat.PNG,
        new ArrayBuffer(11),
        null,
        true
    );
    assert.strictEqual(shouldUseFakeID.assetId, '1');
    const shouldUseDifferentFakeID = storage.createAsset(
        storage.AssetType.ImageBitmap,
        storage.DataFormat.PNG,
        new ArrayBuffer(12),
        null,
        true
    );
    assert.strictEqual(shouldUseDifferentFakeID.assetId, '2');
});
