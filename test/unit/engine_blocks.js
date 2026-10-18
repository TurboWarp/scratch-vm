const {test} = require('node:test');
const assert = require('node:assert');
const Blocks = require('../../src/engine/blocks');
const Variable = require('../../src/engine/variable');
const adapter = require('../../src/engine/adapter');
const events = require('../fixtures/events.json');
const Runtime = require('../../src/engine/runtime');

test('spec', () => {
    const b = new Blocks(new Runtime());

    assert.strictEqual(typeof Blocks, 'function');
    assert.strictEqual(typeof b, 'object');
    assert.ok(b instanceof Blocks);

    assert.strictEqual(typeof b._blocks, 'object');
    assert.strictEqual(typeof b._scripts, 'object');
    assert.ok(Array.isArray(b._scripts));

    assert.strictEqual(typeof b.createBlock, 'function');
    assert.strictEqual(typeof b.moveBlock, 'function');
    assert.strictEqual(typeof b.changeBlock, 'function');
    assert.strictEqual(typeof b.deleteBlock, 'function');
    assert.strictEqual(typeof b.getBlock, 'function');
    assert.strictEqual(typeof b.getScripts, 'function');
    assert.strictEqual(typeof b.getNextBlock, 'function');
    assert.strictEqual(typeof b.getBranch, 'function');
    assert.strictEqual(typeof b.getOpcode, 'function');
    assert.strictEqual(typeof b.mutationToXML, 'function');
    assert.strictEqual(typeof b.updateSensingOfReference, 'function');
});

// Getter tests
test('getBlock', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    const block = b.getBlock('foo');
    assert.strictEqual(typeof block, 'object');
    const notBlock = b.getBlock('?');
    assert.strictEqual(typeof notBlock, 'undefined');
});

test('getScripts', () => {
    const b = new Blocks(new Runtime());
    let scripts = b.getScripts();
    assert.strictEqual(typeof scripts, 'object');
    assert.strictEqual(scripts.length, 0);
    // Create two top-level blocks and one not.
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.createBlock({
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.createBlock({
        id: 'foo3',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });

    scripts = b.getScripts();
    assert.strictEqual(typeof scripts, 'object');
    assert.strictEqual(scripts.length, 2);
    assert.ok(scripts.indexOf('foo') > -1);
    assert.ok(scripts.indexOf('foo2') > -1);
    assert.strictEqual(scripts.indexOf('foo3'), -1);

});

test('getNextBlock', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });

    let next = b.getNextBlock('foo');
    assert.strictEqual(next, null);

    // Add a block with "foo" as its next.
    b.createBlock({
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: 'foo',
        fields: {},
        inputs: {},
        topLevel: true
    });

    next = b.getNextBlock('foo2');
    assert.strictEqual(next, 'foo');

    // Block that doesn't exist.
    const noBlock = b.getNextBlock('?');
    assert.strictEqual(noBlock, null);
});

test('getBranch', () => {
    const b = new Blocks(new Runtime());
    // Single branch
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            SUBSTACK: {
                name: 'SUBSTACK',
                block: 'foo2',
                shadow: null
            }
        },
        topLevel: true
    });
    b.createBlock({
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });

    const branch = b.getBranch('foo');
    assert.strictEqual(branch, 'foo2');

    const notBranch = b.getBranch('?');
    assert.strictEqual(notBranch, null);
});

test('getBranch2', () => {
    const b = new Blocks(new Runtime());
    // Second branch
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            SUBSTACK: {
                name: 'SUBSTACK',
                block: 'foo2',
                shadow: null
            },
            SUBSTACK2: {
                name: 'SUBSTACK2',
                block: 'foo3',
                shadow: null
            }
        },
        topLevel: true
    });
    b.createBlock({
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });
    b.createBlock({
        id: 'foo3',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });

    const branch1 = b.getBranch('foo', 1);
    const branch2 = b.getBranch('foo', 2);
    assert.strictEqual(branch1, 'foo2');
    assert.strictEqual(branch2, 'foo3');
});

test('getBranch with none', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    const noBranch = b.getBranch('foo');
    assert.strictEqual(noBranch, null);
});

