const fs = require('fs');
const pathUtil = require('path');
const htmlparser = require('htmlparser2');
const {test} = require('node:test');
const assert = require('node:assert');
const VirtualMachine = require('../../src/virtual-machine');
const Runtime = require('../../src/engine/runtime');
const ArgumentType = require('../../src/extension-support/argument-type');
const BlockType = require('../../src/extension-support/block-type');

const baseExtensionInfo = {
    id: 'xmltest',
    name: `<>"'&& Name`,
    docsURI: `https://example.com/&''""<<>>`,
    menuIconURI: `data:<>&"' category icon`,
    blocks: [
        {
            blockType: `block type <>&"'`,
            opcode: `opcode <>&"'`,
            text: `<>&"' [string argument <>&"'] [inputMenu <"'&>] [fieldMenu <"'&>] [image <"'&>]`,
            blockIconURI: `'data:<>&"' block icon`,
            arguments: {
                [`string argument <>&"'`]: {
                    type: ArgumentType.STRING,
                    defaultValue: `default string <>&"'`
                },
                [`inputMenu <"'&>`]: {
                    type: ArgumentType.STRING,
                    menu: `input <>&"'`,
                    defaultValue: `default input <>&"'`
                },
                [`fieldMenu <"'&>`]: {
                    type: `argument type <>&"'`,
                    menu: `field <>&"'`,
                    defaultValue: `default field <>&"'`
                },
                [`image <"'&>`]: {
                    type: ArgumentType.IMAGE,
                    dataURI: `data:<>&"' image input`
                }
            }
        },
        {
            opcode: 'button',
            blockType: BlockType.BUTTON,
            text: `'"><& button text`,
            func: `'"><& func`
        }
    ],
    menus: {
        [`input <>&"'`]: {
            acceptReporters: true,
            items: [
                `1 <>&"`,
                `2 <>&"`,
                `3 <>&"`
            ]
        },
        [`field <>&"'`]: {
            acceptReporters: false,
            items: [
                `1 <>&"`,
                `2 <>&"`,
                `3 <>&"`
            ]
        }
    }
};

