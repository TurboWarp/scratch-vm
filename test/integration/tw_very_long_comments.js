const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const VirtualMachine = require('../../src/virtual-machine');
const Runtime = require('../../src/engine/runtime');
const sb3 = require('../../src/serialization/sb3');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Sprite = require('../../src/sprites/sprite');
const path = require('path');

test('serializes very long comments', () => {
    const rt = new Runtime();
    const sprite = new Sprite();
    const target = new RenderedTarget(sprite);
    rt.addTarget(target);

    target.createComment('id_short', null, 'short comment', 0, 0, 20, 20, false);
    target.createComment('id_max_length', null, `start${'0'.repeat(8000 - 5)}`, 0, 0, 20, 20, false);
    target.createComment('id_max_length_plus_1', null, `start${'0'.repeat(8000 - 5)}a`, 0, 0, 20, 20, false);
    target.createComment(
        'id_way_too_long',
        null,
        `start${'0'.repeat(8000 - 5 - 3)}endthis should be the truncated part${'0'.repeat(25000)}`,
        0,
        0,
        20,
        20,
        false
    );

    const serialized = sb3.serialize(rt, target.id);
    const common = {
        // same for every block, already tested elsewhere, not interesting for here
        blockId: null,
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        minimized: false
    };
    assert.deepEqual(serialized.comments, {
        id_short: {
            ...common,
            text: 'short comment'
        },
        id_max_length: {
            ...common,
            text: `start${'0'.repeat(8000 - 5)}`
        },
        id_max_length_plus_1: {
            ...common,
            text: `start${'0'.repeat(8000 - 5)}`,
            extraText: 'a'
        },
        id_way_too_long: {
            ...common,
            text: `start${'0'.repeat(8000 - 5 - 3)}end`,
            extraText: `this should be the truncated part${'0'.repeat(25000)}`
        }
    });
});

test('deserializes very long comments', async () => {
    const vm = new VirtualMachine();
    const fixture = fs.readFileSync(path.resolve(__dirname, '../fixtures/tw-very-long-comments.sb3'));
    await vm.loadProject(fixture);
    const comments = vm.runtime.targets[0].comments;

    // note that comment IDs may change each time the test project is saved
    assert.strictEqual(comments.b.text, '');
    assert.strictEqual(comments.a.text, 'short');
    assert.strictEqual(comments.c.text, `exactly length limit${'0'.repeat(8000 - 'exactly length limit'.length)}`);
    assert.strictEqual(comments.d.text, `length limit + 1${':'.repeat(8000 - 'length limit + 1'.length)}1`);
    assert.strictEqual(
        comments.e.text,
        `unreasonably long${'!'.repeat(8000 - 'unreasonably long'.length)}${'123456789'.repeat(2000)}`
    );
});
