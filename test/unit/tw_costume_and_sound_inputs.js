const {test} = require('node:test');
const assert = require('node:assert');
const Runtime = require('../../src/engine/runtime');
const BlockType = require('../../src/extension-support/block-type');
const ArgumentType = require('../../src/extension-support/argument-type');

const extension = {
    id: 'costumesoundtest',
    name: 'Costume & Sound',
    blocks: [
        {
            blockType: BlockType.COMMAND,
            opcode: 'costume',
            text: 'costume [a] [b]',
            arguments: {
                a: {
                    type: ArgumentType.COSTUME
                },
                b: {
                    type: ArgumentType.COSTUME,
                    defaultValue: 'default costume'
                }
            }
        },
        {
            blockType: BlockType.COMMAND,
            opcode: 'sound',
            text: 'sound [a] [b]',
            arguments: {
                a: {
                    type: ArgumentType.SOUND
                },
                b: {
                    type: ArgumentType.SOUND,
                    defaultValue: 'default sound'
                }
            }
        }
    ]
};

test('COSTUME and SOUND inputs generate correct scratch-blocks XML', (t, done) => {
    const rt = new Runtime();
    rt.on('EXTENSION_ADDED', info => {
        /* eslint-disable max-len */
        assert.strictEqual(
            info.blocks[0].xml,
            '<block type="costumesoundtest_costume"><value name="a"><shadow type="looks_costume"></shadow></value><value name="b"><shadow type="looks_costume"><field name="COSTUME">default costume</field></shadow></value></block>'
        );
        assert.strictEqual(
            info.blocks[1].xml,
            '<block type="costumesoundtest_sound"><value name="a"><shadow type="sound_sounds_menu"></shadow></value><value name="b"><shadow type="sound_sounds_menu"><field name="SOUND_MENU">default sound</field></shadow></value></block>'
        );
        /* eslint-enable max-len */
        done();
    });
    rt._registerExtensionPrimitives(extension);
});
