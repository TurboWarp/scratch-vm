const {test} = require('node:test');
const assert = require('node:assert');
const VirtualMachine = require('../../src/virtual-machine');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Sprite = require('../../src/sprites/sprite');

test('Serializes standalone blocks', () => {
    const vm = new VirtualMachine();

    vm.extensionManager.workerURLs[0] = 'https://example.com/test1.js';
    vm.extensionManager.workerURLs[1] = 'https://example.com/test2.js';
    vm.extensionManager._loadedExtensions.set('test1', 'test.0.0');
    vm.extensionManager._loadedExtensions.set('test2', 'test.1.0');

    const primitiveBlock = {
        id: 'donotcompress1',
        opcode: 'control_if'
    };
    const extensionBlock1 = {
        id: 'donotcompress2',
        opcode: 'test1_something'
    };
    const extensionBlock2 = {
        id: 'donotcompress3',
        opcode: 'test2_something'
    };

    assert.deepEqual(vm.exportStandaloneBlocks([]), []);
    assert.deepEqual(vm.exportStandaloneBlocks([primitiveBlock]), [primitiveBlock]);
    assert.deepEqual(vm.exportStandaloneBlocks([extensionBlock1, extensionBlock2]), {
        blocks: [extensionBlock1, extensionBlock2],
        extensionURLs: {
            test1: 'https://example.com/test1.js',
            test2: 'https://example.com/test2.js'
        }
    });
    assert.deepEqual(vm.exportStandaloneBlocks([primitiveBlock, extensionBlock2]), {
        blocks: [primitiveBlock, extensionBlock2],
        extensionURLs: {
            test2: 'https://example.com/test2.js'
        }
    });
});

test('Deserializes vanilla standalone blocks', async () => {
    const vm = new VirtualMachine();
    const target = new RenderedTarget(new Sprite(null, vm.runtime), vm.runtime);
    vm.runtime.addTarget(target);

    await vm.shareBlocksToTarget([
        {
            id: 'abcdef',
            opcode: 'control_if'
        }
    ], target.id);
    const createdBlock = Object.values(target.sprite.blocks._blocks)[0];
    assert.strictEqual(createdBlock.opcode, 'control_if');
    assert.notStrictEqual(createdBlock.id, 'abcdef', 'opcode changed');
});

test('Deserializes standalone blocks with extensions', async () => {
    const vm = new VirtualMachine();
    const target = new RenderedTarget(new Sprite(null, vm.runtime), vm.runtime);
    vm.runtime.addTarget(target);

    const events = [];
    vm.securityManager.canLoadExtensionFromProject = url => {
        events.push(`canLoadExtensionFromProject ${url}`);
        return true;
    };
    vm.extensionManager.loadExtensionURL = url => {
        events.push(`loadExtensionURL ${url}`);
        return Promise.resolve();
    };

    await vm.shareBlocksToTarget({
        blocks: [
            {
                id: 'fruit',
                opcode: 'pen_clear'
            },
            {
                id: 'vegetable',
                opcode: 'test1_something'
            }
        ],
        extensionURLs: {
            test1: 'https://example.com/test1.js',
            test2: 'https://example.com/should.be.discarded.js',
            pen: 'https://example.com/should.also.be.discarded.js'
        }
    }, target.id);
    assert.deepEqual(events, [
        'canLoadExtensionFromProject https://example.com/test1.js',
        'loadExtensionURL https://example.com/test1.js'
    ]);

    const penBlock = Object.values(target.sprite.blocks._blocks).find(i => i.opcode === 'pen_clear');
    assert.notStrictEqual(penBlock.id, 'fruit', 'changed pen block id');

    const extensionBlock = Object.values(target.sprite.blocks._blocks).find(i => i.opcode === 'test1_something');
    assert.notStrictEqual(extensionBlock.id, 'vegetable', 'changed extension block id');
});
