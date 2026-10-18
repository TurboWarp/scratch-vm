const newBlockIds = require('../../src/util/new-block-ids');
const simpleStack = require('../fixtures/simple-stack');
const {test, beforeEach} = require('node:test');
const assert = require('node:assert');

let originals;
let newBlocks;

beforeEach(() => {
    originals = simpleStack;
    // Will be mutated so make a copy first
    newBlocks = JSON.parse(JSON.stringify(simpleStack));
    newBlockIds(newBlocks);
});


/**
 * The structure of the simple stack is:
 *      moveTo (looks_size) -> stopAllSounds
 * The list of blocks is
 *      0: moveTo (TO input block: 1, shadow: 2)
 *      1: looks_size (parent: 0)
 *      2: obscured shadow for moveTo input (parent: 0)
 *      3: stopAllSounds (parent: 0)
 * Inspect fixtures/simple-stack for the full object.
 */

test('top-level block IDs have all changed', () => {
    newBlocks.forEach((block, i) => {
        assert.notStrictEqual(block.id, originals[i].id);
    });
});

test('input reference is maintained on parent for attached block', () => {
    assert.strictEqual(newBlocks[0].inputs.TO.block, newBlocks[1].id);
});

test('input reference is maintained on parent for obscured shadow', () => {
    assert.strictEqual(newBlocks[0].inputs.TO.shadow, newBlocks[2].id);
});

test('parent reference is maintained for attached input', () => {
    assert.strictEqual(newBlocks[1].parent, newBlocks[0].id);
});

test('parent reference is maintained for obscured shadow', () => {
    assert.strictEqual(newBlocks[2].parent, newBlocks[0].id);
});

test('parent reference is maintained for next block', () => {
    assert.strictEqual(newBlocks[3].parent, newBlocks[0].id);
});

test('next reference is maintained for previous block', () => {
    assert.strictEqual(newBlocks[0].next, newBlocks[3].id);
});
