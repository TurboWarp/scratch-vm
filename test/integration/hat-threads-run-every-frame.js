const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');
const Thread = require('../../src/engine/thread');
const Runtime = require('../../src/engine/runtime');
const execute = require('../../src/engine/execute.js');

const compilerAndInterpreter = (name, callback) => {
    test(`${name} - interpreted`, (t, done) => callback(done, {
        enabled: false
    }));
    test(`${name} - compiled`, (t, done) => callback(done, {
        enabled: true
    }));
};

const projectUri = path.resolve(__dirname, '../fixtures/timer-greater-than-hat.sb2');
const project = readFileToBuffer(projectUri);

const checkIsHatThread = (vm, hatThread) => {
    assert.strictEqual(hatThread.stackClick, false);
    assert.strictEqual(hatThread.updateMonitor, false);
    const blockContainer = hatThread.target.blocks;
    const opcode = blockContainer.getOpcode(blockContainer.getBlock(hatThread.topBlock));
    assert.ok(vm.runtime.getIsEdgeActivatedHat(opcode));
};

const checkIsStackClickThread = (vm, stackClickThread) => {
    assert.strictEqual(stackClickThread.stackClick, true);
    assert.strictEqual(stackClickThread.updateMonitor, false);
};

/**
 * timer-greater-than-hat.sb2 contains a single stack
 *     when timer > -1
 *         change color effect by 25
 * The intention is to make sure that the hat block condition is evaluated
 * on each frame.
 */
compilerAndInterpreter('edge activated hat thread runs once every frame', (done, co) => {
    const vm = new VirtualMachine();
    vm.setCompilerOptions(co);
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    assert.doesNotThrow(() => {
        // Note: don't run vm.start(), we handle calling _step() manually in this test
        vm.runtime.currentStepTime = Runtime.THREAD_STEP_INTERVAL;
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);

        vm.loadProject(project).then(() => {
            assert.strictEqual(vm.runtime.threads.length, 0);

            vm.runtime._step();
            let threads = vm.runtime._lastStepDoneThreads;
            assert.strictEqual(vm.runtime.threads.length, 0);
            assert.strictEqual(threads.length, 1);
            checkIsHatThread(vm, threads[0]);
            assert.ok(threads[0].status === Thread.STATUS_DONE);

            // Check that the hat thread is added again when another step is taken
            vm.runtime._step();
            threads = vm.runtime._lastStepDoneThreads;
            assert.strictEqual(vm.runtime.threads.length, 0);
            assert.strictEqual(threads.length, 1);
            checkIsHatThread(vm, threads[0]);
            assert.ok(threads[0].status === Thread.STATUS_DONE);
            done();
        });
    });
});

/**
 * When a hat is added it should run in the next frame. Any block related
 * caching should be reset.
 */
// eslint-disable-next-line max-len
compilerAndInterpreter('edge activated hat thread runs after being added to previously executed target', (done, co) => {
    const vm = new VirtualMachine();
    vm.setCompilerOptions(co);
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    assert.doesNotThrow(() => {
        // Note: don't run vm.start(), we handle calling _step() manually in this test
        vm.runtime.currentStepTime = Runtime.THREAD_STEP_INTERVAL;
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);

        vm.loadProject(project).then(() => {
            assert.strictEqual(vm.runtime.threads.length, 0);

            vm.runtime._step();
            let threads = vm.runtime._lastStepDoneThreads;
            assert.strictEqual(vm.runtime.threads.length, 0);
            assert.strictEqual(threads.length, 1);
            checkIsHatThread(vm, threads[0]);
            assert.ok(threads[0].status === Thread.STATUS_DONE);

            // Add a second hat that should create a second thread
            const hatBlock = threads[0].target.blocks.getBlock(threads[0].topBlock);
            threads[0].target.blocks.createBlock(Object.assign(
                {}, hatBlock, {id: 'hatblock2', next: null}
            ));

            // Check that the hat thread is added again when another step is taken
            vm.runtime._step();
            threads = vm.runtime._lastStepDoneThreads;
            assert.strictEqual(vm.runtime.threads.length, 0);
            assert.strictEqual(threads.length, 2);
            checkIsHatThread(vm, threads[0]);
            checkIsHatThread(vm, threads[1]);
            assert.ok(threads[0].status === Thread.STATUS_DONE);
            assert.ok(threads[1].status === Thread.STATUS_DONE);
            done();
        });
    });
});

/**
 * If the hat doesn't finish evaluating within one frame, it shouldn't be added again
 * on the next frame. (We skip execution by setting the step time to 0)
 */
