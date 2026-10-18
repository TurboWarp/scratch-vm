const {test} = require('node:test');
const assert = require('node:assert');
const Target = require('../../src/engine/target');
const Variable = require('../../src/engine/variable');
const adapter = require('../../src/engine/adapter');
const Runtime = require('../../src/engine/runtime');
const events = require('../fixtures/events.json');

test('spec', () => {
    const target = new Target(new Runtime());

    assert.strictEqual(typeof Target, 'function');
    assert.strictEqual(typeof target, 'object');
    assert.ok(target instanceof Target);

    assert.strictEqual(typeof target.id, 'string');
    assert.strictEqual(typeof target.blocks, 'object');
    assert.strictEqual(typeof target.variables, 'object');
    assert.strictEqual(typeof target.comments, 'object');
    assert.strictEqual(typeof target._customState, 'object');

    assert.strictEqual(typeof target.createVariable, 'function');
    assert.strictEqual(typeof target.renameVariable, 'function');
});

// Create Variable tests.
test('createVariable', () => {
    const target = new Target(new Runtime());
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE);

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    assert.strictEqual(variable.id, 'foo');
    assert.strictEqual(variable.name, 'bar');
    assert.strictEqual(variable.type, Variable.SCALAR_TYPE);
    assert.strictEqual(variable.value, 0);
    assert.strictEqual(variable.isCloud, false);
});

// Create Same Variable twice.
test('createVariable2', () => {
    const target = new Target(new Runtime());
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE);
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE);

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 1);
});

// Create a list
test('createListVariable creates a list', () => {
    const target = new Target(new Runtime());
    target.createVariable('foo', 'bar', Variable.LIST_TYPE);

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    assert.strictEqual(variable.id, 'foo');
    assert.strictEqual(variable.name, 'bar');
    assert.strictEqual(variable.type, Variable.LIST_TYPE);
    assert.ok(variable.value instanceof Array, true);
    assert.strictEqual(variable.value.length, 0);
    assert.strictEqual(variable.isCloud, false);
});

test('createVariable calls cloud io device\'s requestCreateVariable', () => {
    const runtime = new Runtime();
    // Mock the requestCreateVariable function
    let requestCreateCloudWasCalled = false;
    runtime.ioDevices.cloud.requestCreateVariable = () => {
        requestCreateCloudWasCalled = true;
    };

    const target = new Target(runtime);
    target.isStage = true;
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE, true /* isCloud */);

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    assert.strictEqual(variable.id, 'foo');
    assert.strictEqual(variable.name, 'bar');
    assert.strictEqual(variable.type, Variable.SCALAR_TYPE);
    assert.strictEqual(variable.value, 0);
    assert.strictEqual(variable.isCloud, true);
    assert.strictEqual(requestCreateCloudWasCalled, true);
});

test('createVariable does not call cloud io device\'s requestCreateVariable if target is not stage', () => {
    const runtime = new Runtime();
    // Mock the requestCreateVariable function
    let requestCreateCloudWasCalled = false;
    runtime.ioDevices.cloud.requestCreateVariable = () => {
        requestCreateCloudWasCalled = true;
    };

    const target = new Target(runtime);
    target.isStage = false;
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE, true /* isCloud */);

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    assert.strictEqual(variable.id, 'foo');
    assert.strictEqual(variable.name, 'bar');
    assert.strictEqual(variable.type, Variable.SCALAR_TYPE);
    assert.strictEqual(variable.value, 0);
    // isCloud flag doesn't get set if the target is not the stage
    assert.strictEqual(variable.isCloud, false);
    assert.strictEqual(requestCreateCloudWasCalled, false);
});

test('createVariable throws when given invalid type', () => {
    const target = new Target(new Runtime());
    assert.throws(
        (() => target.createVariable('foo', 'bar', 'baz')),
        new Error('Invalid variable type: baz')
    );
});

// Rename Variable tests.
test('renameVariable', () => {
    const target = new Target(new Runtime());
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE);
    target.renameVariable('foo', 'bar2');

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    assert.strictEqual(variable.id, 'foo');
    assert.strictEqual(variable.name, 'bar2');
    assert.strictEqual(variable.value, 0);
    assert.strictEqual(variable.isCloud, false);
});

// Rename Variable that doesn't exist.
test('renameVariable2', () => {
    const target = new Target(new Runtime());
    target.renameVariable('foo', 'bar2');

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 0);
});

