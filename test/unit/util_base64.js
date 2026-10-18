const {test} = require('node:test');
const assert = require('node:assert');
const Base64Util = require('../../src/util/base64-util');

test('uint8ArrayToBase64', () => {
    assert.strictEqual(Base64Util.uint8ArrayToBase64(new Uint8Array([0, 50, 80, 200])), 'ADJQyA==');
    assert.strictEqual(Base64Util.uint8ArrayToBase64([0, 50, 80, 200]), 'ADJQyA==');
});

test('arrayBufferToBase64', () => {
    assert.strictEqual(Base64Util.arrayBufferToBase64(new Uint8Array([0, 50, 80, 200]).buffer), 'ADJQyA==');
});

test('base64ToUint8Array', () => {
    assert.deepEqual(Base64Util.base64ToUint8Array('ADJQyA=='), new Uint8Array([0, 50, 80, 200]));
});

test('round trips', () => {
    const data = [
        new Uint8Array(new Array(255)
            .fill()
            .map((_, index) => index)
        ),
        new Uint8Array(0),
        new Uint8Array([10, 90, 0, 255, 255, 255, 10, 2]),
        new Uint8Array(10000),
        new Uint8Array(100000)
    ];
    for (const uint8array of data) {
        const uint8ToBase64 = Base64Util.uint8ArrayToBase64(uint8array);
        const arrayToBase64 = Base64Util.uint8ArrayToBase64(Array.from(uint8array));
        const bufferToBase64 = Base64Util.arrayBufferToBase64(uint8array.buffer);
        assert.strictEqual(uint8ToBase64, arrayToBase64);
        assert.strictEqual(uint8ToBase64, bufferToBase64);
        const decoded = Base64Util.base64ToUint8Array(uint8ToBase64);
        assert.deepEqual(uint8array, decoded);
    }
});
