const {test, beforeEach} = require('node:test');
const assert = require('node:assert');
const path = require('path');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const makeTestStorage = require('../fixtures/make-test-storage');
const VirtualMachine = require('../../src/virtual-machine');

let vm;
let projectChanged;
let blockContainer;

beforeEach(async () => {
    const projectUri = path.resolve(__dirname, '../fixtures/default.sb2');
    const project = readFileToBuffer(projectUri);

    vm = new VirtualMachine();

    vm.runtime.addListener('PROJECT_CHANGED', () => {
        projectChanged = true;
    });

    vm.attachStorage(makeTestStorage());
    await vm.loadProject(project);
    blockContainer = vm.editingTarget.blocks;

    // Add mock blocks to use for tests
    blockContainer.createBlock({
        id: 'a parent block',
        opcode: 'my_testParentBlock',
        fields: {},
        inputs: {}
    });


    blockContainer.createBlock({
        id: 'a new block',
        opcode: 'my_testBlock',
        topLevel: true,
        x: -10,
        y: 35,
        fields: {
            A_FIELD: {
                name: 'A_FIELD',
                value: 10
            }
        },
        inputs: {},
        parent: 'a block'
    });

    // Reset project changes from new blocks
    projectChanged = false;

});

test('Creating a block should emit a project changed event', () => {
    blockContainer.createBlock({
        id: 'another block',
        opcode: 'my_testBlock',
        topLevel: true
    });

    assert.strictEqual(projectChanged, true);
});

test('Deleting a block should emit a project changed event', () => {
    blockContainer.deleteBlock('a new block');

    assert.strictEqual(projectChanged, true);
});

test('Changing a block should emit a project changed event', () => {
    blockContainer.changeBlock({
        element: 'field',
        id: 'a new block',
        name: 'A_FIELD',
        value: 300
    });

    assert.strictEqual(projectChanged, true);
    projectChanged = false;

    blockContainer.changeBlock({
        element: 'checkbox',
        id: 'a new block',
        value: true
    });

    assert.strictEqual(projectChanged, true);
    projectChanged = false;

    blockContainer.changeBlock({
        element: 'mutation',
        id: 'a new block',
        value: '<mutation></mutation>'
    });

    assert.strictEqual(projectChanged, true);
});

test('Moving a block to a new position should emit a project changed event', () => {
    blockContainer.moveBlock({
        id: 'a new block',
        newCoordinate: {
            x: -40,
            y: 350
        }
    });

    assert.strictEqual(projectChanged, true);
});

test('Connecting a block to a new parent should emit a project changed event', () => {
    blockContainer.createBlock({
        id: 'another block',
        opcode: 'my_testBlock'
    });

    projectChanged = false;

    blockContainer.moveBlock({
        id: 'a new block',
        newParent: 'another block'
    });

    assert.strictEqual(projectChanged, true);
});

test('Disconnecting a block from another should emit a project changed event', () => {
    blockContainer.moveBlock({
        id: 'a new block',
        oldParent: 'a parent block'
    });

    assert.strictEqual(projectChanged, true);
});

test('Creating a local variable should emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'var_create',
        varId: 'a new variable',
        varName: 'foo',
        varType: '',
        isLocal: true,
        isCloud: false
    });

    assert.strictEqual(projectChanged, true);

    projectChanged = false;

    // Creating the same variable twice should not emit a project changed event
    blockContainer.blocklyListen({
        type: 'var_create',
        varId: 'a new variable',
        varName: 'foo',
        varType: '',
        isLocal: true,
        isCloud: false
    });

    assert.strictEqual(projectChanged, false);
});

test('Creating a global variable should emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'var_create',
        varId: 'a new variable',
        varName: 'foo',
        varType: '',
        isLocal: false,
        isCloud: false
    });

    assert.strictEqual(projectChanged, true);

    projectChanged = false;

    // Creating the same variable twice should not emit a project changed event
    blockContainer.blocklyListen({
        type: 'var_create',
        varId: 'a new variable',
        varName: 'foo',
        varType: '',
        isLocal: false,
        isCloud: false
    });

    assert.strictEqual(projectChanged, false);
});