test('getOpcode', () => {
    const b = new Blocks(new Runtime());
    const block = {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    };
    b.createBlock(block);
    const opcode = b.getOpcode(block);
    assert.strictEqual(opcode, 'TEST_BLOCK');
    const undefinedBlock = b.getBlock('?');
    const undefinedOpcode = b.getOpcode(undefinedBlock);
    assert.strictEqual(undefinedOpcode, null);
});

test('mutationToXML', () => {
    const b = new Blocks(new Runtime());
    const testStringRaw = '"arbitrary" & \'complicated\' test string';
    const testStringEscaped = '\\&quot;arbitrary\\&quot; &amp; &apos;complicated&apos; test string';
    const mutation = {
        tagName: 'mutation',
        children: [],
        blockInfo: {
            text: testStringRaw
        }
    };
    const xml = b.mutationToXML(mutation);
    assert.strictEqual(
        xml,
        `<mutation blockInfo="{&quot;text&quot;:&quot;${testStringEscaped}&quot;}"></mutation>`
    );
});

// Block events tests
test('create', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });

    assert.strictEqual(typeof b._blocks.foo, 'object');
    assert.strictEqual(b._blocks.foo.opcode, 'TEST_BLOCK');
    assert.notStrictEqual(b._scripts.indexOf('foo'), -1);
});

test('move', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.createBlock({
        id: 'bar',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });

    // Attach 'bar' to the end of 'foo'
    b.moveBlock({
        id: 'bar',
        newParent: 'foo'
    });
    assert.strictEqual(b._scripts.length, 1);
    assert.strictEqual(Object.keys(b._blocks).length, 2);
    assert.strictEqual(b._blocks.foo.next, 'bar');

    // Detach 'bar' from 'foo'
    b.moveBlock({
        id: 'bar',
        oldParent: 'foo'
    });
    assert.strictEqual(b._scripts.length, 2);
    assert.strictEqual(Object.keys(b._blocks).length, 2);
    assert.strictEqual(b._blocks.foo.next, null);
});

test('move into empty', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.createBlock({
        id: 'bar',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.moveBlock({
        id: 'bar',
        newInput: 'fooInput',
        newParent: 'foo'
    });
    assert.strictEqual(b._blocks.foo.inputs.fooInput.block, 'bar');
});

test('move no obscure shadow', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            fooInput: {
                name: 'fooInput',
                block: 'x',
                shadow: 'y'
            }
        },
        topLevel: true
    });
    b.createBlock({
        id: 'bar',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.moveBlock({
        id: 'bar',
        newInput: 'fooInput',
        newParent: 'foo'
    });
    assert.strictEqual(b._blocks.foo.inputs.fooInput.block, 'bar');
    assert.strictEqual(b._blocks.foo.inputs.fooInput.shadow, 'y');
});

test('move - attaching new shadow', () => {
    const b = new Blocks(new Runtime());
    // Block/shadow are null to mimic state right after a procedure_call block
    // is mutated by adding an input. The "move" will attach the new shadow.
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            fooInput: {
                name: 'fooInput',
                block: null,
                shadow: null
            }
        },
        topLevel: true
    });
    b.createBlock({
        id: 'bar',
        opcode: 'TEST_BLOCK',
        shadow: true,
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.moveBlock({
        id: 'bar',
        newInput: 'fooInput',
        newParent: 'foo'
    });
    assert.strictEqual(b._blocks.foo.inputs.fooInput.block, 'bar');
    assert.strictEqual(b._blocks.foo.inputs.fooInput.shadow, 'bar');
});

test('change', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {
            someField: {
                name: 'someField',
                value: 'initial-value'
            }
        },
        inputs: {},
        topLevel: true
    });

    // Test that the field is updated
    assert.strictEqual(b._blocks.foo.fields.someField.value, 'initial-value');

    b.changeBlock({
        element: 'field',
        id: 'foo',
        name: 'someField',
        value: 'final-value'
    });

    assert.strictEqual(b._blocks.foo.fields.someField.value, 'final-value');

    // Invalid cases
    // No `element`
    b.changeBlock({
        id: 'foo',
        name: 'someField',
        value: 'invalid-value'
    });
    assert.strictEqual(b._blocks.foo.fields.someField.value, 'final-value');

    // No block ID
    b.changeBlock({
        element: 'field',
        name: 'someField',
        value: 'invalid-value'
    });
    assert.strictEqual(b._blocks.foo.fields.someField.value, 'final-value');

    // No such field
    b.changeBlock({
        element: 'field',
        id: 'foo',
        name: 'someWrongField',
        value: 'final-value'
    });
    assert.strictEqual(b._blocks.foo.fields.someField.value, 'final-value');
});

