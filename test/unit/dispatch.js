const DispatchTestService = require('../fixtures/dispatch-test-service');
const Worker = require('tiny-worker');

const dispatch = require('../../src/dispatch/central-dispatch');
const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');


// By default Central Dispatch works with the Worker class built into the browser. Tell it to use TinyWorker instead.
dispatch.workerClass = Worker;

const runServiceTest = async function (serviceName) {
    const [fortyTwo, eighteen, twoFortySix] = await Promise.all([
        dispatch.call(serviceName, 'returnFortyTwo'),
        dispatch.call(serviceName, 'doubleArgument', 9),
        dispatch.call(serviceName, 'doubleArgument', 123),
        assert.rejects(dispatch.call(serviceName, 'throwException'), 'exception was not propagated as expected')
    ]);
    assert.strictEqual(fortyTwo, 42);
    assert.strictEqual(eighteen, 18);
    assert.strictEqual(twoFortySix, 246);
};

test('local', async () => {
    await dispatch.setService('LocalDispatchTest', new DispatchTestService());
    await runServiceTest('LocalDispatchTest');
});

test('remote', async () => {
    const fixturesDir = path.resolve(__dirname, '../fixtures');
    const shimPath = path.resolve(fixturesDir, 'dispatch-test-worker-shim.js');
    const worker = new Worker(shimPath, null, {cwd: fixturesDir});
    dispatch.addWorker(worker);

    try {
        await new Promise((resolve, reject) => {
            dispatch.setService('test', {onWorkerReady: resolve}).catch(reject);
        });
        await runServiceTest('RemoteDispatchTest');
    } finally {
        // Otherwise the worker keeps the process alive after a failure.
        await dispatch._remoteCall(worker, 'dispatch', 'terminate');
    }
});

test('local, sync', () => {
    dispatch.setServiceSync('SyncDispatchTest', new DispatchTestService());

    const a = dispatch.callSync('SyncDispatchTest', 'returnFortyTwo');
    assert.strictEqual(a, 42);

    const b = dispatch.callSync('SyncDispatchTest', 'doubleArgument', 9);
    assert.strictEqual(b, 18);

    const c = dispatch.callSync('SyncDispatchTest', 'doubleArgument', 123);
    assert.strictEqual(c, 246);

    assert.throws(() => dispatch.callSync('SyncDispatchTest', 'throwException'),
        new Error('This is a test exception thrown by DispatchTest'));
});
