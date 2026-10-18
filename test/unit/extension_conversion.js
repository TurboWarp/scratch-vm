const {test} = require('node:test');
const assert = require('node:assert');

const ArgumentType = require('../../src/extension-support/argument-type');
const BlockType = require('../../src/extension-support/block-type');
const Runtime = require('../../src/engine/runtime');
const ScratchBlocksConstants = require('../../src/engine/scratch-blocks-constants');

/**
 * @type {ExtensionMetadata}
 */
const testExtensionInfo = {
    id: 'test',
    name: 'fake test extension',
    color1: '#111111',
    color2: '#222222',
    color3: '#333333',
    blocks: [
        {
            func: 'MAKE_A_VARIABLE',
            blockType: BlockType.BUTTON,
            text: 'this is a button'
        },
        {
            opcode: 'reporter',
            blockType: BlockType.REPORTER,
            text: 'simple text',
            blockIconURI: 'invalid icon URI' // trigger the 'scratch_extension' path
        },
        {
            opcode: 'inlineImage',
            blockType: BlockType.REPORTER,
            text: 'text and [IMAGE]',
            arguments: {
                IMAGE: {
                    type: ArgumentType.IMAGE,
                    dataURI: 'invalid image URI'
                }
            }
        },
        '---', // separator between groups of blocks in an extension
        {
            opcode: 'command',
            blockType: BlockType.COMMAND,
            text: 'text with [ARG] [ARG_WITH_DEFAULT]',
            arguments: {
                ARG: {
                    type: ArgumentType.STRING
                },
                ARG_WITH_DEFAULT: {
                    type: ArgumentType.STRING,
                    defaultValue: 'default text'
                }
            }
        },
        {
            opcode: 'ifElse',
            blockType: BlockType.CONDITIONAL,
            branchCount: 2,
            text: [
                'test if [THING] is spiffy and if so then',
                'or elsewise'
            ],
            arguments: {
                THING: {
                    type: ArgumentType.BOOLEAN
                }
            }
        },
        {
            opcode: 'loop',
            blockType: BlockType.LOOP, // implied branchCount of 1 unless otherwise stated
            isTerminal: true,
            text: [
                'loopty [MANY] loops'
            ],
            arguments: {
                MANY: {
                    type: ArgumentType.NUMBER
                }
            }
        }
    ]
};

const extensionInfoWithCustomFieldTypes = {
    id: 'test_custom_fieldType',
    name: 'fake test extension with customFieldTypes',
    color1: '#111111',
    color2: '#222222',
    color3: '#333333',
    blocks: [
        { // Block that uses custom field types
            opcode: 'motorTurnFor',
            blockType: BlockType.COMMAND,
            text: '[PORT] run [DIRECTION] for [VALUE] [UNIT]',
            arguments: {
                PORT: {
                    defaultValue: 'A',
                    type: 'single-port-selector'
                },
                DIRECTION: {
                    defaultValue: 'clockwise',
                    type: 'custom-direction'
                }
            }
        }
    ],
    customFieldTypes: {
        'single-port-selector': {
            output: 'string',
            outputShape: 2,
            implementation: {
                fromJson: () => null
            }
        },
        'custom-direction': {
            output: 'string',
            outputShape: 3,
            implementation: {
                fromJson: () => null
            }
        }
    }
};

const testCategoryInfo = function (block) {
    assert.strictEqual(block.json.category, 'fake test extension');
    assert.strictEqual(block.json.colour, '#111111');
    assert.strictEqual(block.json.colourSecondary, '#222222');
    assert.strictEqual(block.json.colourTertiary, '#333333');
    assert.strictEqual(block.json.inputsInline, true);
};

const testButton = function (button) {
    assert.deepEqual(button.json, null); // should be null or undefined
    assert.strictEqual(button.xml, '<button text="this is a button" callbackKey="MAKE_A_VARIABLE"></button>');
};