test('delete', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.deleteBlock('foo');

    assert.strictEqual(typeof b._blocks.foo, 'undefined');
    assert.strictEqual(b._scripts.indexOf('foo'), -1);
});

test('delete chain', () => {
    // Create a chain of connected blocks and delete the top one.
    // All of them should be deleted.
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: 'foo2',
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.createBlock({
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: 'foo3',
        fields: {},
        inputs: {},
        topLevel: false
    });
    b.createBlock({
        id: 'foo3',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });
    b.deleteBlock('foo');
    assert.strictEqual(typeof b._blocks.foo, 'undefined');
    assert.strictEqual(typeof b._blocks.foo2, 'undefined');
    assert.strictEqual(typeof b._blocks.foo3, 'undefined');
    assert.strictEqual(b._scripts.indexOf('foo'), -1);
    assert.strictEqual(Object.keys(b._blocks).length, 0);
    assert.strictEqual(b._scripts.length, 0);
});

test('delete inputs', () => {
    // Create a block with two inputs, one of which has its own input.
    // Delete the block - all of them should be deleted.
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            input1: {
                name: 'input1',
                block: 'foo2',
                shadow: 'foo2'
            },
            SUBSTACK: {
                name: 'SUBSTACK',
                block: 'foo3',
                shadow: null
            }
        },
        topLevel: true
    });
    b.createBlock({
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });
    b.createBlock({
        id: 'foo5',
        opcode: 'TEST_OBSCURED_SHADOW',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });
    b.createBlock({
        id: 'foo3',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            subinput: {
                name: 'subinput',
                block: 'foo4',
                shadow: 'foo5'
            }
        },
        topLevel: false
    });
    b.createBlock({
        id: 'foo4',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });
    b.deleteBlock('foo');
    assert.strictEqual(typeof b._blocks.foo, 'undefined');
    assert.strictEqual(typeof b._blocks.foo2, 'undefined');
    assert.strictEqual(typeof b._blocks.foo3, 'undefined');
    assert.strictEqual(typeof b._blocks.foo4, 'undefined');
    assert.strictEqual(typeof b._blocks.foo5, 'undefined');
    assert.strictEqual(b._scripts.indexOf('foo'), -1);
    assert.strictEqual(Object.keys(b._blocks).length, 0);
    assert.strictEqual(b._scripts.length, 0);
});

test('updateAssetName function updates name in sound field', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        fields: {
            SOUND_MENU: {
                name: 'SOUND_MENU',
                value: 'name1'
            }
        }
    });
    assert.strictEqual(b.getBlock('foo').fields.SOUND_MENU.value, 'name1');
    b.updateAssetName('name1', 'name2', 'sound');
    assert.strictEqual(b.getBlock('foo').fields.SOUND_MENU.value, 'name2');
});

test('updateAssetName function updates name in costume field', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        fields: {
            COSTUME: {
                name: 'COSTUME',
                value: 'name1'
            }
        }
    });
    assert.strictEqual(b.getBlock('foo').fields.COSTUME.value, 'name1');
    b.updateAssetName('name1', 'name2', 'costume');
    assert.strictEqual(b.getBlock('foo').fields.COSTUME.value, 'name2');
});

test('updateAssetName function updates name in backdrop field', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'foo',
        fields: {
            BACKDROP: {
                name: 'BACKDROP',
                value: 'name1'
            }
        }
    });
    assert.strictEqual(b.getBlock('foo').fields.BACKDROP.value, 'name1');
    b.updateAssetName('name1', 'name2', 'backdrop');
    assert.strictEqual(b.getBlock('foo').fields.BACKDROP.value, 'name2');
});

