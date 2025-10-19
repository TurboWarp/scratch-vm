const external = require('../../src/extension-support/tw-external');
const {test} = require('tap');

test('importModule', t => {
    external.importModule('data:text/javascript;,export%20default%201').then(mod => {
        t.equal(mod.default, 1);
        t.end();
    });
});

test('fetch', t => {
    external.fetch('data:text/plain;,test').then(res => {
        res.text().then(text => {
            t.equal(text, 'test');
            t.end();
        });
    });
});

test('dataURL', t => {
    global.FileReader = class {
        readAsDataURL (blob) {
            blob.arrayBuffer().then(arrayBuffer => {
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                this.result = `data:${blob.type};base64,${base64}`;
                this.onload();
            });
        }
    };

    external.dataURL('data:text/plain;,doesthiswork').then(dataURL => {
        t.equal(dataURL, `data:text/plain;base64,${btoa('doesthiswork')}`);
        t.end();
    });
});

test('blob', t => {
    external.blob('data:text/plain;,test').then(blob => {
        blob.text().then(blobText => {
            t.equal(blobText, 'test');
            t.end();
        });
    });
});

test('evalAndReturn', t => {
    external.evalAndReturn('data:text/plain;,var%20x=20', 'x').then(result => {
        t.equal(result, 20);
        t.end();
    });
});

test('relative URL throws', t => {
    external.fetch('./test.js').catch(err => {
        t.equal(err.message, `Unsupported URL: ./test.js`);
        t.end();
    });
});
