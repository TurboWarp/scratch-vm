const {test} = require('tap');
const Runtime = require('../../src/engine/runtime');
const VirtualMachine = require('../../src/virtual-machine');
const makeTestStorage = require('../fixtures/make-test-storage');
const {loadCostume} = require('../../src/import/load-costume');
const {loadSound} = require('../../src/import/load-sound');
const AssetUtil = require('../../src/util/tw-asset-util');

test('emitAssetProgress', t => {
    const vm = new VirtualMachine();

    let runtimeOK = false;
    let vmOK = false;
    vm.runtime.on('ASSET_PROGRESS', (finished, total) => {
        t.equal(finished, 1, 'runtime finished');
        t.equal(total, 2, 'runtime total');
        runtimeOK = true;
    });
    vm.on('ASSET_PROGRESS', (finished, total) => {
        t.equal(finished, 1, 'vm finished');
        t.equal(total, 2, 'vm total');
        vmOK = true;
    });

    vm.runtime.totalStorageRequests = 2;
    vm.runtime.finishedStorageRequests = 1;
    vm.runtime.emitAssetProgress();

    t.ok(runtimeOK, 'runtime');
    t.ok(vmOK, 'vm');
    t.end();
});

test('dispose', t => {
    t.plan(4);

    const runtime = new Runtime();
    runtime.finishedStorageRequests = 10;
    runtime.totalStorageRequests = 10;

    runtime.on('ASSET_PROGRESS', (finished, total) => {
        t.equal(finished, 0, 'event finished');
        t.equal(total, 0, 'event total');
    });

    runtime.dispose();

    t.equal(runtime.finishedStorageRequests, 0, 'property finishedStorageRequests');
    t.equal(runtime.totalStorageRequests, 0, 'property totalStorageRequests');
    t.end();
});

test('loadFromStorage', t => {
    const runtime = new Runtime();

    const storage = makeTestStorage();
    storage.load = (assetType, assetId) => {
        if (assetId === 'bad') {
            // eslint-disable-next-line prefer-promise-reject-errors
            return Promise.reject('Bad :(');
        }
        return Promise.resolve({
            assetId
        });
    };
    runtime.attachStorage(storage);

    const log = [];
    runtime.on('ASSET_PROGRESS', (finished, total) => {
        log.push([finished, total]);
    });

    Promise.all([
        runtime.loadFromStorage(storage.AssetType.ImageBitmap, '1234', 'png'),
        runtime.loadFromStorage(storage.AssetType.ImageBitmap, '5678', 'png')
    ]).then(assets => {
        t.same(assets.map(i => i.assetId), [
            '1234',
            '5678'
        ]);

        runtime.loadFromStorage(storage.AssetType.ImageBitmap, 'bad', 'png').catch(error => {
            t.equal(error, 'Bad :(');
            t.same(log, [
                [0, 1],
                [0, 2],
                [1, 2],
                [2, 2],
                [2, 3],
                [3, 3]
            ]);
            t.end();
        });
    });
});

test('load costume emits progress', t => {
    const runtime = new Runtime();

    const storage = makeTestStorage();
    storage.load = (assetType, assetId) => Promise.resolve({
        assetId
    });
    runtime.attachStorage(storage);

    const log = [];
    runtime.on('ASSET_PROGRESS', (finished, total) => {
        log.push([finished, total]);
    });

    loadCostume('1234.png', {}, runtime).then(() => {
        t.same(log, [
            [0, 1],
            [1, 1]
        ]);
        t.end();
    });
});

test('load sound emits progress', t => {
    const runtime = new Runtime();

    const storage = makeTestStorage();
    storage.load = (assetType, assetId) => Promise.resolve({
        assetId
    });
    runtime.attachStorage(storage);

    const log = [];
    runtime.on('ASSET_PROGRESS', (finished, total) => {
        log.push([finished, total]);
    });

    loadSound({md5: '1234.wav'}, runtime).then(() => {
        t.same(log, [
            [0, 1],
            [1, 1]
        ]);
        t.end();
    });
});

test('asset util emits progress', t => {
    const runtime = new Runtime();

    const storage = makeTestStorage();
    storage.load = (assetType, assetId) => Promise.resolve({
        assetId
    });
    runtime.attachStorage(storage);

    const log = [];
    runtime.on('ASSET_PROGRESS', (finished, total) => {
        log.push([finished, total]);
    });

    AssetUtil.getByMd5ext(runtime, null, runtime.storage.AssetType.SVG, 'abcdef.svg').then(asset => {
        t.same(log, [
            [0, 1],
            [1, 1]
        ]);
        t.end();
    });
});
