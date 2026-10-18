const {test} = require('node:test');
const assert = require('node:assert');

const Runtime = require('../../src/engine/runtime');
const Target = require('../../src/engine/target');
const Sprite = require('../../src/sprites/sprite');
const Scratch3SoundBlocks = require('../../src/blocks/scratch3_sound');

test('effect clamping runtime option', () => {
    const rt = new Runtime();
    const target = new Target(rt);
    const sprite = new Sprite();
    target.sprite = sprite;
    const sound = new Scratch3SoundBlocks(rt);

    sound.setEffect({
        EFFECT: 'pitch',
        VALUE: 720
    }, {
        target
    });
    assert.strictEqual(sound._getSoundState(target).effects.pitch, 360);

    rt.setRuntimeOptions({
        miscLimits: false
    });
    sound.setEffect({
        EFFECT: 'pitch',
        VALUE: 720
    }, {
        target
    });
    assert.strictEqual(sound._getSoundState(target).effects.pitch, 720);
});
