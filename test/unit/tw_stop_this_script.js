const {test} = require('tap');
const Thread = require('../../src/engine/thread');
const Runtime = require('../../src/engine/runtime');
const Target = require('../../src/engine/target');

test('stopThisScript procedures_call reporter form', t => {
    const rt = new Runtime();
    const target = new Target(rt, null);

    target.blocks.createBlock({
        id: 'reporterCall',
        opcode: 'procedures_call',
        inputs: {},
        fields: {},
        mutation: {
            return: '1'
        },
        shadow: false,
        topLevel: true,
        parent: null,
        next: 'afterReporterCall'
    });
    target.blocks.createBlock({
        id: 'afterReporterCall',
        opcode: 'motion_ifonedgebounce',
        inputs: {},
        fields: {},
        mutation: null,
        shadow: false,
        topLevel: false,
        parent: null,
        next: null
    });

    const thread = new Thread('reporterCall');
    thread.target = target;

    // pretend to run reporterCall
    thread.pushStack('reporterCall');
    thread.peekStackFrame().waitingReporter = true;

    // pretend to run scripts inside of the procedure
    thread.pushStack('fakeBlock');

    // stopping or returning should always return to reporterCall, not the block after
    thread.stopThisScript();
    t.same(thread.stack, [
        'reporterCall'
    ]);

    t.end();
});