// Rename Variable that with id that exists as another variable's name.
// Expect no change.
test('renameVariable3', () => {
    const target = new Target(new Runtime());
    target.createVariable('foo1', 'foo', Variable.SCALAR_TYPE);
    target.renameVariable('foo', 'bar2');

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    assert.strictEqual(variable.id, 'foo1');
    assert.strictEqual(variable.name, 'foo');
});

test('renameVariable calls cloud io device\'s requestRenameVariable function', () => {
    const runtime = new Runtime();

    let requestRenameVariableWasCalled = false;
    runtime.ioDevices.cloud.requestRenameVariable = () => {
        requestRenameVariableWasCalled = true;
    };

    const target = new Target(runtime);
    target.isStage = true;
    const mockCloudVar = Variable.create('foo', 'bar', Variable.SCALAR_TYPE, true);
    target.variables[mockCloudVar.id] = mockCloudVar;
    runtime.addTarget(target);

    target.renameVariable('foo', 'bar2');

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    assert.strictEqual(variable.id, 'foo');
    assert.strictEqual(variable.name, 'bar2');
    assert.strictEqual(variable.value, 0);
    assert.strictEqual(variable.isCloud, true);
    assert.strictEqual(requestRenameVariableWasCalled, true);
});

test('renameVariable does not call cloud io device\'s requestRenameVariable function if target is not stage', () => {
    const runtime = new Runtime();

    let requestRenameVariableWasCalled = false;
    runtime.ioDevices.cloud.requestRenameVariable = () => {
        requestRenameVariableWasCalled = true;
    };

    const target = new Target(runtime);
    const mockCloudVar = Variable.create('foo', 'bar', Variable.SCALAR_TYPE, true);
    target.variables[mockCloudVar.id] = mockCloudVar;
    runtime.addTarget(target);

    target.renameVariable('foo', 'bar2');

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    assert.strictEqual(variable.id, 'foo');
    assert.strictEqual(variable.name, 'bar2');
    assert.strictEqual(variable.value, 0);
    assert.strictEqual(variable.isCloud, true);
    assert.strictEqual(requestRenameVariableWasCalled, false);
});

// Delete Variable tests.
test('deleteVariable', () => {
    const target = new Target(new Runtime());
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE);
    target.deleteVariable('foo');

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 0);
});

// Delete Variable that doesn't exist.
test('deleteVariable2', () => {
    const target = new Target(new Runtime());
    target.deleteVariable('foo');

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 0);
});

test('deleteVariable calls cloud io device\'s requestRenameVariable function', () => {
    const runtime = new Runtime();

    let requestDeleteVariableWasCalled = false;
    runtime.ioDevices.cloud.requestDeleteVariable = () => {
        requestDeleteVariableWasCalled = true;
    };

    const target = new Target(runtime);
    target.isStage = true;
    const mockCloudVar = Variable.create('foo', 'bar', Variable.SCALAR_TYPE, true);
    target.variables[mockCloudVar.id] = mockCloudVar;
    runtime.addTarget(target);

    target.deleteVariable('foo');

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 0);
    assert.strictEqual(requestDeleteVariableWasCalled, true);
});

test('deleteVariable calls cloud io device\'s requestRenameVariable function', () => {
    const runtime = new Runtime();

    let requestDeleteVariableWasCalled = false;
    runtime.ioDevices.cloud.requestDeleteVariable = () => {
        requestDeleteVariableWasCalled = true;
    };

    const target = new Target(runtime);
    const mockCloudVar = Variable.create('foo', 'bar', Variable.SCALAR_TYPE, true);
    target.variables[mockCloudVar.id] = mockCloudVar;
    runtime.addTarget(target);

    target.deleteVariable('foo');

    const variables = target.variables;
    assert.strictEqual(Object.keys(variables).length, 0);
    assert.strictEqual(requestDeleteVariableWasCalled, false);
});

