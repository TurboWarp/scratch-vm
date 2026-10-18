const {test} = require('node:test');
const assert = require('node:assert');
const Worker = require('tiny-worker');

const BlockType = require('../../src/extension-support/block-type');

const dispatch = require('../../src/dispatch/central-dispatch');
const VirtualMachine = require('../../src/virtual-machine');

const Sprite = require('../../src/sprites/sprite');
const RenderedTarget = require('../../src/sprites/rendered-target');

// By default Central Dispatch works with the Worker class built into the browser. Tell it to use TinyWorker instead.
dispatch.workerClass = Worker;

class TestInternalExtension {
    constructor () {
        this.status = {};
        this.status.constructorCalled = true;
    }

    getInfo () {
        this.status.getInfoCalled = true;
        return {
            id: 'testInternalExtension',
            name: 'Test Internal Extension',
            blocks: [
                {
                    opcode: 'go'
                }
            ],
            menus: {
                simpleMenu: this._buildAMenu(),
                dynamicMenu: '_buildDynamicMenu'
            }
        };
    }

    go (args, util, blockInfo) {
        this.status.goCalled = true;
        return blockInfo;
    }

    _buildAMenu () {
        this.status.buildMenuCalled = true;
        return ['abcd', 'efgh', 'ijkl'];
    }

    _buildDynamicMenu () {
        this.status.buildDynamicMenuCalled = true;
        return [1, 2, 3, 4, 6];
    }
}

test('internal extension', () => {
    const vm = new VirtualMachine();

    const extension = new TestInternalExtension();
    assert.ok(extension.status.constructorCalled);

    assert.ok(!extension.status.getInfoCalled);
    vm.extensionManager._registerInternalExtension(extension);
    assert.ok(extension.status.getInfoCalled);

    const func = vm.runtime.getOpcodeFunction('testInternalExtension_go');
    assert.strictEqual(typeof func, 'function');

    assert.ok(!extension.status.goCalled);
    const goBlockInfo = func();
    assert.ok(extension.status.goCalled);

    // The 'go' block returns its own blockInfo. Make sure it matches the expected info.
    // Note that the extension parser fills in missing fields so there are more fields here than in `getInfo`.
    const expectedBlockInfo = {
        arguments: {},
        blockAllThreads: false,
        blockType: BlockType.COMMAND,
        func: goBlockInfo.func, // Cheat since we don't have a good way to ensure we generate the same function
        opcode: 'go',
        terminal: false,
        text: 'go'
    };
    assert.deepEqual(goBlockInfo, expectedBlockInfo);

    // There should be 2 menus - one is an array, one is the function to call.
    assert.strictEqual(vm.runtime._blockInfo[0].menus.length, 2);
    // First menu has 3 items.
    assert.strictEqual(
        vm.runtime._blockInfo[0].menus[0].json.args0[0].options.length, 3);
    // Second menu is a dynamic menu and therefore should be a function.
    assert.strictEqual(typeof vm.runtime._blockInfo[0].menus[1].json.args0[0].options, 'function');
});

test('load sync', () => {
    const vm = new VirtualMachine();
    vm.extensionManager.loadExtensionIdSync('coreExample');
    assert.ok(vm.extensionManager.isExtensionLoaded('coreExample'));

    assert.strictEqual(vm.runtime._blockInfo.length, 1);

    // blocks should be an array of two items: a button pseudo-block and a reporter block.
    assert.strictEqual(vm.runtime._blockInfo[0].blocks.length, 3);
    assert.strictEqual(typeof vm.runtime._blockInfo[0].blocks[0].info, 'object');
    assert.strictEqual(vm.runtime._blockInfo[0].blocks[0].info.func, 'MAKE_A_VARIABLE');
    assert.strictEqual(vm.runtime._blockInfo[0].blocks[0].info.blockType, 'button');
    assert.strictEqual(typeof vm.runtime._blockInfo[0].blocks[1].info, 'object');
    assert.strictEqual(vm.runtime._blockInfo[0].blocks[1].info.opcode, 'exampleOpcode');
    assert.strictEqual(vm.runtime._blockInfo[0].blocks[1].info.blockType, 'reporter');
    assert.strictEqual(typeof vm.runtime._blockInfo[0].blocks[2].info, 'object');
    assert.strictEqual(vm.runtime._blockInfo[0].blocks[2].info.opcode, 'exampleWithInlineImage');
    assert.strictEqual(vm.runtime._blockInfo[0].blocks[2].info.blockType, 'command');

    // Test the opcode function
    assert.strictEqual(vm.runtime._blockInfo[0].blocks[1].info.func(), 'no stage yet');

    const sprite = new Sprite(null, vm.runtime);
    sprite.name = 'Stage';
    const stage = new RenderedTarget(sprite, vm.runtime);
    stage.isStage = true;
    vm.runtime.targets = [stage];

    assert.strictEqual(vm.runtime._blockInfo[0].blocks[1].info.func(), 'Stage');
});