compilerAndInterpreter('edge activated hat thread not added twice', (done, co) => {
    const vm = new VirtualMachine();
    vm.setCompilerOptions(co);
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    assert.doesNotThrow(() => {
        // Note: don't run vm.start(), we handle calling _step() manually in this test
        vm.runtime.currentStepTime = 0;
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);

        vm.loadProject(project).then(() => {
            assert.strictEqual(vm.runtime.threads.length, 0);

            vm.runtime._step();
            let doneThreads = vm.runtime._lastStepDoneThreads;
            assert.strictEqual(vm.runtime.threads.length, 1);
            assert.strictEqual(doneThreads.length, 0);
            const prevThread = vm.runtime.threads[0];
            checkIsHatThread(vm, vm.runtime.threads[0]);
            assert.ok(vm.runtime.threads[0].status === Thread.STATUS_RUNNING);

            // Check that no new threads are added when another step is taken
            vm.runtime._step();
            doneThreads = vm.runtime._lastStepDoneThreads;
            // There should now be one done hat thread and one new hat thread to run
            assert.strictEqual(vm.runtime.threads.length, 1);
            assert.strictEqual(doneThreads.length, 0);
            checkIsHatThread(vm, vm.runtime.threads[0]);
            assert.ok(vm.runtime.threads[0] === prevThread);
            done();
        });
    });
});


/**
 * Duplicating a sprite should also track duplicated edge activated hat in
 * runtime's _edgeActivatedHatValues map.
 */
compilerAndInterpreter('edge activated hat should trigger for both sprites when sprite is duplicated', (done, co) => {

    // Project that is similar to timer-greater-than-hat.sb2, but has code on the sprite so that
    // the sprite can be duplicated
    const projectWithSpriteUri = path.resolve(__dirname, '../fixtures/edge-triggered-hat.sb3');
    const projectWithSprite = readFileToBuffer(projectWithSpriteUri);

    const vm = new VirtualMachine();
    vm.setCompilerOptions(co);
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    assert.doesNotThrow(() => {
        // Note: don't run vm.start(), we handle calling _step() manually in this test
        vm.runtime.currentStepTime = 0;
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);

        vm.loadProject(projectWithSprite).then(() => {
            assert.strictEqual(vm.runtime.threads.length, 0);

            vm.runtime._step();
            assert.strictEqual(vm.runtime.threads.length, 1);
            checkIsHatThread(vm, vm.runtime.threads[0]);
            assert.ok(vm.runtime.threads[0].status === Thread.STATUS_RUNNING);
            let numTargetEdgeHats = vm.runtime.targets.reduce((val, target) =>
                val + Object.keys(target._edgeActivatedHatValues).length, 0);
            assert.strictEqual(numTargetEdgeHats, 1);

            vm.duplicateSprite(vm.runtime.targets[1].id).then(() => {
                vm.runtime._step();
                // Check that the runtime's _edgeActivatedHatValues object has two separate keys
                // after execute is run on each thread
                numTargetEdgeHats = vm.runtime.targets.reduce((val, target) =>
                    val + Object.keys(target._edgeActivatedHatValues).length, 0);
                assert.strictEqual(numTargetEdgeHats, 2);
                done();
            });

        });
    });
});

/**
 * Cloning a sprite should also track cloned edge activated hat separately
 * runtime's _edgeActivatedHatValues map.
 */
compilerAndInterpreter('edge activated hat should trigger for both sprites when sprite is cloned', (done, co) => {

    // Project that is similar to loudness-hat-block.sb2, but has code on the sprite so that
    // the sprite can be duplicated
    const projectWithSpriteUri = path.resolve(__dirname, '../fixtures/edge-triggered-hat.sb3');
    const projectWithSprite = readFileToBuffer(projectWithSpriteUri);

    const vm = new VirtualMachine();
    vm.setCompilerOptions(co);
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    assert.doesNotThrow(() => {
        // Note: don't run vm.start(), we handle calling _step() manually in this test
        vm.runtime.currentStepTime = 0;
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);

        vm.loadProject(projectWithSprite).then(() => {
            assert.strictEqual(vm.runtime.threads.length, 0);

            vm.runtime._step();
            assert.strictEqual(vm.runtime.threads.length, 1);
            checkIsHatThread(vm, vm.runtime.threads[0]);
            assert.ok(vm.runtime.threads[0].status === Thread.STATUS_RUNNING);
            // Run execute on the thread to populate the runtime's
            // _edgeActivatedHatValues object
            execute(vm.runtime.sequencer, vm.runtime.threads[0]);
            let numTargetEdgeHats = vm.runtime.targets.reduce((val, target) =>
                val + Object.keys(target._edgeActivatedHatValues).length, 0);
            assert.strictEqual(numTargetEdgeHats, 1);

            const cloneTarget = vm.runtime.targets[1].makeClone();
            vm.runtime.addTarget(cloneTarget);

            vm.runtime._step();
            // Check that the runtime's _edgeActivatedHatValues object has two separate keys
            // after execute is run on each thread
            vm.runtime.threads.forEach(thread => execute(vm.runtime.sequencer, thread));
            numTargetEdgeHats = vm.runtime.targets.reduce((val, target) =>
                val + Object.keys(target._edgeActivatedHatValues).length, 0);
            assert.strictEqual(numTargetEdgeHats, 2);
            done();
        });
    });
});

