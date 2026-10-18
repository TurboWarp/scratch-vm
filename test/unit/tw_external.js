const external = require('../../src/extension-support/tw-external');
const {test} = require('node:test');
const assert = require('node:assert');

test('importModule', async () => {
    const mod = await external.importModule('data:text/javascript;,export%20default%201');
    assert.strictEqual(mod.default, 1);
});

test('fetch', async () => {
    const res = await external.fetch('data:text/plain;,test');
    const text = await res.text();
    assert.strictEqual(text, 'test');
});

test('dataURL', async () => {
    global.FileReader = class {
        readAsDataURL (blob) {
            blob.arrayBuffer().then(arrayBuffer => {
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                this.result = `data:${blob.type};base64,${base64}`;
                this.onload();
            });
        }
    };

    const dataURL = await external.dataURL('data:text/plain;,doesthiswork');
    assert.strictEqual(dataURL, `data:text/plain;base64,${btoa('doesthiswork')}`);
});

test('blob', async () => {
    const blob = await external.blob('data:text/plain;,test');
    const blobText = await blob.text();
    assert.strictEqual(blobText, 'test');
});

test('evalAndReturn', async () => {
    const result = await external.evalAndReturn('data:text/plain;,var%20x=20', 'x');
    assert.strictEqual(result, 20);
});

test('evalAndReturn with a trailing comment without newline', async () => {
    const result = await external.evalAndReturn('data:text/plain;,var%20x=20 // whatever', 'x');
    assert.strictEqual(result, 20);
});

test('relative URL throws', (t, done) => {
    external.fetch('./test.js').catch(err => {
        assert.strictEqual(err.message, `Unsupported URL: ./test.js`);
        done();
    });
});