test('duplicateVariable creates a new variable with a new ID by default', () => {
    const target = new Target(new Runtime());
    target.createVariable('a var ID', 'foo', Variable.SCALAR_TYPE);
    assert.strictEqual(Object.keys(target.variables).length, 1);
    const originalVariable = target.variables['a var ID'];
    originalVariable.value = 10;
    const newVariable = target.duplicateVariable('a var ID');
    // Duplicating a variable should not add the variable to the current target
    assert.strictEqual(Object.keys(target.variables).length, 1);
    // Duplicate variable should have a different ID from the original unless specified to keep the original ID.
    assert.notStrictEqual(newVariable.id, 'a var ID');
    assert.strictEqual(typeof target.variables[newVariable.id], 'undefined');

    // Duplicate variable should start out with the same value as the original variable
    assert.strictEqual(newVariable.value, originalVariable.value);

    // Duplicate variable should share its hidden class with the original
    assert.strictEqual(newVariable.constructor, originalVariable.constructor);

    // Modifying one variable should not modify the other
    newVariable.value = 15;
    assert.notStrictEqual(newVariable.value, originalVariable.value);
    assert.strictEqual(originalVariable.value, 10);
});

test('duplicateVariable creates new array reference for list variable.value', () => {
    const target = new Target(new Runtime());
    const arr = [1, 2, 3];
    target.createVariable('a var ID', 'arr', Variable.LIST_TYPE);
    const originalVariable = target.variables['a var ID'];
    originalVariable.value = arr;
    const newVariable = target.duplicateVariable('a var ID');
    // Values are deeply equal but not the same object
    assert.deepEqual(originalVariable.value, newVariable.value);
    assert.notStrictEqual(originalVariable.value, newVariable.value);
});

test('duplicateVariable creates a new variable with a original ID if specified', () => {
    const target = new Target(new Runtime());
    target.createVariable('a var ID', 'foo', Variable.SCALAR_TYPE);
    assert.strictEqual(Object.keys(target.variables).length, 1);
    const originalVariable = target.variables['a var ID'];
    originalVariable.value = 10;
    const newVariable = target.duplicateVariable('a var ID', true);
    // Duplicating a variable should not add the variable to the current target
    assert.strictEqual(Object.keys(target.variables).length, 1);
    // Duplicate variable should have the same ID as the original when specified
    assert.strictEqual(newVariable.id, 'a var ID');

    // Duplicate variable should start out with the same value as the original variable
    assert.strictEqual(newVariable.value, originalVariable.value);

    // Modifying one variable should not modify the other
    newVariable.value = 15;
    assert.notStrictEqual(newVariable.value, originalVariable.value);
    assert.strictEqual(originalVariable.value, 10);
    // The target should still have the original variable with the original value
    assert.strictEqual(target.variables['a var ID'].value, 10);
});

test('duplicateVariable returns null if variable with specified ID does not exist', () => {
    const target = new Target(new Runtime());

    const variable = target.duplicateVariable('a var ID');
    assert.strictEqual(variable, null);
    assert.strictEqual(Object.keys(target.variables).length, 0);

    target.createVariable('var id', 'foo', Variable.SCALAR_TYPE);
    assert.strictEqual(Object.keys(target.variables).length, 1);

    const anotherVariable = target.duplicateVariable('another var ID');
    assert.strictEqual(anotherVariable, null);
    assert.strictEqual(Object.keys(target.variables).length, 1);
    assert.strictEqual(typeof target.variables['another var ID'], 'undefined');
    assert.strictEqual(typeof target.variables['var id'], 'object');
    assert.notStrictEqual(target.variables['var id'], null);
});

test('duplicateVariables duplicates all variables', () => {
    const target = new Target(new Runtime());
    target.createVariable('var ID 1', 'var1', Variable.SCALAR_TYPE);
    target.createVariable('var ID 2', 'var2', Variable.SCALAR_TYPE);

    assert.strictEqual(Object.keys(target.variables).length, 2);

    const var1 = target.variables['var ID 1'];
    const var2 = target.variables['var ID 2'];

    var1.value = 3;
    var2.value = 'foo';

    const duplicateVariables = target.duplicateVariables();

    // Duplicating a target's variables should not change the target's own variables.
    assert.strictEqual(Object.keys(target.variables).length, 2);
    assert.strictEqual(Object.keys(duplicateVariables).length, 2);

    // Should be able to find original var IDs in both this target's variables and
    // the duplicate variables since a blocks container was not specified.
    assert.strictEqual(Object.prototype.hasOwnProperty.call(target.variables, 'var ID 1'), true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(target.variables, 'var ID 2'), true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(duplicateVariables, 'var ID 1'), true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(duplicateVariables, 'var ID 1'), true);

    // Values of the duplicate varaiables should match the value of the original values at the time of duplication
    assert.strictEqual(target.variables['var ID 1'].value, duplicateVariables['var ID 1'].value);
    assert.strictEqual(duplicateVariables['var ID 1'].value, 3);
    assert.strictEqual(target.variables['var ID 2'].value, duplicateVariables['var ID 2'].value);
    assert.strictEqual(duplicateVariables['var ID 2'].value, 'foo');

    // The two sets of variables should still be distinct, modifying the target's variables
    // should not affect the duplicated variables, and vice-versa

    var1.value = 10;
    assert.strictEqual(target.variables['var ID 1'].value, 10);
    assert.strictEqual(duplicateVariables['var ID 1'].value, 3); // should remain unchanged from initial value

    duplicateVariables['var ID 2'].value = 'bar';
    assert.strictEqual(target.variables['var ID 2'].value, 'foo');

    // Deleting a variable on the target should not change the duplicated variables
    target.deleteVariable('var ID 1');
    assert.strictEqual(Object.keys(target.variables).length, 1);
    assert.strictEqual(Object.keys(duplicateVariables).length, 2);
    assert.strictEqual(typeof duplicateVariables['var ID 1'], 'object');
    assert.notStrictEqual(duplicateVariables['var ID 1'], null);
});