test('updateAssetName function updates name in all sprite fields', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'id1',
        fields: {
            TOWARDS: {
                name: 'TOWARDS',
                value: 'name1'
            }
        }
    });
    b.createBlock({
        id: 'id2',
        fields: {
            TO: {
                name: 'TO',
                value: 'name1'
            }
        }
    });
    b.createBlock({
        id: 'id3',
        fields: {
            OBJECT: {
                name: 'OBJECT',
                value: 'name1'
            }
        }
    });
    b.createBlock({
        id: 'id4',
        fields: {
            VIDEOONMENU2: {
                name: 'VIDEOONMENU2',
                value: 'name1'
            }
        }
    });
    b.createBlock({
        id: 'id5',
        fields: {
            DISTANCETOMENU: {
                name: 'DISTANCETOMENU',
                value: 'name1'
            }
        }
    });
    b.createBlock({
        id: 'id6',
        fields: {
            TOUCHINGOBJECTMENU: {
                name: 'TOUCHINGOBJECTMENU',
                value: 'name1'
            }
        }
    });
    b.createBlock({
        id: 'id7',
        fields: {
            CLONE_OPTION: {
                name: 'CLONE_OPTION',
                value: 'name1'
            }
        }
    });
    assert.strictEqual(b.getBlock('id1').fields.TOWARDS.value, 'name1');
    assert.strictEqual(b.getBlock('id2').fields.TO.value, 'name1');
    assert.strictEqual(b.getBlock('id3').fields.OBJECT.value, 'name1');
    assert.strictEqual(b.getBlock('id4').fields.VIDEOONMENU2.value, 'name1');
    assert.strictEqual(b.getBlock('id5').fields.DISTANCETOMENU.value, 'name1');
    assert.strictEqual(b.getBlock('id6').fields.TOUCHINGOBJECTMENU.value, 'name1');
    assert.strictEqual(b.getBlock('id7').fields.CLONE_OPTION.value, 'name1');
    b.updateAssetName('name1', 'name2', 'sprite');
    assert.strictEqual(b.getBlock('id1').fields.TOWARDS.value, 'name2');
    assert.strictEqual(b.getBlock('id2').fields.TO.value, 'name2');
    assert.strictEqual(b.getBlock('id3').fields.OBJECT.value, 'name2');
    assert.strictEqual(b.getBlock('id4').fields.VIDEOONMENU2.value, 'name2');
    assert.strictEqual(b.getBlock('id5').fields.DISTANCETOMENU.value, 'name2');
    assert.strictEqual(b.getBlock('id6').fields.TOUCHINGOBJECTMENU.value, 'name2');
    assert.strictEqual(b.getBlock('id7').fields.CLONE_OPTION.value, 'name2');
});

test('updateAssetName function updates name according to asset type', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'id1',
        fields: {
            SOUND_MENU: {
                name: 'SOUND_MENU',
                value: 'name1'
            }
        }
    });
    b.createBlock({
        id: 'id2',
        fields: {
            COSTUME: {
                name: 'COSTUME',
                value: 'name1'
            }
        }
    });
    assert.strictEqual(b.getBlock('id1').fields.SOUND_MENU.value, 'name1');
    assert.strictEqual(b.getBlock('id2').fields.COSTUME.value, 'name1');
    b.updateAssetName('name1', 'name2', 'sound');
    // only sound should get renamed
    assert.strictEqual(b.getBlock('id1').fields.SOUND_MENU.value, 'name2');
    assert.strictEqual(b.getBlock('id2').fields.COSTUME.value, 'name1');
});

test('updateAssetName only updates given name', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'id1',
        fields: {
            COSTUME: {
                name: 'COSTUME',
                value: 'name1'
            }
        }
    });
    b.createBlock({
        id: 'id2',
        fields: {
            COSTUME: {
                name: 'COSTUME',
                value: 'foo'
            }
        }
    });
    assert.strictEqual(b.getBlock('id1').fields.COSTUME.value, 'name1');
    assert.strictEqual(b.getBlock('id2').fields.COSTUME.value, 'foo');
    b.updateAssetName('name1', 'name2', 'costume');
    assert.strictEqual(b.getBlock('id1').fields.COSTUME.value, 'name2');
    assert.strictEqual(b.getBlock('id2').fields.COSTUME.value, 'foo');
});

