const htmlparser = require('htmlparser2');
const {test} = require('node:test');
const assert = require('node:assert');
const VirtualMachine = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('Label blocks', () => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testlabel',
            name: `Label Test`,
            blocks: [
                {
                    blockType: BlockType.LABEL,
                    text: 'test <>&"\''
                }
            ]
        })
    });

    const xmlList = vm.runtime.getBlocksXML();
    assert.strictEqual(xmlList.length, 1);

    const parsedXML = htmlparser.parseDOM(xmlList[0].xml);
    // Expecting something like this:
    // <category name="Label Test" id="testlabel" colour="#0FBD8C" secondaryColour="#0DA57A">
    //   <label text="&lt;&gt;&amp;&quot;&apos;"></label>
    // </category>
    assert.strictEqual(parsedXML.length, 1);

    const category = parsedXML[0];
    assert.strictEqual(category.name, 'category');
    assert.strictEqual(category.children.length, 1);

    const label = category.children[0];
    assert.strictEqual(label.name, 'label');
    assert.strictEqual(label.children.length, 0);
    assert.strictEqual(label.attribs.text, 'test &lt;&gt;&amp;&quot;&apos;');
});
