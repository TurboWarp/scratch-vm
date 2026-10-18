const {test} = require('node:test');
const assert = require('node:assert');
const Cloud = require('../../src/io/cloud');
const Target = require('../../src/engine/target');
const Variable = require('../../src/engine/variable');
const Runtime = require('../../src/engine/runtime');

test('spec', () => {
    const runtime = new Runtime();
    const cloud = new Cloud(runtime);

    assert.strictEqual(typeof cloud, 'object');
    assert.strictEqual(typeof cloud.postData, 'function');
    assert.strictEqual(typeof cloud.requestCreateVariable, 'function');
    assert.strictEqual(typeof cloud.requestUpdateVariable, 'function');
    assert.strictEqual(typeof cloud.requestRenameVariable, 'function');
    assert.strictEqual(typeof cloud.requestDeleteVariable, 'function');
    assert.strictEqual(typeof cloud.updateCloudVariable, 'function');
    assert.strictEqual(typeof cloud.setProvider, 'function');
    assert.strictEqual(typeof cloud.setStage, 'function');
    assert.strictEqual(typeof cloud.clear, 'function');
});

test('stage and provider are null initially', () => {
    const runtime = new Runtime();
    const cloud = new Cloud(runtime);

    assert.strictEqual(cloud.provider, null);
    assert.strictEqual(cloud.stage, null);
});

test('setProvider sets the provider', () => {
    const runtime = new Runtime();
    const cloud = new Cloud(runtime);

    const provider = {
        foo: 'a fake provider'
    };

    cloud.setProvider(provider);
    assert.strictEqual(cloud.provider, provider);
});

test('postData update message updates the variable', () => {
    const runtime = new Runtime();
    const stage = new Target(runtime);
    const fooVar = Variable.create(
        'a fake var id',
        'foo',
        Variable.SCALAR_TYPE,
        true /* isCloud */
    );
    stage.variables[fooVar.id] = fooVar;

    assert.strictEqual(fooVar.value, 0);

    const cloud = new Cloud(runtime);
    cloud.setStage(stage);
    cloud.postData({varUpdate: {
        name: 'foo',
        value: 3
    }});
    assert.strictEqual(fooVar.value, 3);
});

test('requestUpdateVariable calls provider\'s updateVariable function', () => {
    let updateVariableCalled = false;
    let mockVarName = '';
    let mockVarValue = '';
    const mockUpdateVariable = (name, value) => {
        updateVariableCalled = true;
        mockVarName = name;
        mockVarValue = value;
        return;
    };

    const provider = {
        updateVariable: mockUpdateVariable
    };

    const runtime = new Runtime();
    const cloud = new Cloud(runtime);
    cloud.setProvider(provider);
    cloud.requestUpdateVariable('foo', 3);
    assert.strictEqual(updateVariableCalled, true);
    assert.strictEqual(mockVarName, 'foo');
    assert.strictEqual(mockVarValue, 3);
});

test('requestCreateVariable calls provider\'s createVariable function', () => {
    let createVariableCalled = false;
    const mockVariable = Variable.create('a var id', 'my var', Variable.SCALAR_TYPE, false);
    let mockVarName;
    let mockVarValue;
    const mockCreateVariable = (name, value) => {
        createVariableCalled = true;
        mockVarName = name;
        mockVarValue = value;
        return;
    };

    const provider = {
        createVariable: mockCreateVariable
    };

    const runtime = new Runtime();
    const cloud = new Cloud(runtime);
    cloud.setProvider(provider);
    cloud.requestCreateVariable(mockVariable);
    assert.strictEqual(createVariableCalled, true);
    assert.strictEqual(mockVarName, 'my var');
    assert.strictEqual(mockVarValue, 0);
    // Calling requestCreateVariable does not set isCloud flag on variable
    assert.strictEqual(mockVariable.isCloud, false);
});

test('requestRenameVariable calls provider\'s renameVariable function', () => {
    let renameVariableCalled = false;
    let mockVarOldName;
    let mockVarNewName;
    const mockRenameVariable = (oldName, newName) => {
        renameVariableCalled = true;
        mockVarOldName = oldName;
        mockVarNewName = newName;
        return;
    };

    const provider = {
        renameVariable: mockRenameVariable
    };

    const runtime = new Runtime();
    const cloud = new Cloud(runtime);
    cloud.setProvider(provider);
    cloud.requestRenameVariable('my var', 'new var name');
    assert.strictEqual(renameVariableCalled, true);
    assert.strictEqual(mockVarOldName, 'my var');
    assert.strictEqual(mockVarNewName, 'new var name');
});

test('requestDeleteVariable calls provider\'s deleteVariable function', () => {
    let deleteVariableCalled = false;
    let mockVarName;
    const mockDeleteVariable = name => {
        deleteVariableCalled = true;
        mockVarName = name;
        return;
    };

    const provider = {
        deleteVariable: mockDeleteVariable
    };

    const runtime = new Runtime();
    const cloud = new Cloud(runtime);
    cloud.setProvider(provider);
    cloud.requestDeleteVariable('my var');
    assert.strictEqual(deleteVariableCalled, true);
    assert.strictEqual(mockVarName, 'my var');
});
