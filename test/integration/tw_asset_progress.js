const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Runtime = require('../../src/engine/runtime');
const VirtualMachine = require('../../src/virtual-machine');
const makeTestStorage = require('../fixtures/make-test-storage');
const AssetUtil = require('../../src/util/tw-asset-util');

test('emitAssetProgress', () => {
    const vm = new VirtualMachine();

    let runtimeOK = false;
    let vmOK = false;
    vm.runtime.on('ASSET_PROGRESS', (finished, total) => {
        assert.strictEqual(finished, 1, 'runtime finished');
        assert.strictEqual(total, 2, 'runtime total');
        runtimeOK = true;
    });
    vm.on('ASSET_PROGRESS', (finished, total) => {
        assert.strictEqual(finished, 1, 'vm finished');
        assert.strictEqual(total, 2, 'vm total');
        vmOK = true;
    });

    vm.runtime.totalAssetRequests = 2;
    vm.runtime.finishedAssetRequests = 1;
    vm.runtime.emitAssetProgress();

    assert.ok(runtimeOK, 'runtime');
    assert.ok(vmOK, 'vm');
});

test('resetProgress', t => {
    t.plan(4);

    const runtime = new Runtime();
    runtime.finishedAssetRequests = 10;
    runtime.totalAssetRequests = 10;

    runtime.on('ASSET_PROGRESS', (finished, total) => {
        t.assert.strictEqual(finished, 0, 'event finished');
        t.assert.strictEqual(total, 0, 'event total');
    });

    runtime.resetProgress();

    t.assert.strictEqual(runtime.finishedAssetRequests, 0, 'property finishedAssetRequests');
    t.assert.strictEqual(runtime.totalAssetRequests, 0, 'property totalAssetRequests');
});

test('dispose', t => {
    t.plan(1);
    const runtime = new Runtime();
    runtime.resetProgress = () => {
        t.assert.ok(true);
    };
    runtime.dispose();
});

test('wrapAssetRequest', (t, done) => {
    const runtime = new Runtime();

    const log = [];
    runtime.on('ASSET_PROGRESS', (finished, total) => {
        log.push([finished, total]);
    });

    Promise.all([
        runtime.wrapAssetRequest(() => Promise.resolve(1)),
        runtime.wrapAssetRequest(() => Promise.resolve(2))
    ]).then(results => {
        assert.deepEqual(results, [1, 2]);

        // eslint-disable-next-line prefer-promise-reject-errors
        runtime.wrapAssetRequest(() => Promise.reject(3)).catch(error => {
            assert.strictEqual(error, 3);
            assert.deepEqual(log, [
                [0, 1],
                [0, 2],
                [1, 2],
                [2, 2],
                [2, 3],
                [3, 3]
            ]);
            done();
        });
    });
});

test('asset util emits progress', async () => {
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

    await AssetUtil.getByMd5ext(runtime, null, runtime.storage.AssetType.SVG, 'abcdef.svg');
    assert.deepEqual(log, [
        [0, 1],
        [1, 1]
    ]);
});

//  For the next tests, we have some fixtures that contain 2 assets: 1 sound + 1 costume
// We'll just load them and make sure that each deserializer emits reasonable progress events
for (const format of ['sb', 'sb2', 'sb3']) {
    test(format, async () => {
        const fixture = fs.readFileSync(path.join(__dirname, `../fixtures/tw-asset-progress.${format}`));
        const vm = new VirtualMachine();
    
        const log = [];
        vm.on('ASSET_PROGRESS', (finished, total) => {
            log.push([finished, total]);
        });
    
        await vm.loadProject(fixture);
        assert.deepEqual(log, [
            [0, 0], // loadProject() implies dispose()
            [0, 1],
            [0, 2],
            [1, 2],
            [2, 2]
        ]);
    });
}
