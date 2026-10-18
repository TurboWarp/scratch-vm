const {test} = require('node:test');
const assert = require('node:assert');
const MouseWheel = require('../../src/io/mouseWheel');
const Runtime = require('../../src/engine/runtime');

test('spec', () => {
    const rt = new Runtime();
    const mw = new MouseWheel(rt);

    assert.strictEqual(typeof mw, 'object');
    assert.strictEqual(typeof mw.postData, 'function');
});

test('blocks activated by scrolling', () => {
    let _startHatsArgs;
    const rt = {
        startHats: (...args) => {
            _startHatsArgs = args;
        }
    };
    const mw = new MouseWheel(rt);

    _startHatsArgs = null;
    mw.postData({
        deltaY: -1
    });
    assert.strictEqual(_startHatsArgs[0], 'event_whenkeypressed');
    assert.strictEqual(_startHatsArgs[1].KEY_OPTION, 'up arrow');

    _startHatsArgs = null;
    mw.postData({
        deltaY: +1
    });
    assert.strictEqual(_startHatsArgs[0], 'event_whenkeypressed');
    assert.strictEqual(_startHatsArgs[1].KEY_OPTION, 'down arrow');

    _startHatsArgs = null;
    mw.postData({
        deltaY: 0
    });
    assert.strictEqual(_startHatsArgs, null);
});