test('XML escaped in Runtime.getBlocksXML()', () => {
    // While these changes will make the extension unusable in a real editor environment, we still
    // want to make sure that these fields are actually being escaped.
    const mangledExtension = JSON.parse(JSON.stringify(baseExtensionInfo));
    mangledExtension.color1 = `<"'&amp;amp;color1>`;
    mangledExtension.color2 = `<"'&amp;amp;color2>`;
    mangledExtension.color3 = `<"'&amp;amp;color3>`;

    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => mangledExtension
    });

    const xmlList = vm.runtime.getBlocksXML();
    assert.ok(xmlList instanceof Array, 'getBlocksXML returns array');
    assert.strictEqual(xmlList.length, 1, 'array has 1 item');

    const xmlEntry = xmlList[0];
    assert.strictEqual(xmlEntry.id, `xmltest`, 'id worked');

    const parsedXml = htmlparser.parseDOM(xmlEntry.xml);
    assert.strictEqual(parsedXml.length, 1, 'xml has 1 root node');

    /*
    Expected XML structure:

    <category name="..." colour="..." secondaryColour="..." iconURI="...">
        <button ... web-class="..."></button>
        <block type="...">
            <value name="...">
                <shadow type="text">
                    <field name="TEXT">default value</field>
                </shadow>
            </value>
            <value name="...">
                <shadow type="...">
                    <field name="...">default value</field>
                </shadow>
            </value>
            <field name="...">default value</field>
        </block>
        <button text="..." callbackKey="..."></button>
    </category>
    */

    const category = parsedXml[0];
    assert.strictEqual(category.name, 'category', 'has <category>');
    assert.strictEqual(category.attribs.name, '&lt;&gt;&quot;&apos;&amp;&amp; Name', 'escaped category name');
    assert.strictEqual(category.attribs.id, 'xmltest', 'category id');
    assert.strictEqual(category.attribs.colour, '&lt;&quot;&apos;&amp;amp;amp;color1&gt;', 'escaped category color');
    assert.strictEqual(
        category.attribs.secondarycolour,
        '&lt;&quot;&apos;&amp;amp;amp;color2&gt;',
        'escaped category color 2'
    );
    assert.strictEqual(
        category.attribs.iconuri,
        'data:&lt;&gt;&amp;&quot;&apos; category icon',
        'escaped category icon'
    );
    assert.strictEqual(category.children.length, 3, 'category has 3 children');

    // Check docsURI
    const docsButton = category.children[0];
    assert.strictEqual(docsButton.name, 'button', 'has docs <button>');
    assert.strictEqual(docsButton.attribs.callbackkey, 'OPEN_EXTENSION_DOCS');
    assert.strictEqual(
        docsButton.attribs.callbackdata,
        'https://example.com/&amp;&apos;&apos;&quot;&quot;&lt;&lt;&gt;&gt;',
        'escaped docs callback data'
    );
    assert.strictEqual(docsButton.children.length, 0, 'docs button has 0 children');

    // Check the block
    const block = category.children[1];
    assert.strictEqual(block.name, 'block', 'has <block>');
    assert.strictEqual(
        block.attribs.type,
        'xmltest_opcode &lt;&gt;&amp;&quot;&apos;',
        'escaped block id'
    );
    assert.strictEqual(block.children.length, 3, 'block has 3 children');

    // Check the block's string input
    const stringInput = block.children[0];
    assert.strictEqual(stringInput.name, 'value', 'string input is <value>');
    assert.strictEqual(
        stringInput.attribs.name,
        'string argument &lt;&gt;&amp;&quot;&apos;',
        'escaped string input id'
    );
    assert.strictEqual(stringInput.children.length, 1, 'string input has 1 child');

    const stringInputShadow = stringInput.children[0];
    assert.strictEqual(stringInputShadow.name, 'shadow', 'string input shadow is <shadow>');
    assert.strictEqual(stringInputShadow.attribs.type, 'text', 'string input shadow is of type text');
    assert.strictEqual(stringInputShadow.children.length, 1, 'string input shadow has 1 child');

    const stringInputField = stringInputShadow.children[0];
    assert.strictEqual(stringInputField.name, 'field', 'string input field is <field>');
    assert.strictEqual(stringInputField.children.length, 1, 'field input has 1 child');

    const stringInputFieldContent = stringInputField.children[0];
    assert.strictEqual(
        stringInputFieldContent.data,
        'default string &lt;&gt;&amp;&quot;&apos;',
        'escaped string input default value'
    );

    // Check the block's menu input
    const menuInput = block.children[1];
    assert.strictEqual(menuInput.name, 'value', 'menu input is <value>');
    assert.strictEqual(menuInput.attribs.name, 'inputMenu &lt;&quot;&apos;&amp;&gt;', 'escaped menu input id');
    assert.strictEqual(menuInput.children.length, 1, 'menu input has 1 child');

    const inputShadow = menuInput.children[0];
    assert.strictEqual(inputShadow.name, 'shadow', 'input shadow is <shadow>');
    assert.strictEqual(
        inputShadow.attribs.type,
        'xmltest_menu_input &lt;&gt;&amp;&quot;&apos;',
        'escaped menu id'
    );
    assert.strictEqual(inputShadow.children.length, 1, 'input shadow has 1 child');

    const inputField = inputShadow.children[0];
    assert.strictEqual(inputField.name, 'field', 'input field is <field>');
    assert.strictEqual(inputField.children.length, 1, 'input field has 1 child');

    const inputFieldContent = inputField.children[0];
    assert.strictEqual(
        inputFieldContent.data,
        'default input &lt;&gt;&amp;&quot;&apos;',
        'escaped input default value'
    );

    // Check the block's menu field
    const menuField = block.children[2];
    assert.strictEqual(menuField.name, 'field', 'menu field is <field>');
    assert.strictEqual(menuField.attribs.name, 'fieldMenu &lt;&quot;&apos;&amp;&gt;', 'escaped field menu id');
    assert.strictEqual(menuField.children.length, 1, 'menu field has 1 child');

    const menuFieldContent = menuField.children[0];
    assert.strictEqual(menuFieldContent.data, 'default field &lt;&gt;&amp;&quot;&apos;', 'escaped field default value');

    // Check the button block
    const button = category.children[2];
    assert.strictEqual(button.name, 'button', 'button is <button>');
    assert.strictEqual(button.attribs.text, '&apos;&quot;&gt;&lt;&amp; button text', 'escaped button text');
});

test('ID escaped in Runtime.getBlocksXML()', () => {
    // Previous test needs to use an actually valid extension ID. For this test we will
    // register an invalid extension just to make sure that the ID ends up being escaped.

    const rt = new Runtime();
    rt._registerExtensionPrimitives({
        id: `id <>&"'`,
        name: 'name',
        blocks: []
    });

    const xmlList = rt.getBlocksXML();
    const xmlEntry = xmlList[0];
    assert.strictEqual(xmlEntry.id, `id <>&"'`, 'extension id outside of xml unchanged');

    const parsedXML = htmlparser.parseDOM(xmlEntry.xml);
    assert.strictEqual(parsedXML.length, 1, 'XML has 1 root node');

    const category = parsedXML[0];
    assert.strictEqual(category.name, 'category', 'category is <category>');
    assert.strictEqual(category.attribs.id, 'id &lt;&gt;&amp;&quot;&apos;', 'escaped extension id');
    assert.strictEqual(category.children.length, 0, 'category has no children');
});

