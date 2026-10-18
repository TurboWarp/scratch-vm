const {test} = require('node:test');
const assert = require('node:assert');
const Clock = require('../../src/io/clock');
const Runtime = require('../../src/engine/runtime');

test('spec', () => {
    const rt = new Runtime();
    const c = new Clock(rt);

    assert.strictEqual(typeof Clock, 'function');
    assert.strictEqual(typeof c, 'object');
    assert.strictEqual(typeof c.projectTimer, 'function');
    assert.strictEqual(typeof c.pause, 'function');
    assert.strictEqual(typeof c.resume, 'function');
    assert.strictEqual(typeof c.resetProjectTimer, 'function');
});

test('cycle', t => {
    t.mock.timers.enable({apis: ['Date']});
    const rt = new Runtime();
    const c = new Clock(rt);

    assert.strictEqual(c.projectTimer(), 0);
    t.mock.timers.tick(100);
    rt._step();
    assert.strictEqual(c.projectTimer(), 0.1);

    c.resetProjectTimer();
    t.mock.timers.tick(100);
    // The timer shouldn't advance until all threads have been stepped
    assert.strictEqual(c.projectTimer(), 0);
    c.pause();
    assert.strictEqual(c.projectTimer(), 0);
    c.resume();
    assert.strictEqual(c.projectTimer(), 0);
});
