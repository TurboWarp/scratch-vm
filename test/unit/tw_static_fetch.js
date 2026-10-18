const {test} = require('node:test');
const assert = require('node:assert');
const staticFetch = require('../../src/util/tw-static-fetch');

test('fetch simple base64', async () => {
    const res = staticFetch('data:text/plain;base64,VGVzdGluZyB0ZXN0aW5nIDEyMw==');
    const text = await res.text();
    assert.strictEqual(text, 'Testing testing 123');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.headers.get('content-type'), 'text/plain');
    assert.strictEqual(res.headers.get('content-length'), '19');
});

test('fetch base64 with all possible bytes', async () => {
    // eslint-disable-next-line max-len
    const res = staticFetch('Data:Application/Octet-Stream;BASE64,AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==');
    const buffer = await res.arrayBuffer();
    assert.deepEqual(Array.from(new Uint8Array(buffer)), Array(256)
        .fill()
        .map((_, index) => index)
    );
    assert.strictEqual(res.headers.get('content-type'), 'application/octet-stream');
    assert.strictEqual(res.headers.get('content-length'), '256');
});

test('fetch not data:', () => {
    assert.strictEqual(staticFetch('blob:https://turbowarp.org/54346944-16cf-4ce9-aed4-e1df8ad0d779'), null);
    assert.strictEqual(staticFetch('https://example.com/'), null);
    assert.strictEqual(staticFetch('http://example.com/'), null);
    assert.strictEqual(staticFetch('file:///etc/hosts'), null);
    assert.strictEqual(staticFetch('oegirjdf'), null);
    assert.strictEqual(staticFetch(''), null);
});
