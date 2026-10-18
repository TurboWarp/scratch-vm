const {test} = require('node:test');
const assert = require('node:assert');
const Runtime = require('../../src/engine/runtime');
const MonitorRecord = require('../../src/engine/monitor-record');
const makeTestStorage = require('../fixtures/make-test-storage');
const Target = require('../../src/engine/target');

test('setFramerate emits an event', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.addListener('FRAMERATE_CHANGED', framerate => {
        if (framerate === 13) {
            t.assert.ok(true);
        }
    });
    rt.setFramerate(13);
});

test('setFramerate and setCompatibilityMode do not emit a stop event if not running', () => {
    const rt = new Runtime();
    rt.addListener('RUNTIME_STOPPED', () => {
        assert.fail();
    });
    rt.setFramerate(13);
    rt.setCompatibilityMode(true);
});

test('setInterpolation emits an event', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.addListener('INTERPOLATION_CHANGED', enabled => {
        if (enabled) {
            t.assert.ok(true);
        }
    });
    rt.setInterpolation(true);
});

test('setInterpolation does not restart runtime if not running', () => {
    const rt = new Runtime();
    let started = false;
    let stopped = false;
    rt.addListener('RUNTIME_STARTED', () => {
        started = true;
    });
    rt.addListener('RUNTIME_STOPPED', () => {
        stopped = true;
    });
    rt.setInterpolation(true);
    assert.strictEqual(started, false);
    assert.strictEqual(stopped, false);
});

test('Stopping the runtime emits an event', () => {
    const rt = new Runtime();
    rt.start();
    let stopped = false;
    rt.addListener('RUNTIME_STOPPED', () => {
        stopped = true;
    });
    rt.stop();
    assert.strictEqual(stopped, true);
});

test('Stop does not emit an event if already stopped', () => {
    const rt = new Runtime();
    let stopped = false;
    rt.addListener('RUNTIME_STOPPED', () => {
        stopped = true;
    });
    rt.stop();
    assert.strictEqual(stopped, false);
});

test('setRuntimeOptions emits an event', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.addListener('RUNTIME_OPTIONS_CHANGED', options => {
        if (options.option === 17) {
            t.assert.ok(true);
        }
    });
    rt.setRuntimeOptions({option: 17});
});

test('setRuntimeOptions supports partial updates', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.setRuntimeOptions({option: 17});
    rt.addListener('RUNTIME_OPTIONS_CHANGED', options => {
        if (options.option === 17) {
            t.assert.ok(true);
        }
    });
    rt.setRuntimeOptions({otherOption: 1});
});

test('setCompilerOptions emits an event', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.addListener('COMPILER_OPTIONS_CHANGED', options => {
        if (options.option === 17) {
            t.assert.ok(true);
        }
    });
    rt.setCompilerOptions({option: 17});
});

test('setCompilerOptions supports partial updates', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.setCompilerOptions({option: 17});
    rt.addListener('COMPILER_OPTIONS_CHANGED', options => {
        if (options.option === 17) {
            t.assert.ok(true);
        }
    });
    rt.setCompilerOptions({otherOption: 1});
});

test('maxClones runtime option', () => {
    const rt = new Runtime();
    rt.setRuntimeOptions({maxClones: 10});
    for (let i = 0; i < 10; i++) {
        assert.strictEqual(rt.clonesAvailable(), true);
        rt.changeCloneCounter(1);
    }
    rt.changeCloneCounter(1);
    assert.strictEqual(rt.clonesAvailable(), false);
});

test('stageWidth and stageHeight', () => {
    const rt = new Runtime();
    assert.strictEqual(rt.stageWidth, 480);
    assert.strictEqual(rt.stageHeight, 360);
});

test('debug', () => {
    const rt = new Runtime();
    assert.strictEqual(rt.debug, false);
    rt.enableDebug();
    assert.strictEqual(rt.debug, true);
});