test('updateAssetName doesn\'t update name if name isn\'t being used', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'id1',
        fields: {
            BACKDROP: {
                name: 'BACKDROP',
                value: 'foo'
            }
        }
    });
    assert.strictEqual(b.getBlock('id1').fields.BACKDROP.value, 'foo');
    b.updateAssetName('name1', 'name2', 'backdrop');
    assert.strictEqual(b.getBlock('id1').fields.BACKDROP.value, 'foo');
});

test('updateSensingOfReference renames variables in sensing_of block', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'id1',
        opcode: 'sensing_of',
        fields: {
            PROPERTY: {
                name: 'PROPERTY',
                value: 'foo'
            }
        },
        inputs: {
            OBJECT: {
                name: 'OBJECT',
                block: 'id2',
                shadow: 'id2'
            }
        }
    });
    b.createBlock({
        id: 'id2',
        fields: {
            OBJECT: {
                name: 'OBJECT',
                value: '_stage_'
            }
        }
    });
    assert.strictEqual(b.getBlock('id1').fields.PROPERTY.value, 'foo');
    b.updateSensingOfReference('foo', 'bar', '_stage_');
    assert.strictEqual(b.getBlock('id1').fields.PROPERTY.value, 'bar');
});

test('updateSensingOfReference doesn\'t rename if block is inserted', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'id1',
        opcode: 'sensing_of',
        fields: {
            PROPERTY: {
                name: 'PROPERTY',
                value: 'foo'
            }
        },
        inputs: {
            OBJECT: {
                name: 'OBJECT',
                block: 'id3',
                shadow: 'id2'
            }
        }
    });
    b.createBlock({
        id: 'id2',
        fields: {
            OBJECT: {
                name: 'OBJECT',
                value: '_stage_'
            }
        }
    });
    b.createBlock({
        id: 'id3',
        opcode: 'answer'
    });
    assert.strictEqual(b.getBlock('id1').fields.PROPERTY.value, 'foo');
    b.updateSensingOfReference('foo', 'bar', '_stage_');
    assert.strictEqual(b.getBlock('id1').fields.PROPERTY.value, 'foo');
});

test('updateSensingOfReference doesn\'t rename if name is not being used', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'id1',
        opcode: 'sensing_of',
        fields: {
            PROPERTY: {
                name: 'PROPERTY',
                value: 'foo'
            }
        },
        inputs: {
            OBJECT: {
                name: 'OBJECT',
                block: 'id2',
                shadow: 'id2'
            }
        }
    });
    b.createBlock({
        id: 'id2',
        fields: {
            OBJECT: {
                name: 'OBJECT',
                value: '_stage_'
            }
        }
    });
    assert.strictEqual(b.getBlock('id1').fields.PROPERTY.value, 'foo');
    b.updateSensingOfReference('meow', 'meow2', '_stage_');
    assert.strictEqual(b.getBlock('id1').fields.PROPERTY.value, 'foo');
});

test('updateSensingOfReference doesn\'t rename other targets\' variables', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'id1',
        opcode: 'sensing_of',
        fields: {
            PROPERTY: {
                name: 'PROPERTY',
                value: 'foo'
            }
        },
        inputs: {
            OBJECT: {
                name: 'OBJECT',
                block: 'id2',
                shadow: 'id2'
            }
        }
    });
    b.createBlock({
        id: 'id2',
        fields: {
            OBJECT: {
                name: 'OBJECT',
                value: '_stage_'
            }
        }
    });
    assert.strictEqual(b.getBlock('id1').fields.PROPERTY.value, 'foo');
    b.updateSensingOfReference('foo', 'bar', 'Cat');
    assert.strictEqual(b.getBlock('id1').fields.PROPERTY.value, 'foo');
});

