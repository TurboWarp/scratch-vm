const {test} = require('tap');
const JSZip = require('jszip');
const makeTestStorage = require('../fixtures/make-test-storage');
const AssetUtil = require('../../src/util/tw-asset-util');
const Runtime = require('../../src/engine/runtime');

test('getByMd5ext from zip root', t => {
    const rt = new Runtime();
    rt.attachStorage(makeTestStorage());
    rt.storage.load = () => t.fail('should not call storage.load()');

    const zip = new JSZip();
    zip.file('00000000000000000000000000000000.svg', new Uint8Array([1, 2, 3]));

    AssetUtil.getByMd5ext(rt, zip, rt.storage.AssetType.SVG, '00000000000000000000000000000000.svg')
        .then(asset => {
            t.same(asset.data, new Uint8Array([1, 2, 3]));
            t.end();
        });
});

test('getByMd5ext from zip subdirectory', t => {
    const rt = new Runtime();
    rt.attachStorage(makeTestStorage());
    rt.storage.load = () => t.fail('should not call storage.load()');

    const zip = new JSZip();
    zip.file('folder/00000000000000000000000000000000.svg', new Uint8Array([25, 26, 27]));

    AssetUtil.getByMd5ext(rt, zip, rt.storage.AssetType.SVG, '00000000000000000000000000000000.svg')
        .then(asset => {
            t.same(asset.data, new Uint8Array([25, 26, 27]));
            t.end();
        });
});

test('getByMd5ext from storage with null zip', t => {
    t.plan(4);

    const rt = new Runtime();
    rt.attachStorage(makeTestStorage());

    rt.storage.load = (assetType, md5, ext) => {
        t.equal(assetType, rt.storage.AssetType.SVG);
        t.equal(md5, '00000000000000000000000000000000');
        t.equal(ext, 'svg');
        return Promise.resolve({
            fromStorage: true
        });
    };

    AssetUtil.getByMd5ext(rt, null, rt.storage.AssetType.SVG, '00000000000000000000000000000000.svg')
        .then(asset => {
            t.ok(asset.fromStorage);
            t.end();
        });
});