test('setStageSize preserves monitor position relative to center of stage', () => {
    const rt = new Runtime();
    rt.requestAddMonitor(new MonitorRecord({
        id: 'abc',
        // top right corner
        x: 0,
        y: 0
    }));
    rt.setStageSize(640, 362);
    const finalState = rt.getMonitorState().get('abc');
    assert.strictEqual(finalState.get('x'), 80);
    assert.strictEqual(finalState.get('y'), 1);
});

test('setStageSize argument range', t => {
    t.plan(6);
    const rt = new Runtime();

    rt.once('STAGE_SIZE_CHANGED', (width, height) => {
        t.assert.strictEqual(width, 101);
        t.assert.strictEqual(height, 103);
    });
    rt.setStageSize(101, 103);

    rt.once('STAGE_SIZE_CHANGED', (width, height) => {
        t.assert.strictEqual(width, 1);
        t.assert.strictEqual(height, 1);
    });
    rt.setStageSize(-3.1, 0);

    rt.once('STAGE_SIZE_CHANGED', (width, height) => {
        t.assert.strictEqual(width, 99);
        t.assert.strictEqual(height, 10000);
    });
    rt.setStageSize(99.3, 10000);
});

test('STAGE_SIZE_CHANGED does not fire if no change', () => {
    const rt = new Runtime();
    rt.on('STAGE_SIZE_CHANGED', () => {
        assert.fail('STAGE_SIZE_CHANGED emitted');
    });
    rt.setStageSize(rt.stageWidth, rt.stageHeight);
});

test('getNumberOfCloudVariables', () => {
    const rt = new Runtime();

    assert.strictEqual(rt.getNumberOfCloudVariables(), 0);
    rt.addCloudVariable();
    assert.strictEqual(rt.getNumberOfCloudVariables(), 1);
    rt.addCloudVariable();
    assert.strictEqual(rt.getNumberOfCloudVariables(), 2);
    rt.removeCloudVariable();
    assert.strictEqual(rt.getNumberOfCloudVariables(), 1);
    rt.removeCloudVariable();
    assert.strictEqual(rt.getNumberOfCloudVariables(), 0);

    rt.dispose();
    assert.strictEqual(rt.getNumberOfCloudVariables(), 0);
    rt.addCloudVariable();
    assert.strictEqual(rt.getNumberOfCloudVariables(), 1);
});

test('currentStepTime default value', () => {
    const rt = new Runtime();
    assert.strictEqual(typeof rt.currentStepTime, 'number');
    assert.ok(rt.currentStepTime > 0);
});

test('convertToPackagedRuntime', () => {
    const rt = new Runtime();
    assert.strictEqual(rt.isPackaged, false);
    rt.convertToPackagedRuntime();
    assert.strictEqual(rt.isPackaged, true);
});

test('convertToPackagedRuntime and attachStorage call order', () => {
    const rt1 = new Runtime();
    rt1.attachStorage(makeTestStorage());
    assert.throws(() => {
        rt1.convertToPackagedRuntime();
    }, {
        message: 'convertToPackagedRuntime must be called before attachStorage'
    });
    const rt2 = new Runtime();
    rt2.convertToPackagedRuntime();
    rt2.attachStorage(makeTestStorage());
});

test('visual report -0', t => {
    t.plan(1);

    const rt = new Runtime();
    const target = new Target();
    rt.setEditingTarget(target);

    rt.on(Runtime.VISUAL_REPORT, report => {
        t.assert.deepEqual(report, {
            id: 'blockid',
            value: '-0'
        });
    });
    rt.visualReport(target, 'blockid', -0);
});

const makeMonitorBlock = () => ({
    id: 'fakeMonitor',
    opcode: 'data_variable',
    fields: {
        VARIABLE: {
            name: 'VARIABLE',
            value: 'x',
            id: 'fakeMonitor'
        }
    },
    inputs: {},
    topLevel: true,
    next: null,
    parent: null,
    shadow: false,
    x: 0,
    y: 0,
    isMonitored: true,
    targetId: null
});

