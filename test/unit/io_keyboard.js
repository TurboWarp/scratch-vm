const {test} = require('node:test');
const assert = require('node:assert');
const Keyboard = require('../../src/io/keyboard');
const Runtime = require('../../src/engine/runtime');

test('spec', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    assert.strictEqual(typeof k, 'object');
    assert.strictEqual(typeof k.postData, 'function');
    assert.strictEqual(typeof k.getKeyIsDown, 'function');
});

test('space key', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    k.postData({
        key: ' ',
        isDown: true
    });
    assert.deepStrictEqual(k._keysPressed, ['space']);
    assert.strictEqual(k.getKeyIsDown('space'), true);
    assert.strictEqual(k.getKeyIsDown('any'), true);
});

test('letter key', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    k.postData({
        key: 'a',
        isDown: true
    });
    assert.deepStrictEqual(k._keysPressed, ['A']);
    assert.strictEqual(k.getKeyIsDown(65), true);
    assert.strictEqual(k.getKeyIsDown('a'), true);
    assert.strictEqual(k.getKeyIsDown('A'), true);
    assert.strictEqual(k.getKeyIsDown('any'), true);
});

test('number key', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    k.postData({
        key: '1',
        isDown: true
    });
    assert.deepStrictEqual(k._keysPressed, ['1']);
    assert.strictEqual(k.getKeyIsDown(49), true);
    assert.strictEqual(k.getKeyIsDown('1'), true);
    assert.strictEqual(k.getKeyIsDown('any'), true);
});

test('non-english key', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    k.postData({
        key: '日',
        isDown: true
    });
    assert.deepStrictEqual(k._keysPressed, ['日']);
    assert.strictEqual(k.getKeyIsDown('日'), true);
    assert.strictEqual(k.getKeyIsDown('any'), true);
});

/* TW: This test is disabled because we intentionally add support for modifier keys.
test('ignore modifier key', t => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    k.postData({
        key: 'Shift',
        isDown: true
    });
    t.strictDeepEquals(k._keysPressed, []);
    t.strictEquals(k.getKeyIsDown('any'), false);
    t.end();
});
*/

test('keyup', () => {
    const rt = new Runtime();
    const k = new Keyboard(rt);

    k.postData({
        key: 'ArrowLeft',
        isDown: true
    });
    k.postData({
        key: 'ArrowLeft',
        isDown: false
    });
    assert.deepStrictEqual(k._keysPressed, []);
    assert.strictEqual(k.getKeyIsDown('left arrow'), false);
    assert.strictEqual(k.getKeyIsDown('any'), false);
});
