const {test} = require('node:test');
const assert = require('node:assert');

const TaskQueue = require('../../src/util/task-queue');

const MockTimer = require('../fixtures/mock-timer');
const testCompare = require('../fixtures/test-compare');

// Max tokens = 1000
// Refill 1000 tokens per second (1 per millisecond)
// Token bucket starts empty
// Max total cost of queued tasks = 10000 tokens = 10 seconds
const makeTestQueue = () => {
    const bukkit = new TaskQueue(1000, 1000, {
        startingTokens: 0,
        maxTotalCost: 10000
    });

    const mockTimer = new MockTimer();
    bukkit._timer = mockTimer;
    mockTimer.start();

    return bukkit;
};

test('spec', () => {
    assert.strictEqual(typeof TaskQueue, 'function');
    const bukkit = makeTestQueue();

    assert.strictEqual(typeof bukkit, 'object');

    assert.strictEqual(typeof bukkit.length, 'number');
    assert.strictEqual(typeof bukkit.do, 'function');
    assert.strictEqual(typeof bukkit.cancel, 'function');
    assert.strictEqual(typeof bukkit.cancelAll, 'function');
});

test('constructor', () => {
    assert.ok(new TaskQueue(1, 1));
    assert.ok(new TaskQueue(1, 1, {}));
    assert.ok(new TaskQueue(1, 1, {startingTokens: 0}));
    assert.ok(new TaskQueue(1, 1, {maxTotalCost: 999}));
    assert.ok(new TaskQueue(1, 1, {startingTokens: 0, maxTotalCost: 999}));
});

test('run tasks', async () => {
    const bukkit = makeTestQueue();

    const taskResults = [];

    const promises = [
        bukkit.do(() => {
            taskResults.push('a');
            testCompare(bukkit._timer.timeElapsed(), '>=', 50, 'Costly task must wait');
        }, 50),
        bukkit.do(() => {
            taskResults.push('b');
            testCompare(bukkit._timer.timeElapsed(), '>=', 60, 'Tasks must run in serial');
        }, 10),
        bukkit.do(() => {
            taskResults.push('c');
            testCompare(bukkit._timer.timeElapsed(), '<=', 70, 'Cheap task should run soon');
        }, 1)
    ];

    // advance 10 simulated milliseconds per JS tick
    while (bukkit.length > 0) {
        await bukkit._timer.advanceMockTimeAsync(10);
    }

    await Promise.all(promises);
    assert.deepEqual(taskResults, ['a', 'b', 'c'], 'All tasks must run in correct order');
});

test('cancel', async () => {
    const bukkit = makeTestQueue();

    const taskResults = [];
    const goodCancelMessage = 'Task was canceled correctly';
    const afterCancelMessage = 'Task was run correctly';
    const cancelTaskPromise = bukkit.do(
        () => {
            taskResults.push('nope');
        }, 999);
    const cancelCheckPromise = cancelTaskPromise.then(
        () => {
            assert.fail('Task should have been canceled');
        },
        () => {
            taskResults.push(goodCancelMessage);
        }
    );
    const keepTaskPromise = bukkit.do(
        () => {
            taskResults.push(afterCancelMessage);
            testCompare(bukkit._timer.timeElapsed(), '<', 10, 'Canceled task must not delay other tasks');
        }, 5);

    // give the bucket a chance to make a mistake
    await bukkit._timer.advanceMockTimeAsync(1);

    assert.strictEqual(bukkit.length, 2);
    const taskWasCanceled = bukkit.cancel(cancelTaskPromise);
    assert.ok(taskWasCanceled);
    assert.strictEqual(bukkit.length, 1);

    while (bukkit.length > 0) {
        await bukkit._timer.advanceMockTimeAsync(1);
    }

    await Promise.all([cancelCheckPromise, keepTaskPromise]);
    assert.deepEqual(taskResults, [goodCancelMessage, afterCancelMessage]);
});

test('cancelAll', async () => {
    const bukkit = makeTestQueue();

    const taskResults = [];
    const goodCancelMessage1 = 'Task1 was canceled correctly';
    const goodCancelMessage2 = 'Task2 was canceled correctly';

    const promises = [
        bukkit.do(() => taskResults.push('nope'), 999).then(
            () => {
                assert.fail('Task1 should have been canceled');
            },
            () => {
                taskResults.push(goodCancelMessage1);
            }
        ),
        bukkit.do(() => taskResults.push('nah'), 999).then(
            () => {
                assert.fail('Task2 should have been canceled');
            },
            () => {
                taskResults.push(goodCancelMessage2);
            }
        )
    ];

    // advance time, but not enough that any task should run
    await bukkit._timer.advanceMockTimeAsync(100);

    bukkit.cancelAll();

    // advance enough that both tasks would run if they hadn't been canceled
    await bukkit._timer.advanceMockTimeAsync(10000);

    await Promise.all(promises);
    assert.deepEqual(taskResults, [goodCancelMessage1, goodCancelMessage2], 'Tasks should cancel in order');
});

test('max total cost', async () => {
    const bukkit = makeTestQueue();

    let numTasks = 0;

    const task = () => ++numTasks;

    // Fill the queue
    for (let i = 0; i < 10; ++i) {
        bukkit.do(task, 1000);
    }

    // This one should be rejected because the queue is full
    const rejection = assert.rejects(bukkit.do(task, 1000));

    while (bukkit.length > 0) {
        await bukkit._timer.advanceMockTimeAsync(1000);
    }

    await rejection;

    // this should be 10 if the last task is rejected or 11 if it runs
    assert.strictEqual(numTasks, 10);
});
