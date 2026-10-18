const {test} = require('node:test');
const assert = require('node:assert');
const Control = require('../../src/blocks/scratch3_control');
const Runtime = require('../../src/engine/runtime');
const BlockUtility = require('../../src/engine/block-utility');

test('getPrimitives', () => {
    const rt = new Runtime();
    const c = new Control(rt);
    assert.strictEqual(typeof c.getPrimitives(), 'object');
});

test('repeat', () => {
    const rt = new Runtime();
    const c = new Control(rt);

    // Test harness (mocks `util`)
    let i = 0;
    const repeat = 10;
    const util = {
        stackFrame: Object.create(null),
        startBranch: function () {
            i++;
            c.repeat({TIMES: repeat}, util);
        }
    };

    // Execute test
    c.repeat({TIMES: 10}, util);
    assert.strictEqual(util.stackFrame.loopCounter, -1);
    assert.strictEqual(i, repeat);
});

test('repeat rounds with round()', () => {
    const rt = new Runtime();
    const c = new Control(rt);

    const roundingTest = (inputForRepeat, expectedTimes) => {
        // Test harness (mocks `util`)
        let i = 0;
        const util = {
            stackFrame: Object.create(null),
            startBranch: function () {
                i++;
                c.repeat({TIMES: inputForRepeat}, util);
            }
        };

        // Execute test
        c.repeat({TIMES: inputForRepeat}, util);
        assert.strictEqual(i, expectedTimes);
    };

    // Execute tests
    roundingTest(3.2, 3);
    roundingTest(3.7, 4);
    roundingTest(3.5, 4);
});

test('repeatUntil', () => {
    const rt = new Runtime();
    const c = new Control(rt);

    // Test harness (mocks `util`)
    let i = 0;
    const repeat = 10;
    const util = {
        stackFrame: Object.create(null),
        startBranch: function () {
            i++;
            c.repeatUntil({CONDITION: (i === repeat)}, util);
        }
    };

    // Execute test
    c.repeatUntil({CONDITION: (i === repeat)}, util);
    assert.strictEqual(i, repeat);
});

test('repeatWhile', () => {
    const rt = new Runtime();
    const c = new Control(rt);

    // Test harness (mocks `util`)
    let i = 0;
    const repeat = 10;
    const util = {
        stackFrame: Object.create(null),
        startBranch: function () {
            i++;
            // Note !== instead of ===
            c.repeatWhile({CONDITION: (i !== repeat)}, util);
        }
    };

    // Execute test
    c.repeatWhile({CONDITION: (i !== repeat)}, util);
    assert.strictEqual(i, repeat);
});

test('forEach', () => {
    const rt = new Runtime();
    const c = new Control(rt);

    const variableValues = [];
    const variable = {value: 0};
    let value;
    const util = {
        stackFrame: Object.create(null),
        target: {
            lookupOrCreateVariable: function () {
                return variable;
            }
        },
        startBranch: function () {
            variableValues.push(variable.value);
            c.forEach({VARIABLE: {}, VALUE: value}, util);
        }
    };

    // for each (variable) in "5"
    // ..should yield variable values 1, 2, 3, 4, 5
    util.stackFrame = Object.create(null);
    variableValues.splice(0);
    variable.value = 0;
    value = '5';
    c.forEach({VARIABLE: {}, VALUE: value}, util);
    assert.deepEqual(variableValues, [1, 2, 3, 4, 5]);

    // for each (variable) in 4
    // ..should yield variable values 1, 2, 3, 4
    util.stackFrame = Object.create(null);
    variableValues.splice(0);
    variable.value = 0;
    value = 4;
    c.forEach({VARIABLE: {}, VALUE: value}, util);
    assert.deepEqual(variableValues, [1, 2, 3, 4]);
});

test('forever', () => {
    const rt = new Runtime();
    const c = new Control(rt);

    // Test harness (mocks `util`)
    let i = 0;
    const util = {
        startBranch: function (branchNum, isLoop) {
            i++;
            assert.strictEqual(branchNum, 1);
            assert.strictEqual(isLoop, true);
        }
    };

    // Execute test
    c.forever(null, util);
    assert.strictEqual(i, 1);
});

