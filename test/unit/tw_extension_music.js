const {test} = require('node:test');
const assert = require('node:assert');
const Music = require('../../src/extensions/scratch3_music/index.js');
const Runtime = require('../../src/engine/runtime.js');

test('_isConcurrencyLimited', () => {
    const rt = new Runtime();

    // sanity check so that the setRuntimeOptions() call below actually does something
    assert.strictEqual(rt.runtimeOptions.miscLimits, true, 'misc limits enabled by default');

    const blocks = new Music(rt);
    assert.strictEqual(blocks._isConcurrencyLimited(), false, 'not limited initially');

    // logic here is slightly weird but this matches Scratch
    blocks._concurrencyCounter = Music.CONCURRENCY_LIMIT;
    assert.strictEqual(blocks._isConcurrencyLimited(), false, 'not limited at limit');

    blocks._concurrencyCounter = Music.CONCURRENCY_LIMIT + 1;
    assert.strictEqual(blocks._isConcurrencyLimited(), true, 'limited above limit');

    rt.setRuntimeOptions({
        miscLimits: false
    });
    assert.strictEqual(blocks._isConcurrencyLimited(), false, 'not limited when miscLimits: false');
});
