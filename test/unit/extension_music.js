const {test} = require('node:test');
const assert = require('node:assert');
const Music = require('../../src/extensions/scratch3_music/index.js');

const fakeRuntime = {
    getTargetForStage: () => ({tempo: 60}),
    on: () => {} // Stub out listener methods used in constructor.
};

const blocks = new Music(fakeRuntime);

const util = {
    stackFrame: Object.create(null),
    target: {
        audioPlayer: null
    },
    yield: () => null
};

test('playDrum uses 1-indexing and wrap clamps', () => {
    // Stub playDrumNum
    let playedDrum;
    blocks._playDrumNum = (_util, drum) => (playedDrum = drum);

    let args = {DRUM: 1};
    blocks.playDrumForBeats(args, util);
    assert.strictEqual(playedDrum, 0);

    args = {DRUM: blocks.DRUM_INFO.length + 1};
    blocks.playDrumForBeats(args, util);
    assert.strictEqual(playedDrum, 0);
});

test('setInstrument uses 1-indexing and wrap clamps', () => {
    // Stub getMusicState
    const state = {currentInstrument: 0};
    blocks._getMusicState = () => state;

    let args = {INSTRUMENT: 1};
    blocks.setInstrument(args, util);
    assert.strictEqual(state.currentInstrument, 0);

    args = {INSTRUMENT: blocks.INSTRUMENT_INFO.length + 1};
    blocks.setInstrument(args, util);
    assert.strictEqual(state.currentInstrument, 0);
});
