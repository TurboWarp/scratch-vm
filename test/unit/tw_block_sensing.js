const {test} = require('node:test');
const assert = require('node:assert');
const Scratch3SensingBlocks = require('../../src/blocks/scratch3_sensing');
const Runtime = require('../../src/engine/runtime');

test('isOnline', () => {
    const rt = new Runtime();
    const sensing = new Scratch3SensingBlocks(rt);

    if (!global.navigator) {
        global.navigator = {};
    }

    Object.defineProperty(global.navigator, 'onLine', {
        get: () => false,
        configurable: true,
        enumerable: true
    });
    assert.strictEqual(sensing.isOnline(), false);

    Object.defineProperty(global.navigator, 'onLine', {
        get: () => true,
        configurable: true,
        enumerable: true
    });
    assert.strictEqual(sensing.isOnline(), true);
});