const testReporter = function (reporter) {
    assert.strictEqual(reporter.json.type, 'test_reporter');
    testCategoryInfo(reporter);
    assert.strictEqual(reporter.json.checkboxInFlyout, true);
    assert.strictEqual(reporter.json.outputShape, ScratchBlocksConstants.OUTPUT_SHAPE_ROUND);
    assert.strictEqual(reporter.json.output, 'String');
    assert.ok(!Object.prototype.hasOwnProperty.call(reporter.json, 'previousStatement'));
    assert.ok(!Object.prototype.hasOwnProperty.call(reporter.json, 'nextStatement'));
    assert.deepEqual(reporter.json.extensions, ['from_extension', 'scratch_extension']);
    assert.strictEqual(reporter.json.message0, '%1 %2simple text'); // "%1 %2" from the block icon
    assert.ok(!Object.prototype.hasOwnProperty.call(reporter.json, 'message1'));
    assert.deepEqual(reporter.json.args0, [
        // %1 in message0: the block icon
        {
            type: 'field_image',
            src: 'invalid icon URI',
            width: 40,
            height: 40
        },
        // %2 in message0: separator between icon and text (only added when there's also an icon)
        {
            type: 'field_vertical_separator'
        }
    ]);
    assert.ok(!Object.prototype.hasOwnProperty.call(reporter.json, 'args1'));
    assert.strictEqual(reporter.xml, '<block type="test_reporter"></block>');
};

const testInlineImage = function (inlineImage) {
    assert.strictEqual(inlineImage.json.type, 'test_inlineImage');
    testCategoryInfo(inlineImage);
    assert.strictEqual(inlineImage.json.checkboxInFlyout, true);
    assert.strictEqual(inlineImage.json.outputShape, ScratchBlocksConstants.OUTPUT_SHAPE_ROUND);
    assert.strictEqual(inlineImage.json.output, 'String');
    assert.ok(!Object.prototype.hasOwnProperty.call(inlineImage.json, 'previousStatement'));
    assert.ok(!Object.prototype.hasOwnProperty.call(inlineImage.json, 'nextStatement'));
    assert.deepEqual(inlineImage.json.extensions, ['from_extension']);
    assert.strictEqual(inlineImage.json.message0, 'text and %1'); // block text followed by inline image
    assert.ok(!Object.prototype.hasOwnProperty.call(inlineImage.json, 'message1'));
    assert.deepEqual(inlineImage.json.args0, [
        // %1 in message0: the block icon
        {
            type: 'field_image',
            src: 'invalid image URI',
            width: 24,
            height: 24,
            flip_rtl: false // False by default
        }
    ]);
    assert.ok(!Object.prototype.hasOwnProperty.call(inlineImage.json, 'args1'));
    assert.strictEqual(inlineImage.xml, '<block type="test_inlineImage"></block>');
};

const testSeparator = function (separator) {
    assert.deepEqual(separator.json, null); // should be null or undefined
    assert.strictEqual(separator.xml, '<sep gap="36"/>');
};

const testCommand = function (command) {
    assert.strictEqual(command.json.type, 'test_command');
    testCategoryInfo(command);
    assert.strictEqual(command.json.outputShape, ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE);
    assert.ok(Object.prototype.hasOwnProperty.call(command.json, 'previousStatement'));
    assert.ok(Object.prototype.hasOwnProperty.call(command.json, 'nextStatement'));
    assert.deepEqual(command.json.extensions, ['from_extension']);
    assert.strictEqual(command.json.message0, 'text with %1 %2');
    assert.ok(!Object.prototype.hasOwnProperty.call(command.json, 'message1'));
    assert.deepStrictEqual(command.json.args0[0], {
        type: 'input_value',
        name: 'ARG'
    });
    assert.ok(!Object.prototype.hasOwnProperty.call(command.json, 'args1'));
    assert.strictEqual(command.xml,
        '<block type="test_command"><value name="ARG"><shadow type="text"></shadow></value>' +
        '<value name="ARG_WITH_DEFAULT"><shadow type="text"><field name="TEXT">' +
        'default text</field></shadow></value></block>');
};