test('duplicateVariables re-IDs variables when a block container is provided', () => {
    const target = new Target(new Runtime());

    target.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);
    target.createVariable('another var id', 'var2', Variable.SCALAR_TYPE);

    // Create a block on the target which references the variable with id 'mock var id'
    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    assert.strictEqual(typeof target.blocks.getBlock('a block'), 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.value, 'a mock variable');

    // Deep clone this target's blocks to pass in to 'duplicateVariables'
    const copiedBlocks = target.blocks.duplicate();

    // The copied block should still have the same ID, and its VARIABLE field should still refer to
    // the original variable id
    assert.strictEqual(typeof copiedBlocks.getBlock('a block'), 'object');
    assert.strictEqual(typeof copiedBlocks.getBlock('a block').fields.VARIABLE, 'object');
    assert.strictEqual(copiedBlocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    assert.strictEqual(copiedBlocks.getBlock('a block').fields.VARIABLE.value, 'a mock variable');

    const duplicateVariables = target.duplicateVariables(copiedBlocks);

    // Duplicate variables should have new IDs
    assert.strictEqual(Object.keys(duplicateVariables).length, 2);
    assert.strictEqual(typeof duplicateVariables['mock var id'], 'undefined');
    assert.strictEqual(typeof duplicateVariables['another var id'], 'undefined');

    // Duplicate variables still have the same names..
    const dupes = Object.values(duplicateVariables);
    const dupeVarNames = dupes.map(v => v.name);

    assert.notStrictEqual(dupeVarNames.indexOf('a mock variable'), -1);
    assert.notStrictEqual(dupeVarNames.indexOf('var2'), -1);

    // Duplicating variables should not change blocks on current target
    assert.strictEqual(typeof target.blocks.getBlock('a block'), 'object');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.value, 'a mock variable');

    // The copied blocks passed into duplicateVariables should now reference the new
    // variable ID
    const mockVariableDupe = dupes[dupeVarNames.indexOf('a mock variable')];
    const mockVarDupeID = mockVariableDupe.id;

    assert.strictEqual(typeof copiedBlocks.getBlock('a block'), 'object');
    assert.strictEqual(copiedBlocks.getBlock('a block').fields.VARIABLE.id, mockVarDupeID);
    assert.strictEqual(copiedBlocks.getBlock('a block').fields.VARIABLE.value, 'a mock variable');
});

test('lookupOrCreateList creates a list if var with given id or var with given name does not exist', () => {
    const target = new Target(new Runtime());
    const variables = target.variables;

    assert.strictEqual(Object.keys(variables).length, 0);
    const listVar = target.lookupOrCreateList('foo', 'bar');
    assert.strictEqual(Object.keys(variables).length, 1);
    assert.strictEqual(listVar.id, 'foo');
    assert.strictEqual(listVar.name, 'bar');
});

test('lookupOrCreateList returns list if one with given id exists', () => {
    const target = new Target(new Runtime());
    const variables = target.variables;

    assert.strictEqual(Object.keys(variables).length, 0);
    target.createVariable('foo', 'bar', Variable.LIST_TYPE);
    assert.strictEqual(Object.keys(variables).length, 1);

    const listVar = target.lookupOrCreateList('foo', 'bar');
    assert.strictEqual(Object.keys(variables).length, 1);
    assert.strictEqual(listVar.id, 'foo');
    assert.strictEqual(listVar.name, 'bar');
});