test('XML escaped in Blocks.toXML()', async () => {
    const vm = new VirtualMachine();
    const serviceName = vm.extensionManager._registerInternalExtension({
        getInfo: () => baseExtensionInfo
    });
    vm.extensionManager._loadedExtensions.set(baseExtensionInfo.id, serviceName);

    const fixturePath = pathUtil.join(__dirname, '..', 'fixtures', 'tw-project-using-xml-extension.sb3');

    const checkVM = () => {
        const generatedXML = vm.runtime.targets[0].blocks.toXML();
        const parsedXML = htmlparser.parseDOM(generatedXML);

        /*
        Example expected XML:

        <block id="..." type="xmltest_opcode" x="..." y="...">
            <value name="string argument">
                <shadow id="..." type="text">
                    <field name="TEXT">default string</field>
                </shadow>
            </value>
            <value name="inputMenu">
                <shadow id="..." type="xmltest_menu_input">
                    <field name="input">default input</field>
                </shadow>
            </value>
            <field name="fieldMenu">default field</field>
        </block>
        */

        assert.strictEqual(parsedXML.length, 1, 'XML has 1 root');

        // Check the block itself
        const block = parsedXML[0];
        assert.strictEqual(block.name, 'block', 'block is <block>');
        assert.strictEqual(
            block.attribs.type,
            'xmltest_opcode &lt;&gt;&amp;&quot;&apos;',
            'escaped block opcode'
        );
        assert.strictEqual(block.children.length, 3, 'block has 3 children');

        // Check the string input
        const stringInputValue = block.children[0];
        assert.strictEqual(stringInputValue.name, 'value', 'string input is <value>');
        assert.strictEqual(
            stringInputValue.attribs.name,
            'string argument &lt;&gt;&amp;&quot;&apos;',
            'escaped string input name'
        );
        assert.strictEqual(stringInputValue.children.length, 1, 'string input has 1 child');

        const stringInputShadow = stringInputValue.children[0];
        assert.strictEqual(stringInputShadow.name, 'shadow', 'string input shadow is <shadow>');
        assert.strictEqual(stringInputValue.children.length, 1, 'string input shadow has 1 child');

        const stringInputField = stringInputShadow.children[0];
        assert.strictEqual(stringInputField.name, 'field', 'string input field is <field>');
        assert.strictEqual(stringInputField.children.length, 1, 'string input field has 1 child');

        const stringInputFieldContent = stringInputField.children[0];
        assert.strictEqual(
            stringInputFieldContent.data,
            `default string &lt;&gt;&amp;&quot;&apos;`,
            'escaped string input value'
        );

        // Check the input menu
        const inputMenuValue = block.children[1];
        assert.strictEqual(inputMenuValue.name, 'value', 'input menu is <value>');
        assert.strictEqual(
            inputMenuValue.attribs.name,
            'inputMenu &lt;&quot;&apos;&amp;&gt;',
            'escaped input menu name'
        );
        assert.strictEqual(inputMenuValue.children.length, 1, 'input menu has 1 child');

        const inputMenuShadow = inputMenuValue.children[0];
        assert.strictEqual(inputMenuShadow.name, 'shadow', 'input menu shadow is <shadow>');
        assert.strictEqual(inputMenuValue.children.length, 1, 'input menu shadow has 1 child');

        const inputMenuField = inputMenuShadow.children[0];
        assert.strictEqual(inputMenuField.name, 'field', 'input menu field is <field>');
        assert.strictEqual(inputMenuField.children.length, 1, 'input menu field has 1 child');

        const inputMenuFieldContent = inputMenuField.children[0];
        assert.strictEqual(
            inputMenuFieldContent.data,
            `default input &lt;&gt;&amp;&quot;&apos;`,
            'escaped input menu value'
        );

        // Check the field menu
        const fieldMenu = block.children[2];
        assert.strictEqual(fieldMenu.name, 'field', 'field menu is <field>');
        assert.strictEqual(fieldMenu.attribs.name, 'fieldMenu &lt;&quot;&apos;&amp;&gt;', 'escaped field menu name');
        assert.strictEqual(fieldMenu.children.length, 1, 'field menu has 1 child');

        const fieldMenuContent = fieldMenu.children[0];
        assert.strictEqual(
            fieldMenuContent.data,
            `default field &lt;&gt;&amp;&quot;&apos;`,
            'escaped input menu value'
        );
    };

    // Check that we can deserialize a project using this extension.
    await vm.loadProject(fs.readFileSync(fixturePath));
    checkVM();

    // Check that it still works after serialization and deserialization.
    const serialized = await vm.saveProjectSb3('uint8array');
    await vm.loadProject(serialized);
    checkVM();
});
