const {test} = require('node:test');
const assert = require('node:assert');
const Mouse = require('../../src/io/mouse');
const Runtime = require('../../src/engine/runtime');

test('position clamping', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    const BIG = 9999;
    m.postData({
        x: BIG,
        y: BIG,
        canvasWidth: 480,
        canvasHeight: 360
    });
    assert.strictEqual(m.getClientX(), BIG);
    assert.strictEqual(m.getClientY(), BIG);
    assert.strictEqual(m.getScratchX(), 240);
    assert.strictEqual(m.getScratchY(), -180);
});

test('mouseButtonDown', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    assert.strictEqual(m.getButtonIsDown(0), false);
    assert.strictEqual(m.getButtonIsDown(1), false);
    assert.strictEqual(m.getButtonIsDown(2), false);
    m.postData({
        isDown: true,
        button: 0
    });
    assert.strictEqual(m.getButtonIsDown(0), true);
    assert.strictEqual(m.getButtonIsDown(1), false);
    assert.strictEqual(m.getButtonIsDown(2), false);
    m.postData({
        isDown: true,
        button: 2
    });
    assert.strictEqual(m.getButtonIsDown(0), true);
    assert.strictEqual(m.getButtonIsDown(1), false);
    assert.strictEqual(m.getButtonIsDown(2), true);
    m.postData({
        isDown: false,
        button: 2
    });
    assert.strictEqual(m.getButtonIsDown(0), true);
    assert.strictEqual(m.getButtonIsDown(1), false);
    assert.strictEqual(m.getButtonIsDown(2), false);
});

test('mouseDown with buttons', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    assert.strictEqual(m.getIsDown(), false);
    m.postData({
        isDown: true,
        button: 0
    });
    assert.strictEqual(m.getIsDown(), true);
    m.postData({
        isDown: true,
        button: 2
    });
    assert.strictEqual(m.getIsDown(), true);
    m.postData({
        isDown: false,
        button: 2
    });
    assert.strictEqual(m.getIsDown(), false);
});

test('missing button is treated as left', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    assert.strictEqual(m.getButtonIsDown(0), false);
    m.postData({
        isDown: true
    });
    assert.strictEqual(m.getButtonIsDown(0), true);
    m.postData({
        isDown: false
    });
    assert.strictEqual(m.getButtonIsDown(0), false);
});

test('usesRightClickDown', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    assert.strictEqual(m.usesRightClickDown, false);
    assert.strictEqual(m.getButtonIsDown(2), false);
    assert.strictEqual(m.usesRightClickDown, true);
});

test('no rounding when misc limits disabled', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: 241,
        y: 541,
        canvasWidth: 960,
        canvasHeight: 720
    });
    assert.strictEqual(m.getScratchX(), -119);
    assert.strictEqual(m.getScratchY(), -90);

    rt.setRuntimeOptions({
        miscLimits: false
    });
    assert.strictEqual(m.getScratchX(), -119.5);
    assert.strictEqual(m.getScratchY(), -90.5);
});

test('accepts 0 as x and y position', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: 1,
        y: 2,
        canvasWidth: 480,
        canvasHeight: 360
    });
    assert.strictEqual(m.getClientX(), 1);
    assert.strictEqual(m.getClientY(), 2);

    m.postData({
        x: 0,
        y: 0,
        canvasWidth: 480,
        canvasHeight: 360
    });
    assert.strictEqual(m.getClientX(), 0);
    assert.strictEqual(m.getClientY(), 0);
});
