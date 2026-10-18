const {test} = require('node:test');
const assert = require('node:assert');
const Keyboard = require('../../src/io/keyboard');
const Runtime = require('../../src/engine/runtime');

test('extended spec', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    assert.strictEqual(typeof k.getLastKeyPressed, 'function');
});

test('extended key support', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    k.postData({
        key: 'Backspace',
        isDown: true
    });
    assert.deepStrictEqual(k._keysPressed, ['backspace']);
    assert.strictEqual(k.getKeyIsDown('backspace'), true);
});

test('last key pressed', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    assert.strictEqual(k.getLastKeyPressed(), '');
    k.postData({
        key: 'a',
        isDown: true
    });
    assert.strictEqual(k.getLastKeyPressed(), 'a');
    k.postData({
        key: 'b',
        isDown: true
    });
    assert.strictEqual(k.getLastKeyPressed(), 'b');
});

test('holding shift and key, releasing shift, then releasing key', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    // Press Shift+2 to produce @
    k.postData({
        key: '@',
        isDown: true,
        keyCode: 50
    });
    assert.strictEqual(k.getKeyIsDown('2'), false);
    assert.strictEqual(k.getKeyIsDown('@'), true);
    assert.strictEqual(k.getKeyIsDown('any'), true);
    // Release shift, then release 2
    k.postData({
        key: 'Shift',
        isDown: false,
        keyCode: 16
    });
    k.postData({
        key: '2',
        isDown: false,
        keyCode: 50
    });
    assert.strictEqual(k.getKeyIsDown('@'), false);
    assert.strictEqual(k.getKeyIsDown('2'), false);
    assert.strictEqual(k.getKeyIsDown('any'), false);
});

test('holding shift and key, releasing shift, waiting, then releasing key', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    k.postData({
        key: '@',
        isDown: true,
        keyCode: 50
    });
    assert.strictEqual(k.getKeyIsDown('2'), false);
    assert.strictEqual(k.getKeyIsDown('@'), true);
    assert.strictEqual(k.getKeyIsDown('any'), true);
    k.postData({
        key: 'Shift',
        isDown: false,
        keyCode: 16
    });
    // But 2 is still being held, so it will send a press event
    k.postData({
        key: '2',
        isDown: true,
        keyCode: 50
    });
    assert.strictEqual(k.getKeyIsDown('@'), false);
    assert.strictEqual(k.getKeyIsDown('2'), true);
    assert.strictEqual(k.getKeyIsDown('any'), true);
    // And now we release 2
    k.postData({
        key: '2',
        isDown: false,
        keyCode: 50
    });
    assert.strictEqual(k.getKeyIsDown('@'), false);
    assert.strictEqual(k.getKeyIsDown('2'), false);
    assert.strictEqual(k.getKeyIsDown('any'), false);
});

test('hasUsedKey', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    assert.strictEqual(k.hasUsedKey('backspace'), false);
    assert.strictEqual(k.hasUsedKey('delete'), false);

    k.getKeyIsDown('backspace');
    assert.strictEqual(k.hasUsedKey('backspace'), true);
    assert.strictEqual(k.hasUsedKey('delete'), false);

    k.getKeyIsDown('delete');
    assert.strictEqual(k.hasUsedKey('backspace'), true);
    assert.strictEqual(k.hasUsedKey('delete'), true);
});
