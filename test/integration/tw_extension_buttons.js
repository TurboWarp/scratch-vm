const {test} = require('node:test');
const assert = require('node:assert');
const htmlparser = require('htmlparser2');
const VM = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('buttons', () => {
    const vm = new VM();
    let buttonRunCount = 0;
    vm.extensionManager._registerInternalExtension({
        'getInfo': () => ({
            id: 'test',
            name: 'Test',
            blocks: [
                {
                    blockType: BlockType.BUTTON,
                    text: 'button text <>',
                    func: 'callback &"\'<>'
                },
                {
                    blockType: BlockType.BUTTON,
                    text: 'make variable <>',
                    func: 'MAKE_A_VARIABLE'
                },
                {
                    blockType: BlockType.BUTTON,
                    text: 'make procedure ""',
                    func: 'MAKE_A_PROCEDURE'
                },
                {
                    blockType: BlockType.BUTTON,
                    text: 'make list &&',
                    func: 'MAKE_A_LIST'
                }
            ]
        }),
        'callback &"\'<>': () => {
            buttonRunCount++;
        }
    });

    const xml = vm.runtime.getBlocksXML();
    assert.strictEqual(xml.length, 1);

    const parsed = htmlparser.parseDOM(xml[0].xml, {
        decodeEntities: true
    });
    assert.strictEqual(parsed.length, 1);

    const category = parsed[0];
    assert.strictEqual(category.children.length, 4);

    const customButton = category.children[0];
    assert.strictEqual(customButton.name, 'button');
    assert.strictEqual(customButton.attribs.text, 'button text <>');
    assert.strictEqual(customButton.attribs.callbackkey, 'EXTENSION_CALLBACK');
    assert.strictEqual(customButton.attribs.callbackdata, 'test_callback &"\'<>');

    const makeVariable = category.children[1];
    assert.strictEqual(makeVariable.attribs.text, 'make variable <>');
    assert.strictEqual(makeVariable.attribs.callbackkey, 'MAKE_A_VARIABLE');

    const makeProcedure = category.children[2];
    assert.strictEqual(makeProcedure.attribs.text, 'make procedure ""');
    assert.strictEqual(makeProcedure.attribs.callbackkey, 'MAKE_A_PROCEDURE');

    const makeList = category.children[3];
    assert.strictEqual(makeList.attribs.text, 'make list &&');
    assert.strictEqual(makeList.attribs.callbackkey, 'MAKE_A_LIST');

    for (let i = 1; i <= 3; i++) {
        const builtinButton = category.children[i];
        assert.strictEqual(builtinButton.name, 'button');
        assert.strictEqual(builtinButton.attribs.callbackdata, undefined);
    }

    assert.strictEqual(buttonRunCount, 0);
    vm.handleExtensionButtonPress(customButton.attribs.callbackdata);
    assert.strictEqual(buttonRunCount, 1);
    vm.handleExtensionButtonPress(customButton.attribs.callbackdata);
    assert.strictEqual(buttonRunCount, 2);
});
