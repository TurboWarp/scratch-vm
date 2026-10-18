const htmlparser = require('htmlparser2');
const {test} = require('node:test');
const assert = require('node:assert');
const VirtualMachine = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('XML blocks', () => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testxml',
            name: 'XML Test',
            blocks: [
                {
                    blockType: BlockType.XML,
                    xml: '<test it="works">!</test>'
                }
            ]
        })
    });

    const xmlList = vm.runtime.getBlocksXML();
    assert.strictEqual(xmlList.length, 1);

    const parsedXML = htmlparser.parseDOM(xmlList[0].xml);
    assert.strictEqual(parsedXML.length, 1);

    const category = parsedXML[0];
    assert.strictEqual(category.name, 'category');
    assert.strictEqual(category.children.length, 1);

    const label = category.children[0];
    assert.strictEqual(label.name, 'test');
    assert.strictEqual(label.attribs.it, 'works');
    assert.strictEqual(label.children.length, 1);
    assert.strictEqual(label.children[0].data, '!');
});
