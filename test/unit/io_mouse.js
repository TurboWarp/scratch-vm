const {test} = require('node:test');
const assert = require('node:assert');
const Mouse = require('../../src/io/mouse');
const Runtime = require('../../src/engine/runtime');

test('spec', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    assert.strictEqual(typeof m, 'object');
    assert.strictEqual(typeof m.postData, 'function');
    assert.strictEqual(typeof m.getClientX, 'function');
    assert.strictEqual(typeof m.getClientY, 'function');
    assert.strictEqual(typeof m.getScratchX, 'function');
    assert.strictEqual(typeof m.getScratchY, 'function');
    assert.strictEqual(typeof m.getIsDown, 'function');
});

test('mouseUp', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: -20,
        y: 10,
        isDown: false,
        canvasWidth: 480,
        canvasHeight: 360
    });
    assert.strictEqual(m.getClientX(), -20);
    assert.strictEqual(m.getClientY(), 10);
    assert.strictEqual(m.getScratchX(), -240);
    assert.strictEqual(m.getScratchY(), 170);
    assert.strictEqual(m.getIsDown(), false);
});

test('mouseDown', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: 9.9,
        y: 400.1,
        isDown: true,
        canvasWidth: 480,
        canvasHeight: 360
    });
    assert.strictEqual(m.getClientX(), 9.9);
    assert.strictEqual(m.getClientY(), 400.1);
    assert.strictEqual(m.getScratchX(), -230);
    assert.strictEqual(m.getScratchY(), -180);
    assert.strictEqual(m.getIsDown(), true);
});

test('at zoomed scale', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: 240,
        y: 540,
        canvasWidth: 960,
        canvasHeight: 720
    });
    assert.strictEqual(m.getClientX(), 240);
    assert.strictEqual(m.getClientY(), 540);
    assert.strictEqual(m.getScratchX(), -120);
    assert.strictEqual(m.getScratchY(), -90);
});

test('mousedown activating click hats', () => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    const mouseMoveEvent = {
        x: 10,
        y: 100,
        canvasWidth: 480,
        canvasHeight: 360
    };

    const dummyTarget = {
        draggable: false
    };

    const mouseDownEvent = Object.assign({}, mouseMoveEvent, {
        isDown: true
    });

    const mouseUpEvent = Object.assign({}, mouseMoveEvent, {
        isDown: false
    });

    // Stub activateClickHats and pick function for testing
    let ranClickHats = false;
    m._activateClickHats = () => {
        ranClickHats = true;
    };
    m._pickTarget = () => dummyTarget;

    // Mouse move without mousedown
    m.postData(mouseMoveEvent);
    assert.strictEqual(ranClickHats, false);

    // Mouse down event triggers the hats if target is not draggable
    dummyTarget.draggable = false;
    m.postData(mouseDownEvent);
    assert.strictEqual(ranClickHats, true);

    // But another mouse move while down doesn't trigger
    ranClickHats = false;
    m.postData(mouseDownEvent);
    assert.strictEqual(ranClickHats, false);

    // And it does trigger on mouse up if target is draggable
    ranClickHats = false;
    dummyTarget.draggable = true;
    m.postData(mouseUpEvent);
    assert.strictEqual(ranClickHats, true);

    // And hats don't trigger if mouse down is outside canvas
    ranClickHats = false;
    m.postData(Object.assign({}, mouseDownEvent, {
        x: 50000,
        y: 50
    }));
    assert.strictEqual(ranClickHats, false);
});
