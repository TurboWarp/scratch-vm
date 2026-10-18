const Runtime = require('../../src/engine/runtime');
const {test} = require('node:test');
const assert = require('node:assert');

test('step events', () => {
    const events = [];
    const rt = new Runtime();
    rt.sequencer.stepThreads = () => {
        events.push('sequencer.stepThreads()');
        return [];
    };
    rt.on('BEFORE_EXECUTE', () => {
        events.push('BEFORE_EXECUTE');
    });
    rt.on('AFTER_EXECUTE', () => {
        events.push('AFTER_EXECUTE');
    });
    rt._step();
    assert.deepEqual(events, [
        'BEFORE_EXECUTE',
        'sequencer.stepThreads()',
        'AFTER_EXECUTE'
    ]);
});
