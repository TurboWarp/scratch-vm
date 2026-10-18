const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const extractProjectJson = require('../fixtures/readProjectFile').extractProjectJson;

const RenderedTarget = require('../../src/sprites/rendered-target');
const Runtime = require('../../src/engine/runtime');
const sb2 = require('../../src/serialization/sb2');

test('spec', () => {
    assert.strictEqual(typeof sb2, 'object');
    assert.strictEqual(typeof sb2.deserialize, 'function');
});

test('default', async () => {
    // Get SB2 JSON (string)
    const uri = path.resolve(__dirname, '../fixtures/default.sb2');
    const json = extractProjectJson(uri);

    // Create runtime instance & load SB2 into it
    const rt = new Runtime();
    const {targets} = await sb2.deserialize(json, rt);
    // Test
    assert.strictEqual(typeof json, 'object');
    assert.strictEqual(typeof rt, 'object');
    assert.strictEqual(typeof targets, 'object');

    assert.ok(targets[0] instanceof RenderedTarget);
    assert.strictEqual(typeof targets[0].id, 'string');
    assert.strictEqual(typeof targets[0].blocks, 'object');
    assert.strictEqual(typeof targets[0].variables, 'object');
    assert.strictEqual(typeof targets[0].comments, 'object');

    assert.strictEqual(targets[0].isOriginal, true);
    assert.strictEqual(targets[0].currentCostume, 0);
    assert.strictEqual(targets[0].isOriginal, true);
    assert.strictEqual(targets[0].isStage, true);

    assert.ok(targets[1] instanceof RenderedTarget);
    assert.strictEqual(typeof targets[1].id, 'string');
    assert.strictEqual(typeof targets[1].blocks, 'object');
    assert.strictEqual(typeof targets[1].variables, 'object');
    assert.strictEqual(typeof targets[1].comments, 'object');

    assert.strictEqual(targets[1].isOriginal, true);
    assert.strictEqual(targets[1].currentCostume, 0);
    assert.strictEqual(targets[1].isOriginal, true);
    assert.strictEqual(targets[1].isStage, false);
});

test('data scoping', async () => {
    // Get SB2 JSON (string)
    const uri = path.resolve(__dirname, '../fixtures/data.sb2');
    const json = extractProjectJson(uri);

    // Create runtime instance & load SB2 into it
    const rt = new Runtime();
    const {targets} = await sb2.deserialize(json, rt);
    const globalVariableIds = Object.keys(targets[0].variables);
    const localVariableIds = Object.keys(targets[1].variables);
    assert.strictEqual(targets[0].variables[globalVariableIds[0]].name, 'foo');
    assert.strictEqual(targets[1].variables[localVariableIds[0]].name, 'local');
});

test('whenclicked blocks imported separately', async () => {
    // This sb2 fixture has a single "whenClicked" block on both sprite and stage
    const uri = path.resolve(__dirname, '../fixtures/when-clicked.sb2');
    const json = extractProjectJson(uri);

    // Create runtime instance & load SB2 into it
    const rt = new Runtime();
    const {targets} = await sb2.deserialize(json, rt);
    const stage = targets[0];
    assert.strictEqual(stage.isStage, true); // Make sure we have the correct target
    const stageOpcode = stage.blocks.getBlock(stage.blocks.getScripts()[0]).opcode;
    assert.strictEqual(stageOpcode, 'event_whenstageclicked');

    const sprite = targets[1];
    assert.strictEqual(sprite.isStage, false); // Make sure we have the correct target
    const spriteOpcode = sprite.blocks.getBlock(sprite.blocks.getScripts()[0]).opcode;
    assert.strictEqual(spriteOpcode, 'event_whenthisspriteclicked');
});

test('Ordering', async () => {
    // This SB2 has 3 sprites that have been reordered in scratch 2
    // so the order in the file is not the order specified by the indexInLibrary property.
    const uri = path.resolve(__dirname, '../fixtures/ordering.sb2');
    const json = extractProjectJson(uri);
    const rt = new Runtime();
    const {targets} = await sb2.deserialize(json, rt);
    // Would fail with any other ordering.
    assert.strictEqual(targets[1].sprite.name, 'First');
    assert.strictEqual(targets[2].sprite.name, 'Second');
    assert.strictEqual(targets[3].sprite.name, 'Third');
});