test('lookupOrCreateList succeeds in finding list if id is incorrect but name matches', () => {
    const target = new Target(new Runtime());
    const variables = target.variables;

    assert.strictEqual(Object.keys(variables).length, 0);
    target.createVariable('foo', 'bar', Variable.LIST_TYPE);
    assert.strictEqual(Object.keys(variables).length, 1);

    const listVar = target.lookupOrCreateList('not foo', 'bar');
    assert.strictEqual(Object.keys(variables).length, 1);
    assert.strictEqual(listVar.id, 'foo');
    assert.strictEqual(listVar.name, 'bar');
});

test('lookupBroadcastMsg returns the var with given id if exists', () => {
    const target = new Target(new Runtime());
    const variables = target.variables;

    assert.strictEqual(Object.keys(variables).length, 0);
    target.createVariable('foo', 'bar', Variable.BROADCAST_MESSAGE_TYPE);
    assert.strictEqual(Object.keys(variables).length, 1);

    const broadcastMsg = target.lookupBroadcastMsg('foo', 'bar');
    assert.strictEqual(Object.keys(variables).length, 1);
    assert.strictEqual(broadcastMsg.id, 'foo');
    assert.strictEqual(broadcastMsg.name, 'bar');
});

test('createComment adds a comment to the target', () => {
    const target = new Target(new Runtime());
    const comments = target.comments;

    assert.strictEqual(Object.keys(comments).length, 0);
    target.createComment('a comment', null, 'some comment text',
        10, 20, 200, 300, true);
    assert.strictEqual(Object.keys(comments).length, 1);

    const comment = comments['a comment'];
    assert.notStrictEqual(comment, null);
    assert.strictEqual(comment.blockId, null);
    assert.strictEqual(comment.text, 'some comment text');
    assert.strictEqual(comment.x, 10);
    assert.strictEqual(comment.y, 20);
    assert.strictEqual(comment.width, 200);
    assert.strictEqual(comment.height, 300);
    assert.strictEqual(comment.minimized, true);
});

test('creating comment with id that already exists does not change existing comment', () => {
    const target = new Target(new Runtime());
    const comments = target.comments;

    assert.strictEqual(Object.keys(comments).length, 0);
    target.createComment('a comment', null, 'some comment text',
        10, 20, 200, 300, true);
    assert.strictEqual(Object.keys(comments).length, 1);

    target.createComment('a comment', null,
        'some new comment text', 40, 50, 300, 400, false);

    const comment = comments['a comment'];
    assert.notStrictEqual(comment, null);
    // All of the comment properties should remain unchanged from the first
    // time createComment was called
    assert.strictEqual(comment.blockId, null);
    assert.strictEqual(comment.text, 'some comment text');
    assert.strictEqual(comment.x, 10);
    assert.strictEqual(comment.y, 20);
    assert.strictEqual(comment.width, 200);
    assert.strictEqual(comment.height, 300);
    assert.strictEqual(comment.minimized, true);
});

test('creating a comment with a blockId also updates the comment property on the block', () => {
    const target = new Target(new Runtime());
    const comments = target.comments;
    // Create a mock block on the target
    target.blocks = {
        'a mock block': {
            id: 'a mock block'
        }
    };

    // Mock the getBlock function that's used in commentCreate
    target.blocks.getBlock = id => target.blocks[id];

    assert.strictEqual(Object.keys(comments).length, 0);
    target.createComment('a comment', 'a mock block', 'some comment text',
        10, 20, 200, 300, true);
    assert.strictEqual(Object.keys(comments).length, 1);

    const comment = comments['a comment'];
    assert.strictEqual(comment.blockId, 'a mock block');
    assert.strictEqual(target.blocks.getBlock('a mock block').comment, 'a comment');
});

test('fixUpVariableReferences fixes sprite global var conflicting with project global var', () => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;

    runtime.targets = [stage, target];

    // Create a global variable
    stage.createVariable('pre-existing global var id', 'a mock variable', Variable.SCALAR_TYPE);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    assert.strictEqual(Object.keys(target.variables).length, 0);
    assert.strictEqual(Object.keys(stage.variables).length, 1);
    assert.strictEqual(typeof target.blocks.getBlock('a block'), 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields, 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

    target.fixUpVariableReferences();

    assert.strictEqual(Object.keys(target.variables).length, 0);
    assert.strictEqual(Object.keys(stage.variables).length, 1);
    assert.strictEqual(typeof target.blocks.getBlock('a block'), 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields, 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.id, 'pre-existing global var id');
});

