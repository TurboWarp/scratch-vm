const {loadCostume} = require('../../src/import/load-costume');
const Runtime = require('../../src/engine/runtime');
const makeTestStorage = require('../fixtures/make-test-storage');
const FakeRenderer = require('../fixtures/fake-renderer');
const {test} = require('node:test');

test('importing SVG with stored rotation center', async t => {
    t.plan(3);
    const runtime = new Runtime();
    const storage = makeTestStorage();
    runtime.attachStorage(storage);
    const renderer = new FakeRenderer();
    renderer.createSVGSkin = (svgText, rotationCenter) => {
        // Make sure that the rotation center given to the renderer is correct
        t.assert.deepEqual(rotationCenter, [106.62300344745225, -11.822572945859918]);
        // just need to return a valid skin ID, doesn't matter
        return 1;
    };
    runtime.attachRenderer(renderer);
    const svg = new TextEncoder().encode(
        `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:106.62300344745225:-11.822572945859918-->`
    );
    const asset = storage.createAsset(storage.AssetType.ImageVector, storage.DataFormat.SVG, svg, null, true);
    const costume = await loadCostume(`${asset.assetId}.svg`, {
        asset
    }, runtime);
    t.assert.strictEqual(costume.rotationCenterX, 106.62300344745225);
    t.assert.strictEqual(costume.rotationCenterY, -11.822572945859918);
});
