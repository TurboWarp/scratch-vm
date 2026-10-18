const {test} = require('node:test');
const assert = require('node:assert');
const MockTimer = require('../fixtures/mock-timer');

test('spec', () => {
    const timer = new MockTimer();

    assert.strictEqual(typeof MockTimer, 'function');
    assert.strictEqual(typeof timer, 'object');

    // Most members of MockTimer mimic members of Timer.
    assert.strictEqual(typeof timer.startTime, 'number');
    assert.strictEqual(typeof timer.time, 'function');
    assert.strictEqual(typeof timer.start, 'function');
    assert.strictEqual(typeof timer.timeElapsed, 'function');
    assert.strictEqual(typeof timer.setTimeout, 'function');
    assert.strictEqual(typeof timer.clearTimeout, 'function');

    // A few members of MockTimer have no Timer equivalent and should only be used in tests.
    assert.strictEqual(typeof timer.advanceMockTime, 'function');
    assert.strictEqual(typeof timer.advanceMockTimeAsync, 'function');
    assert.strictEqual(typeof timer.hasTimeouts, 'function');
});

test('time', () => {
    const timer = new MockTimer();
    const delta = 1;

    const time1 = timer.time();
    const time2 = timer.time();
    timer.advanceMockTime(delta);
    const time3 = timer.time();

    assert.strictEqual(time1, time2);
    assert.strictEqual(time2 + delta, time3);
});

test('start / timeElapsed', () => new Promise(resolve => {
    const timer = new MockTimer();
    const halfDelay = 1;
    const fullDelay = halfDelay + halfDelay;

    timer.start();

    let timeoutCalled = 0;

    // Wait and measure timer
    timer.setTimeout(() => {
        assert.strictEqual(timeoutCalled, 0);
        ++timeoutCalled;

        const timeElapsed = timer.timeElapsed();
        assert.strictEqual(timeElapsed, fullDelay);

        resolve();
    }, fullDelay);

    // this should not trigger the callback
    timer.advanceMockTime(halfDelay);

    // give the mock timer a chance to run tasks
    global.setTimeout(() => {
        // we've only mock-waited for half the delay so it should not have run yet
        assert.strictEqual(timeoutCalled, 0);

        // this should trigger the callback
        timer.advanceMockTime(halfDelay);
    }, 0);
}));

test('clearTimeout / hasTimeouts', () => new Promise((resolve, reject) => {
    const timer = new MockTimer();

    const timeoutId = timer.setTimeout(() => {
        reject(new Error('Canceled task ran'));
    }, 1);

    timer.setTimeout(() => {
        resolve('Non-canceled task ran');
    }, 2);

    timer.clearTimeout(timeoutId);

    while (timer.hasTimeouts()) {
        timer.advanceMockTime(1);
    }
}));