const testConditional = function (conditional) {
    assert.strictEqual(conditional.json.type, 'test_ifElse');
    testCategoryInfo(conditional);
    assert.strictEqual(conditional.json.outputShape, ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE);
    assert.ok(Object.prototype.hasOwnProperty.call(conditional.json, 'previousStatement'));
    assert.ok(Object.prototype.hasOwnProperty.call(conditional.json, 'nextStatement'));
    assert.deepEqual(conditional.json.extensions, ['from_extension']);
    assert.strictEqual(conditional.json.message0, 'test if %1 is spiffy and if so then');
    assert.strictEqual(conditional.json.message1, '%1'); // placeholder for substack #1
    assert.strictEqual(conditional.json.message2, 'or elsewise');
    assert.strictEqual(conditional.json.message3, '%1'); // placeholder for substack #2
    assert.ok(!Object.prototype.hasOwnProperty.call(conditional.json, 'message4'));
    assert.deepStrictEqual(conditional.json.args0[0], {
        type: 'input_value',
        name: 'THING',
        check: 'Boolean'
    });
    assert.deepStrictEqual(conditional.json.args1[0], {
        type: 'input_statement',
        name: 'SUBSTACK'
    });
    assert.ok(!Object.prototype.hasOwnProperty.call(conditional.json, conditional.json.args2));
    assert.deepStrictEqual(conditional.json.args3[0], {
        type: 'input_statement',
        name: 'SUBSTACK2'
    });
    assert.ok(!Object.prototype.hasOwnProperty.call(conditional.json, 'args4'));
    assert.strictEqual(conditional.xml, '<block type="test_ifElse"><value name="THING"></value></block>');
};

const testLoop = function (loop) {
    assert.strictEqual(loop.json.type, 'test_loop');
    testCategoryInfo(loop);
    assert.strictEqual(loop.json.outputShape, ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE);
    assert.ok(Object.prototype.hasOwnProperty.call(loop.json, 'previousStatement'));
    assert.ok(!Object.prototype.hasOwnProperty.call(loop.json, 'nextStatement')); // isTerminal is set on this block
    assert.deepEqual(loop.json.extensions, ['from_extension']);
    assert.strictEqual(loop.json.message0, 'loopty %1 loops');
    assert.strictEqual(loop.json.message1, '%1'); // placeholder for substack
    assert.strictEqual(loop.json.message2, '%1'); // placeholder for loop arrow
    assert.ok(!Object.prototype.hasOwnProperty.call(loop.json, 'message3'));
    assert.deepStrictEqual(loop.json.args0[0], {
        type: 'input_value',
        name: 'MANY'
    });
    assert.deepStrictEqual(loop.json.args1[0], {
        type: 'input_statement',
        name: 'SUBSTACK'
    });
    assert.strictEqual(loop.json.lastDummyAlign2, 'RIGHT'); // move loop arrow to right side
    assert.strictEqual(loop.json.args2[0].type, 'field_image');
    assert.strictEqual(loop.json.args2[0].flip_rtl, true);
    assert.ok(!Object.prototype.hasOwnProperty.call(loop.json, 'args3'));
    assert.strictEqual(loop.xml,
        '<block type="test_loop"><value name="MANY"><shadow type="math_number"></shadow></value></block>');
};

test('registerExtensionPrimitives', (t, done) => {
    const runtime = new Runtime();

    runtime.on(Runtime.EXTENSION_ADDED, categoryInfo => {
        const blocksInfo = categoryInfo.blocks;
        assert.strictEqual(blocksInfo.length, testExtensionInfo.blocks.length);

        blocksInfo.forEach(blockInfo => {
            // `true` here means "either an object or a non-empty string but definitely not null or undefined"
            assert.ok(blockInfo.info, 'Every block and pseudo-block must have a non-empty "info" field');
        });

        // Note that this also implicitly tests that block order is preserved
        const [button, reporter, inlineImage, separator, command, conditional, loop] = blocksInfo;

        testButton(button);
        testReporter(reporter);
        testInlineImage(inlineImage);
        testSeparator(separator);
        testCommand(command);
        testConditional(conditional);
        testLoop(loop);

        done();
    });

    runtime._registerExtensionPrimitives(testExtensionInfo);
});

test('custom field types should be added to block and EXTENSION_FIELD_ADDED callback triggered', () => {
    const runtime = new Runtime();

    runtime.on(Runtime.EXTENSION_ADDED, categoryInfo => {
        const blockInfo = categoryInfo.blocks[0];

        // We expect that for each argument there's a corresponding <field>-tag in the block XML
        Object.values(blockInfo.info.arguments).forEach(argument => {
            const regex = new RegExp(`<field name="field_${categoryInfo.id}_${argument.type}">`);
            assert.ok(regex.test(blockInfo.xml));
        });

    });

    let fieldAddedCallbacks = 0;
    runtime.on(Runtime.EXTENSION_FIELD_ADDED, () => {
        fieldAddedCallbacks++;
    });

    runtime._registerExtensionPrimitives(extensionInfoWithCustomFieldTypes);

    // Extension includes two custom field types
    assert.strictEqual(fieldAddedCallbacks, 2);
});
