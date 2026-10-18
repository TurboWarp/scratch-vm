const Runtime = require('../../src/engine/runtime');
const Sprite = require('../../src/sprites/sprite');

const {test} = require('node:test');
const assert = require('node:assert');

test('clone counter', () => {
    const rt = new Runtime();
    const sprite = new Sprite(null, rt);
    const original = sprite.createClone();
    assert.strictEqual(rt._cloneCounter, 0);
    const clone = original.makeClone();
    assert.strictEqual(rt._cloneCounter, 1);
    clone.dispose();
    assert.strictEqual(rt._cloneCounter, 0);
    original.dispose();
    assert.strictEqual(rt._cloneCounter, 0);
});