/**
 * When adding a stack click thread first, make sure that the edge activated hat thread and
 * the stack click thread are both pushed and run (despite having the same top block)
 */
compilerAndInterpreter('edge activated hat thread does not interrupt stack click thread', (done, co) => {
    const vm = new VirtualMachine();
    vm.setCompilerOptions(co);
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    assert.doesNotThrow(() => {
        // Note: don't run vm.start(), we handle calling _step() manually in this test
        vm.runtime.currentStepTime = Runtime.THREAD_STEP_INTERVAL;
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);

        vm.loadProject(project).then(() => {
            assert.strictEqual(vm.runtime.threads.length, 0);

            vm.runtime._step();
            let doneThreads = vm.runtime._lastStepDoneThreads;
            assert.strictEqual(vm.runtime.threads.length, 0);
            assert.strictEqual(doneThreads.length, 1);
            checkIsHatThread(vm, doneThreads[0]);
            assert.ok(doneThreads[0].status === Thread.STATUS_DONE);

            // Add stack click thread on this hat
            vm.runtime.toggleScript(doneThreads[0].topBlock, {stackClick: true});

            // Check that the hat thread is added again when another step is taken
            vm.runtime._step();
            doneThreads = vm.runtime._lastStepDoneThreads;
            assert.strictEqual(vm.runtime.threads.length, 0);
            assert.strictEqual(doneThreads.length, 2);
            let hatThread;
            let stackClickThread;
            if (doneThreads[0].stackClick) {
                stackClickThread = doneThreads[0];
                hatThread = doneThreads[1];
            } else {
                stackClickThread = doneThreads[1];
                hatThread = doneThreads[0];
            }
            checkIsHatThread(vm, hatThread);
            checkIsStackClickThread(vm, stackClickThread);
            assert.ok(doneThreads[0].status === Thread.STATUS_DONE);
            assert.ok(doneThreads[1].status === Thread.STATUS_DONE);
            done();
        });
    });
});

/**
 * When adding the hat thread first, make sure that the edge activated hat thread and
 * the stack click thread are both pushed and run (despite having the same top block)
 */
compilerAndInterpreter('edge activated hat thread does not interrupt stack click thread', (done, co) => {
    const vm = new VirtualMachine();
    vm.setCompilerOptions(co);
    vm.attachStorage(makeTestStorage());

    // Start VM, load project, and run
    assert.doesNotThrow(() => {
        // Note: don't run vm.start(), we handle calling _step() manually in this test
        vm.runtime.currentStepTime = 0;
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);

        vm.loadProject(project).then(() => {
            assert.strictEqual(vm.runtime.threads.length, 0);

            vm.runtime._step();
            let doneThreads = vm.runtime._lastStepDoneThreads;
            assert.strictEqual(vm.runtime.threads.length, 1);
            assert.strictEqual(doneThreads.length, 0);
            checkIsHatThread(vm, vm.runtime.threads[0]);
            assert.ok(vm.runtime.threads[0].status === Thread.STATUS_RUNNING);

            vm.runtime.currentStepTime = Runtime.THREAD_STEP_INTERVAL;

            // Add stack click thread on this hat
            vm.runtime.toggleScript(vm.runtime.threads[0].topBlock, {stackClick: true});

            // Check that the hat thread is added again when another step is taken
            vm.runtime._step();
            doneThreads = vm.runtime._lastStepDoneThreads;
            assert.strictEqual(vm.runtime.threads.length, 0);
            assert.strictEqual(doneThreads.length, 2);
            let hatThread;
            let stackClickThread;
            if (doneThreads[0].stackClick) {
                stackClickThread = doneThreads[0];
                hatThread = doneThreads[1];
            } else {
                stackClickThread = doneThreads[1];
                hatThread = doneThreads[0];
            }
            checkIsHatThread(vm, hatThread);
            checkIsStackClickThread(vm, stackClickThread);
            assert.ok(doneThreads[0].status === Thread.STATUS_DONE);
            assert.ok(doneThreads[1].status === Thread.STATUS_DONE);
            done();
        });
    });
});
