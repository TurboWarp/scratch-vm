const {test} = require('node:test');
const assert = require('node:assert');
const RateLimiter = require('../../src/util/rateLimiter.js');

test('rate limiter', () => {
    // Create a rate limiter with maximum of 20 sends per second
    const rate = 20;
    const limiter = new RateLimiter(rate);

    // Simulate time passing with a stubbed timer
    let simulatedTime = Date.now();
    limiter._timer = {timeElapsed: () => simulatedTime};

    // The rate limiter starts with a number of tokens equal to the max rate
    assert.strictEqual(limiter._count, rate);

    // Running okayToSend a number of times equal to the max rate
    // uses up all of the tokens
    for (let i = 0; i < rate; i++) {
        assert.ok(limiter.okayToSend());
        // Tokens are counting down
        assert.strictEqual(limiter._count, rate - (i + 1));
    }
    assert.ok(!limiter.okayToSend());

    // Advance the timer enough so we get exactly one more token
    // One extra millisecond is required to get over the threshold
    simulatedTime += (1000 / rate) + 1;
    assert.ok(limiter.okayToSend());
    assert.ok(!limiter.okayToSend());
});
