const {test} = require('node:test');
const assert = require('node:assert');
const VM = require('../../src/virtual-machine');

test('exports exist', () => {
    const vm = new VM();
    assert.strictEqual(typeof vm.exports.Sprite, 'function');
    assert.strictEqual(typeof vm.exports.RenderedTarget, 'function');
});

test('JSZip', () => {
    const JSZip = new VM().exports.JSZip;
    const zip = new JSZip();
    assert.strictEqual(typeof zip.file, 'function');
});