test('fixUpVariableReferences fixes sprite local var conflicting with project global var', () => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.getName = () => 'Target';

    runtime.targets = [stage, target];

    // Create a global variable
    stage.createVariable('pre-existing global var id', 'a mock variable', Variable.SCALAR_TYPE);
    target.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    assert.strictEqual(Object.keys(target.variables).length, 1);
    assert.strictEqual(Object.keys(stage.variables).length, 1);
    assert.strictEqual(typeof target.blocks.getBlock('a block'), 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields, 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    assert.strictEqual(target.variables['mock var id'].name, 'a mock variable');

    target.fixUpVariableReferences();

    assert.strictEqual(Object.keys(target.variables).length, 1);
    assert.strictEqual(Object.keys(stage.variables).length, 1);
    assert.strictEqual(typeof target.blocks.getBlock('a block'), 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields, 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    assert.strictEqual(target.variables['mock var id'].name, 'Target: a mock variable');
});

test('fixUpVariableReferences fixes conflicting sprite local var without blocks referencing var', () => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.getName = () => 'Target';

    runtime.targets = [stage, target];

    // Create a global variable
    stage.createVariable('pre-existing global var id', 'a mock variable', Variable.SCALAR_TYPE);
    target.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);


    assert.strictEqual(Object.keys(target.variables).length, 1);
    assert.strictEqual(Object.keys(stage.variables).length, 1);
    assert.strictEqual(target.variables['mock var id'].name, 'a mock variable');

    target.fixUpVariableReferences();

    assert.strictEqual(Object.keys(target.variables).length, 1);
    assert.strictEqual(Object.keys(stage.variables).length, 1);
    assert.strictEqual(target.variables['mock var id'].name, 'Target: a mock variable');
});

test('fixUpVariableReferences fixes sprite global var conflicting with other sprite\'s local var', () => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;

    const existingTarget = new Target(runtime);
    existingTarget.isStage = false;

    runtime.targets = [stage, target, existingTarget];

    // Create a local variable on the pre-existing target
    existingTarget.createVariable('pre-existing local var id', 'a mock variable', Variable.SCALAR_TYPE);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    assert.strictEqual(Object.keys(existingTarget.variables).length, 1);
    const existingVariable = Object.values(existingTarget.variables)[0];
    assert.strictEqual(existingVariable.name, 'a mock variable');
    assert.strictEqual(Object.keys(target.variables).length, 0);
    assert.strictEqual(Object.keys(stage.variables).length, 0);
    assert.strictEqual(typeof target.blocks.getBlock('a block'), 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields, 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

    target.fixUpVariableReferences();

    assert.strictEqual(Object.keys(existingTarget.variables).length, 1);
    assert.strictEqual(existingVariable.name, 'a mock variable');
    assert.strictEqual(Object.keys(target.variables).length, 0);
    assert.strictEqual(Object.keys(stage.variables).length, 1);
    assert.strictEqual(typeof target.blocks.getBlock('a block'), 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields, 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    const newGlobal = stage.variables[Object.keys(stage.variables)[0]];
    assert.strictEqual(newGlobal.name, 'a mock variable2');
});

test('fixUpVariableReferences does not change variable name if there is no variable conflict', () => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.getName = () => 'Target';

    runtime.targets = [stage, target];

    // Create a global variable
    stage.createVariable('pre-existing global var id', 'a variable', Variable.SCALAR_TYPE);
    stage.createVariable('pre-existing global list id', 'a mock variable', Variable.LIST_TYPE);
    target.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    assert.strictEqual(Object.keys(target.variables).length, 1);
    assert.strictEqual(Object.keys(stage.variables).length, 2);
    assert.strictEqual(typeof target.blocks.getBlock('a block'), 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields, 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    assert.strictEqual(target.variables['mock var id'].name, 'a mock variable');

    target.fixUpVariableReferences();

    assert.strictEqual(Object.keys(target.variables).length, 1);
    assert.strictEqual(Object.keys(stage.variables).length, 2);
    assert.strictEqual(typeof target.blocks.getBlock('a block'), 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields, 'object');
    assert.strictEqual(typeof target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    assert.strictEqual(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    assert.strictEqual(target.variables['mock var id'].name, 'a mock variable');
});