test('Renaming a variable should emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'var_create',
        varId: 'a new variable',
        varName: 'foo',
        varType: '',
        isLocal: false,
        isCloud: false
    });

    projectChanged = false;

    blockContainer.blocklyListen({
        type: 'var_rename',
        varId: 'a new variable',
        oldName: 'foo',
        newName: 'bar'
    });

    assert.strictEqual(projectChanged, true);
});

test('Deleting a variable should emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'var_create',
        varId: 'a new variable',
        varName: 'foo',
        varType: '',
        isLocal: false,
        isCloud: false
    });

    projectChanged = false;

    blockContainer.blocklyListen({
        type: 'var_delete',
        varId: 'a new variable',
        varName: 'foo',
        varType: '',
        isLocal: false,
        isCloud: false
    });

    assert.strictEqual(projectChanged, true);
});

test('Creating a block comment should emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'comment_create',
        blockId: 'a new block',
        commentId: 'a new comment',
        height: 250,
        width: 400,
        xy: {
            x: -40,
            y: 27
        },
        minimized: false,
        text: 'comment'
    });

    assert.strictEqual(projectChanged, true);
});

test('Creating a workspace comment should emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'comment_create',
        blockId: null,
        commentId: 'a new comment',
        height: 250,
        width: 400,
        xy: {
            x: -40,
            y: 27
        },
        minimized: false,
        text: 'comment'
    });

    assert.strictEqual(projectChanged, true);
});

test('Changing a comment should emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'comment_create',
        blockId: null,
        commentId: 'a new comment',
        height: 250,
        width: 400,
        xy: {
            x: -40,
            y: 27
        },
        minimized: false,
        text: 'comment'
    });

    projectChanged = false;

    blockContainer.blocklyListen({
        type: 'comment_change',
        blockId: null,
        commentId: 'a new comment',
        newContents_: {
            minimized: true
        },
        oldContents_: {
            minimized: false
        }
    });

    assert.strictEqual(projectChanged, true);
});

test('Attempting to change a comment that does not exist should not emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'comment_change',
        blockId: null,
        commentId: 'a new comment',
        newContents_: {
            minimized: true
        },
        oldContents_: {
            minimized: false
        }
    });

    assert.strictEqual(projectChanged, false);
});

test('Deleting a block comment should emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'comment_create',
        blockId: 'a new block',
        commentId: 'a new comment',
        height: 250,
        width: 400,
        xy: {
            x: -40,
            y: 27
        },
        minimized: false,
        text: 'comment'
    });

    projectChanged = false;

    blockContainer.blocklyListen({
        type: 'comment_delete',
        blockId: 'a new block',
        commentId: 'a new comment',
        height: 250,
        width: 400,
        xy: {
            x: -40,
            y: 27
        },
        minimized: false,
        text: 'comment'
    });

    assert.strictEqual(projectChanged, true);
});

test('Deleting a workspace comment should emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'comment_create',
        blockId: null,
        commentId: 'a new comment',
        height: 250,
        width: 400,
        xy: {
            x: -40,
            y: 27
        },
        minimized: false,
        text: 'comment'
    });

    projectChanged = false;

    blockContainer.blocklyListen({
        type: 'comment_delete',
        blockId: null,
        commentId: 'a new comment',
        height: 250,
        width: 400,
        xy: {
            x: -40,
            y: 27
        },
        minimized: false,
        text: 'comment'
    });

    assert.strictEqual(projectChanged, true);
});

test('Deleting a comment that does not exist should not emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'comment_delete',
        blockId: null,
        commentId: 'a new comment',
        height: 250,
        width: 400,
        xy: {
            x: -40,
            y: 27
        },
        minimized: false,
        text: 'comment'
    });

    assert.strictEqual(projectChanged, false);
});

test('Moving a comment should emit a project changed event', () => {
    blockContainer.blocklyListen({
        type: 'comment_create',
        blockId: null,
        commentId: 'a new comment',
        height: 250,
        width: 400,
        xy: {
            x: -40,
            y: 27
        },
        minimized: false,
        text: 'comment'
    });

    projectChanged = false;

    blockContainer.blocklyListen({
        type: 'comment_move',
        blockId: null,
        commentId: 'a new comment',
        oldCoordinate_: {
            x: -40,
            y: 27
        },
        newCoordinate_: {
            x: -35,
            y: 50
        }
    });

    assert.strictEqual(projectChanged, true);
});