test('updateTargetSpecificBlocks changes sprite clicked hat to stage clicked for stage', () => {
    const b = new Blocks(new Runtime());
    b.createBlock({
        id: 'originallySpriteClicked',
        opcode: 'event_whenthisspriteclicked'
    });
    b.createBlock({
        id: 'originallyStageClicked',
        opcode: 'event_whenstageclicked'
    });

    // originallySpriteClicked does not update when on a non-stage target
    b.updateTargetSpecificBlocks(false /* isStage */);
    assert.strictEqual(b.getBlock('originallySpriteClicked').opcode, 'event_whenthisspriteclicked');

    // originallySpriteClicked does update when on a stage target
    b.updateTargetSpecificBlocks(true /* isStage */);
    assert.strictEqual(b.getBlock('originallySpriteClicked').opcode, 'event_whenstageclicked');

    // originallyStageClicked does not update when on a stage target
    b.updateTargetSpecificBlocks(true /* isStage */);
    assert.strictEqual(b.getBlock('originallyStageClicked').opcode, 'event_whenstageclicked');

    // originallyStageClicked does update when on a non-stage target
    b.updateTargetSpecificBlocks(false/* isStage */);
    assert.strictEqual(b.getBlock('originallyStageClicked').opcode, 'event_whenthisspriteclicked');
});

test('getAllVariableAndListReferences returns an empty map references when variable blocks do not exist', () => {
    const b = new Blocks(new Runtime());
    assert.strictEqual(Object.keys(b.getAllVariableAndListReferences()).length, 0);
});

test('getAllVariableAndListReferences returns references when variable blocks exist', () => {
    const b = new Blocks(new Runtime());

    let varListRefs = b.getAllVariableAndListReferences();
    assert.strictEqual(Object.keys(varListRefs).length, 0);

    b.createBlock(adapter(events.mockVariableBlock)[0]);
    b.createBlock(adapter(events.mockListBlock)[0]);

    varListRefs = b.getAllVariableAndListReferences();
    assert.strictEqual(Object.keys(varListRefs).length, 2);
    assert.strictEqual(Array.isArray(varListRefs['mock var id']), true);
    assert.strictEqual(varListRefs['mock var id'].length, 1);
    assert.strictEqual(varListRefs['mock var id'][0].type, Variable.SCALAR_TYPE);
    assert.strictEqual(varListRefs['mock var id'][0].referencingField.value, 'a mock variable');
    assert.strictEqual(Array.isArray(varListRefs['mock list id']), true);
    assert.strictEqual(varListRefs['mock list id'].length, 1);
    assert.strictEqual(varListRefs['mock list id'][0].type, Variable.LIST_TYPE);
    assert.strictEqual(varListRefs['mock list id'][0].referencingField.value, 'a mock list');
});

test('getAllVariableAndListReferences does not return broadcast blocks if the flag is left out', () => {
    const b = new Blocks(new Runtime());
    b.createBlock(adapter(events.mockBroadcastBlock)[0]);
    b.createBlock(adapter(events.mockBroadcastBlock)[1]);

    assert.strictEqual(Object.keys(b.getAllVariableAndListReferences()).length, 0);
});

test('getAllVariableAndListReferences returns broadcast when we tell it to', () => {
    const b = new Blocks(new Runtime());

    b.createBlock(adapter(events.mockVariableBlock)[0]);
    // Make the broadcast block and its shadow (which includes the actual broadcast field).
    b.createBlock(adapter(events.mockBroadcastBlock)[0]);
    b.createBlock(adapter(events.mockBroadcastBlock)[1]);

    const varListRefs = b.getAllVariableAndListReferences(null, true);

    assert.strictEqual(Object.keys(varListRefs).length, 2);
    assert.strictEqual(Array.isArray(varListRefs['mock var id']), true);
    assert.strictEqual(varListRefs['mock var id'].length, 1);
    assert.strictEqual(varListRefs['mock var id'][0].type, Variable.SCALAR_TYPE);
    assert.strictEqual(varListRefs['mock var id'][0].referencingField.value, 'a mock variable');
    assert.strictEqual(Array.isArray(varListRefs['mock broadcast message id']), true);
    assert.strictEqual(varListRefs['mock broadcast message id'].length, 1);
    assert.strictEqual(varListRefs['mock broadcast message id'][0].type, Variable.BROADCAST_MESSAGE_TYPE);
    assert.strictEqual(varListRefs['mock broadcast message id'][0].referencingField.value, 'my message');
});
