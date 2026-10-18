const {test} = require('node:test');
const assert = require('node:assert');
const VirtualMachine = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('branchIconURI', () => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testextension',
            name: 'test',
            blocks: [
                {
                    blockType: BlockType.LOOP,
                    opcode: 'block1',
                    text: 'no custom icon'
                },
                {
                    blockType: BlockType.LOOP,
                    opcode: 'block2',
                    text: 'LOOP with custom icon',
                    branchIconURI: 'data:whatever1'
                },
                {
                    blockType: BlockType.CONDITIONAL,
                    opcode: 'block3',
                    text: 'CONDITIONAL with custom icon',
                    branchIconURI: 'data:whatever2'
                },
                {
                    blockType: BlockType.LOOP,
                    opcode: 'block4',
                    text: 'LOOP with no icon',
                    branchIconURI: ''
                }
            ]
        })
    });

    const blocks = vm.runtime.getBlocksJSON();
    assert.strictEqual(blocks[0].args2[0].src, 'media://repeat.svg', 'default custom icon');
    assert.strictEqual(blocks[1].args2[0].src, 'data:whatever1', 'LOOP with custom icon');
    assert.strictEqual(blocks[2].args2[0].src, 'data:whatever2', 'CONDITIONAL with custom icon');
    assert.deepEqual(blocks[3].args2, null, 'LOOP with no icon');
});