test('if / ifElse', () => {
    const rt = new Runtime();
    const c = new Control(rt);

    // Test harness (mocks `util`)
    let i = 0;
    const util = {
        startBranch: function (branchNum) {
            i += branchNum;
        }
    };

    // Execute test
    c.if({CONDITION: true}, util);
    assert.strictEqual(i, 1);
    c.if({CONDITION: false}, util);
    assert.strictEqual(i, 1);
    c.ifElse({CONDITION: true}, util);
    assert.strictEqual(i, 2);
    c.ifElse({CONDITION: false}, util);
    assert.strictEqual(i, 4);
});

test('stop', () => {
    const rt = new Runtime();
    const c = new Control(rt);

    // Test harness (mocks `util`)
    const state = {
        stopAll: 0,
        stopOtherTargetThreads: 0,
        stopThisScript: 0
    };
    const util = {
        stopAll: function () {
            state.stopAll++;
        },
        stopOtherTargetThreads: function () {
            state.stopOtherTargetThreads++;
        },
        stopThisScript: function () {
            state.stopThisScript++;
        }
    };

    // Execute test
    c.stop({STOP_OPTION: 'all'}, util);
    c.stop({STOP_OPTION: 'other scripts in sprite'}, util);
    c.stop({STOP_OPTION: 'other scripts in stage'}, util);
    c.stop({STOP_OPTION: 'this script'}, util);
    assert.strictEqual(state.stopAll, 1);
    assert.strictEqual(state.stopOtherTargetThreads, 2);
    assert.strictEqual(state.stopThisScript, 1);
});

test('counter, incrCounter, clearCounter', () => {
    const rt = new Runtime();
    const c = new Control(rt);

    // Default value
    assert.strictEqual(c.getCounter(), 0);

    c.incrCounter();
    c.incrCounter();
    assert.strictEqual(c.getCounter(), 2);

    c.clearCounter();
    assert.strictEqual(c.getCounter(), 0);
});

test('allAtOnce', () => {
    const rt = new Runtime();
    const c = new Control(rt);

    // Test harness (mocks `util`)
    let ran = false;
    const util = {
        startBranch: function () {
            ran = true;
        }
    };

    // Execute test
    c.allAtOnce({}, util);
    assert.ok(ran);
});

test('wait', () => {
    const rt = new Runtime();
    const c = new Control(rt);
    const args = {DURATION: .01};
    const waitTime = args.DURATION * 1000;
    const startTest = Date.now();
    const thresholdSmall = 1000 / 60; // only allow the wait to end one 60Hz frame early
    const thresholdLarge = 1000 / 3; // be less picky about when the wait ends, in case CPU load makes the VM run slowly
    let yields = 0;
    const util = new BlockUtility();
    const mockUtil = {
        stackFrame: {},
        yield: () => yields++,
        stackTimerNeedsInit: util.stackTimerNeedsInit,
        startStackTimer: util.startStackTimer,
        stackTimerFinished: util.stackTimerFinished
    };

    c.wait(args, mockUtil);
    assert.strictEqual(yields, 1, 'First wait block yielded');

    // Spin the cpu until enough time passes
    let timeElapsed = 0;
    while (timeElapsed < waitTime) {
        timeElapsed = mockUtil.stackFrame.timer.timeElapsed();
        // In case util.timer is broken - have our own "exit"
        if (Date.now() - startTest > timeElapsed + thresholdSmall) {
            break;
        }
    }

    c.wait(args, mockUtil);
    assert.strictEqual(yields, 1, 'Second call after timeElapsed does not yield');
    assert.strictEqual(waitTime, mockUtil.stackFrame.duration);
    assert.ok(timeElapsed >= (waitTime - thresholdSmall),
        `Wait block ended too early: ${timeElapsed} < ${waitTime} - ${thresholdSmall}`);
    assert.ok(timeElapsed <= (waitTime + thresholdLarge),
        `Wait block ended too late: ${timeElapsed} > ${waitTime} + ${thresholdLarge}`);
});