test('_pushMonitors does nothing when no targets are installed', () => {
    const rt = new Runtime();
    rt.monitorBlocks.createBlock(makeMonitorBlock());

    assert.strictEqual(rt.targets.length, 0);
    rt._pushMonitors();
    assert.strictEqual(rt.threads.length, 0);
});

test('_pushMonitors queues threads once targets are installed', () => {
    const rt = new Runtime();
    rt.monitorBlocks.createBlock(makeMonitorBlock());

    const stage = new Target(rt);
    rt.targets.push(stage);
    rt.setEditingTarget(stage);

    rt._pushMonitors();
    assert.strictEqual(rt.threads.length, 1);
    assert.strictEqual(rt.threads[0].target, stage);
    assert.strictEqual(rt.threads[0].updateMonitor, true);
});

const makeCommandBlock = id => ({
    id,
    opcode: 'motion_movesteps',
    fields: {},
    inputs: {},
    topLevel: true,
    next: null,
    parent: null,
    shadow: false,
    x: 0,
    y: 0
});

test('toggleScript is scoped to its target when block IDs collide', () => {
    const rt = new Runtime();
    // Avoid compiling the fake single-block scripts.
    rt.setCompilerOptions({enabled: false});

    // Two sprites whose scripts share a top block ID. This happens when a block
    // is copied between sprites without its ID being regenerated.
    const spriteA = new Target(rt);
    const spriteB = new Target(rt);
    spriteA.blocks.createBlock(makeCommandBlock('dup'));
    spriteB.blocks.createBlock(makeCommandBlock('dup'));

    // Start the script on sprite A.
    rt.toggleScript('dup', {target: spriteA, stackClick: true});
    assert.strictEqual(rt.threads.length, 1, 'sprite A script started');
    assert.strictEqual(rt.threads[0].target, spriteA);

    // Clicking the same-ID script on sprite B must start B, not stop A.
    rt.toggleScript('dup', {target: spriteB, stackClick: true});
    assert.strictEqual(rt.threads.length, 2, 'sprite B script started as a second thread');
    assert.ok(!rt.threads[0].isKilled, 'sprite A thread was not stopped');
    assert.strictEqual(rt.threads[1].target, spriteB);

    // Toggling B again stops only B, leaving A running.
    rt.toggleScript('dup', {target: spriteB, stackClick: true});
    assert.ok(!rt.threads[0].isKilled, 'sprite A thread still running');
    assert.ok(rt.threads[1].isKilled, 'sprite B thread stopped');
});

test('toggleScript scopes colliding block IDs using the editing target', () => {
    const rt = new Runtime();
    rt.setCompilerOptions({enabled: false});

    const spriteA = new Target(rt);
    const spriteB = new Target(rt);
    spriteA.blocks.createBlock(makeCommandBlock('dup'));
    spriteB.blocks.createBlock(makeCommandBlock('dup'));

    rt.setEditingTarget(spriteA);
    rt.toggleScript('dup', {stackClick: true});
    assert.strictEqual(rt.threads.length, 1, 'sprite A script started');
    assert.strictEqual(rt.threads[0].target, spriteA);

    rt.setEditingTarget(spriteB);
    rt.toggleScript('dup', {stackClick: true});
    assert.strictEqual(rt.threads.length, 2, 'sprite B script started as a second thread');
    assert.ok(!rt.threads[0].isKilled, 'sprite A thread was not stopped');
    assert.strictEqual(rt.threads[1].target, spriteB);
});

test('toggleScript still toggles a running script off on the same target', () => {
    const rt = new Runtime();
    rt.setCompilerOptions({enabled: false});

    const sprite = new Target(rt);
    sprite.blocks.createBlock(makeCommandBlock('top'));

    rt.toggleScript('top', {target: sprite, stackClick: true});
    assert.strictEqual(rt.threads.length, 1, 'script started');
    assert.ok(!rt.threads[0].isKilled);

    rt.toggleScript('top', {target: sprite, stackClick: true});
    assert.ok(rt.threads[0].isKilled, 'clicking again stopped the script');
});
