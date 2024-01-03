const {test} = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('extensions', t => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testextension',
            name: 'test',
            blocks: [
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'nothing'
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'empty',
                    extensions: []
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'iconNothing',
                    blockIconURI: 'data:whatever'
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'iconEmpty',
                    blockIconURI: 'data:whatever',
                    extensions: []
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'iconSomething',
                    blockIconURI: 'data:whatever',
                    extensions: ['colours_sensing']
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'iconDuplicate',
                    blockIconURI: 'data:whatever',
                    extensions: ['colours_sensing', 'scratch_extension']
                }
            ]
        })
    });

    const blocks = vm.runtime.getBlocksJSON();
    t.same(blocks[0].extensions, []);
    t.same(blocks[1].extensions, []);
    t.same(blocks[2].extensions, ['scratch_extension']);
    t.same(blocks[3].extensions, ['scratch_extension']);
    t.same(blocks[4].extensions, ['colours_sensing', 'scratch_extension']);
    t.same(blocks[5].extensions, ['colours_sensing', 'scratch_extension']);

    t.end();
});
