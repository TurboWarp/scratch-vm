const {test} = require('node:test');
const assert = require('node:assert');
const Timer = require('../../src/util/timer');

// Stubbed current time
let NOW = 0;

const testNow = {
    now: () => {
        NOW += 100;
        return NOW;
    }
};

test('spec', () => {
    const timer = new Timer(testNow);

    assert.strictEqual(typeof Timer, 'function');
    assert.strictEqual(typeof timer, 'object');

    assert.strictEqual(typeof timer.startTime, 'number');
    assert.strictEqual(typeof timer.time, 'function');
    assert.strictEqual(typeof timer.start, 'function');
    assert.strictEqual(typeof timer.timeElapsed, 'function');
    assert.strictEqual(typeof timer.setTimeout, 'function');
    assert.strictEqual(typeof timer.clearTimeout, 'function');
});

test('time', () => {
    const timer = new Timer(testNow);
    const time = timer.time();

    assert.ok(testNow.now() >= time);
});

test('start / timeElapsed', () => {
    const timer = new Timer(testNow);
    const delay = 100;
    const threshold = 1000 / 60; // 60 hz

    // Start timer
    timer.start();

    // Measure timer
    const timeElapsed = timer.timeElapsed();
    assert.ok(timeElapsed >= 0);
    assert.ok(timeElapsed >= (delay - threshold) &&
         timeElapsed <= (delay + threshold));
});

test('setTimeout / clearTimeout', () => new Promise((resolve, reject) => {
    const timer = new Timer(testNow);
    const cancelId = timer.setTimeout(() => {
        reject(new Error('Canceled task ran'));
    }, 1);
    timer.setTimeout(() => {
        resolve('Non-canceled task ran');
    }, 2);
    timer.clearTimeout(cancelId);
}));
