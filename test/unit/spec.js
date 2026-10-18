const {test} = require('node:test');
const assert = require('node:assert');
const VirtualMachine = require('../../src/index');

test('interface', () => {
    const vm = new VirtualMachine();
    assert.strictEqual(typeof vm, 'object');
    assert.strictEqual(typeof vm.start, 'function');
    assert.strictEqual(typeof vm.greenFlag, 'function');
    assert.strictEqual(typeof vm.setTurboMode, 'function');
    assert.strictEqual(typeof vm.setCompatibilityMode, 'function');
    assert.strictEqual(typeof vm.stopAll, 'function');
    assert.strictEqual(typeof vm.clear, 'function');

    assert.strictEqual(typeof vm.getPlaygroundData, 'function');
    assert.strictEqual(typeof vm.postIOData, 'function');

    assert.strictEqual(typeof vm.loadProject, 'function');
    assert.strictEqual(typeof vm.addSprite, 'function');
    assert.strictEqual(typeof vm.addCostume, 'function');
    assert.strictEqual(typeof vm.addBackdrop, 'function');
    assert.strictEqual(typeof vm.addSound, 'function');
    assert.strictEqual(typeof vm.deleteCostume, 'function');
    assert.strictEqual(typeof vm.deleteSound, 'function');
    assert.strictEqual(typeof vm.renameSprite, 'function');
    assert.strictEqual(typeof vm.deleteSprite, 'function');

    assert.strictEqual(typeof vm.attachRenderer, 'function');
    assert.strictEqual(typeof vm.blockListener, 'function');
    assert.strictEqual(typeof vm.flyoutBlockListener, 'function');
    assert.strictEqual(typeof vm.setEditingTarget, 'function');

    assert.strictEqual(typeof vm.emitTargetsUpdate, 'function');
    assert.strictEqual(typeof vm.emitWorkspaceUpdate, 'function');
    assert.strictEqual(typeof vm.postSpriteInfo, 'function');
});
