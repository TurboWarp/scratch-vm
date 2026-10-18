const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const extractProjectJson = require('../fixtures/readProjectFile').extractProjectJson;

const renderedTarget = require('../../src/sprites/rendered-target');
const runtime = require('../../src/engine/runtime');
const sb2 = require('../../src/serialization/sb2');

test('spec', () => {
    assert.strictEqual(typeof sb2.deserialize, 'function');
});

test('nested default/*', async () => {
    // Get SB2 JSON (string)
    const uri = path.resolve(__dirname, '../fixtures/default_nested.sb2');
    const json = extractProjectJson(uri, 'default');

    // Create runtime instance & load SB2 into it
    const rt = new runtime();
    rt.attachStorage(makeTestStorage());
    const {targets} = await sb2.deserialize(json, rt);
    // Test
    assert.strictEqual(typeof json, 'object');
    assert.strictEqual(typeof rt, 'object');
    assert.strictEqual(typeof targets, 'object');

    assert.ok(targets[0] instanceof renderedTarget);
    assert.strictEqual(typeof targets[0].id, 'string');
    assert.strictEqual(typeof targets[0].blocks, 'object');
    assert.strictEqual(typeof targets[0].variables, 'object');
    assert.strictEqual(typeof targets[0].comments, 'object');

    assert.strictEqual(targets[0].isOriginal, true);
    assert.strictEqual(targets[0].currentCostume, 0);
    assert.strictEqual(targets[0].isOriginal, true);
    assert.strictEqual(targets[0].isStage, true);

    assert.ok(targets[1] instanceof renderedTarget);
    assert.strictEqual(typeof targets[1].id, 'string');
    assert.strictEqual(typeof targets[1].blocks, 'object');
    assert.strictEqual(typeof targets[1].variables, 'object');
    assert.strictEqual(typeof targets[1].comments, 'object');

    assert.strictEqual(targets[1].isOriginal, true);
    assert.strictEqual(targets[1].currentCostume, 0);
    assert.strictEqual(targets[1].isOriginal, true);
    assert.strictEqual(targets[1].isStage, false);
});
