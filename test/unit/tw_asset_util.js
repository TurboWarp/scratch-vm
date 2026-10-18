const {test} = require('node:test');
const assert = require('node:assert');
const JSZip = require('@turbowarp/jszip');
const makeTestStorage = require('../fixtures/make-test-storage');
const AssetUtil = require('../../src/util/tw-asset-util');
const Runtime = require('../../src/engine/runtime');

test('getByMd5ext from zip root', async () => {
    const rt = new Runtime();
    rt.attachStorage(makeTestStorage());
    rt.storage.load = () => assert.fail('should not call storage.load()');

    const zip = new JSZip();
    zip.file('00000000000000000000000000000000.svg', new Uint8Array([1, 2, 3]));

    const asset = await AssetUtil.getByMd5ext(
        rt, zip, rt.storage.AssetType.SVG, '00000000000000000000000000000000.svg'
    );
    assert.deepEqual(asset.data, new Uint8Array([1, 2, 3]));
});

test('getByMd5ext from zip subdirectory', async () => {
    const rt = new Runtime();
    rt.attachStorage(makeTestStorage());
    rt.storage.load = () => assert.fail('should not call storage.load()');

    const zip = new JSZip();
    zip.file('folder/00000000000000000000000000000000.svg', new Uint8Array([25, 26, 27]));

    const asset = await AssetUtil.getByMd5ext(
        rt, zip, rt.storage.AssetType.SVG, '00000000000000000000000000000000.svg'
    );
    assert.deepEqual(asset.data, new Uint8Array([25, 26, 27]));
});

test('getByMd5ext from storage with null zip', async t => {
    t.plan(4);

    const rt = new Runtime();
    rt.attachStorage(makeTestStorage());

    rt.storage.load = (assetType, md5, ext) => {
        t.assert.strictEqual(assetType, rt.storage.AssetType.SVG);
        t.assert.strictEqual(md5, '00000000000000000000000000000000');
        t.assert.strictEqual(ext, 'svg');
        return Promise.resolve({
            fromStorage: true
        });
    };

    const asset = await AssetUtil.getByMd5ext(
        rt, null, rt.storage.AssetType.SVG, '00000000000000000000000000000000.svg'
    );
    t.assert.ok(asset.fromStorage);
});
