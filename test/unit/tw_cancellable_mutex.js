const {test} = require('tap');
const CancellableMutex = require('../../src/util/tw-cancellable-mutex');

test('basic queing', t => {
    const mutex = new CancellableMutex();
    const events = [];

    // Tests long resolved promise.
    mutex.do(() => new Promise(resolve => {
        setTimeout(() => resolve(5), 100);
    })).then(value => {
        // Make sure resolved value passes through transparently
        t.equal(value, 5);
        events.push(1);
    });

    // Tests long rejected promise.
    mutex.do(() => new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Test error 1')), 100);
    })).catch(error => {
        t.equal(error.message, 'Test error 1');
        events.push(2);
    });
    
    // Tests instantly-resolving resolved promise.
    mutex.do(() => new Promise(resolve => {
        resolve(10);
    })).then(value => {
        t.equal(value, 10);
        events.push(3);
    });

    // Tests instantly-resolving rejected promise.
    mutex.do(() => new Promise((resolve, reject) => {
        reject(new Error('Test error 2'));
    })).catch(error => {
        t.equal(error.message, 'Test error 2');
        events.push(4);
    });

    // Tests instantly-returning sync function.
    mutex.do(() => 15).then(value => {
        t.equal(value, 15);
        events.push(5);
    });

    // Tests instantly-throwing sync function.
    mutex.do(() => {
        throw new Error('Test error 3');
    }).catch(error => {
        t.equal(error.message, 'Test error 3');
        events.push(6);
    });
    
    mutex.do(() => new Promise(resolve => {
        setTimeout(() => {
            resolve();

            // At this point the queue of operations is now empty. Make sure it can
            // resume operations from this state.
            setTimeout(() => {
                mutex.do(() => new Promise(resolve2 => {
                    resolve2();
                })).then(() => {
                    events.push(8);
                    t.same(events, [1, 2, 3, 4, 5, 6, 7, 8]);
                    t.end();
                });
            });
        }, 50);
    })).then(() => {
        events.push(7);
    });
});

test('cancellation', t => {
    const mutex = new CancellableMutex();

    // Start operation that should never end and then grab its cancel checker.
    let isCancelled = null;
    mutex.do(_isCancelled => new Promise(() => {
        isCancelled = _isCancelled;
    }));
    t.equal(isCancelled(), false);

    // This operation should never run.
    mutex.do(() => new Promise(() => {
        t.fail();
    }));

    // After cancelling, existing operation should be able to see that, and queue should be cleared.
    mutex.cancel();
    t.equal(isCancelled(), true);

    mutex.do(() => new Promise(() => {
        t.end();
    }));
});
