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

// Node.js does not support FileReader (yet?) so not really possible to properly test dataURL

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
