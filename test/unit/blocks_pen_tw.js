const {test} = require('node:test');
const assert = require('node:assert');

const Runtime = require('../../src/engine/runtime');
const Scratch3PenBlocks = require('../../src/extensions/scratch3_pen/index');

test('_clampPenSize', () => {
    const rt = new Runtime();
    const pen = new Scratch3PenBlocks(rt);

    assert.strictEqual(pen._clampPenSize(-1), 1);
    assert.strictEqual(pen._clampPenSize(0), 1);
    assert.strictEqual(pen._clampPenSize(0.25), 1);
    assert.strictEqual(pen._clampPenSize(1), 1);
    assert.strictEqual(pen._clampPenSize(10), 10);
    assert.strictEqual(pen._clampPenSize(1000), 1000);
    assert.strictEqual(pen._clampPenSize(1200), 1200);
    assert.strictEqual(pen._clampPenSize(1201), 1200);

    rt.setRuntimeOptions({
        miscLimits: false
    });
    assert.strictEqual(pen._clampPenSize(-1), 0);
    assert.strictEqual(pen._clampPenSize(0), 0);
    assert.strictEqual(pen._clampPenSize(0.25), 0.25);
    assert.strictEqual(pen._clampPenSize(1), 1);
    assert.strictEqual(pen._clampPenSize(10), 10);
    assert.strictEqual(pen._clampPenSize(1000), 1000);
    assert.strictEqual(pen._clampPenSize(1200), 1200);
    assert.strictEqual(pen._clampPenSize(1201), 1201);
});
