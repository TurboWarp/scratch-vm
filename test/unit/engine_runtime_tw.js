const tap = require('tap');
const Runtime = require('../../src/engine/runtime');
const MonitorRecord = require('../../src/engine/monitor-record');
const makeTestStorage = require('../fixtures/make-test-storage');
const Target = require('../../src/engine/target');

const test = tap.test;

test('setFramerate emits an event', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.addListener('FRAMERATE_CHANGED', framerate => {
        if (framerate === 13) {
            t.pass();
        }
    });
    rt.setFramerate(13);
    t.end();
});

test('setFramerate and setCompatibilityMode do not emit a stop event if not running', t => {
    const rt = new Runtime();
    rt.addListener('RUNTIME_STOPPED', () => {
        t.fail();
    });
    rt.setFramerate(13);
    rt.setCompatibilityMode(true);
    t.end();
});

test('setInterpolation emits an event', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.addListener('INTERPOLATION_CHANGED', enabled => {
        if (enabled) {
            t.pass();
        }
    });
    rt.setInterpolation(true);
    t.end();
});

test('setInterpolation does not restart runtime if not running', t => {
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
    t.equal(started, false);
    t.equal(stopped, false);
    t.end();
});

test('Stopping the runtime emits an event', t => {
    const rt = new Runtime();
    rt.start();
    let stopped = false;
    rt.addListener('RUNTIME_STOPPED', () => {
        stopped = true;
    });
    rt.stop();
    t.equal(stopped, true);
    t.end();
});

test('Stop does not emit an event if already stopped', t => {
    const rt = new Runtime();
    let stopped = false;
    rt.addListener('RUNTIME_STOPPED', () => {
        stopped = true;
    });
    rt.stop();
    t.equal(stopped, false);
    t.end();
});

test('setRuntimeOptions emits an event', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.addListener('RUNTIME_OPTIONS_CHANGED', options => {
        if (options.option === 17) {
            t.pass();
        }
    });
    rt.setRuntimeOptions({option: 17});
    t.end();
});

test('setRuntimeOptions supports partial updates', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.setRuntimeOptions({option: 17});
    rt.addListener('RUNTIME_OPTIONS_CHANGED', options => {
        if (options.option === 17) {
            t.pass();
        }
    });
    rt.setRuntimeOptions({otherOption: 1});
    t.end();
});

test('setCompilerOptions emits an event', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.addListener('COMPILER_OPTIONS_CHANGED', options => {
        if (options.option === 17) {
            t.pass();
        }
    });
    rt.setCompilerOptions({option: 17});
    t.end();
});

test('setCompilerOptions supports partial updates', t => {
    t.plan(1);
    const rt = new Runtime();
    rt.setCompilerOptions({option: 17});
    rt.addListener('COMPILER_OPTIONS_CHANGED', options => {
        if (options.option === 17) {
            t.pass();
        }
    });
    rt.setCompilerOptions({otherOption: 1});
    t.end();
});

test('maxClones runtime option', t => {
    const rt = new Runtime();
    rt.setRuntimeOptions({maxClones: 10});
    for (let i = 0; i < 10; i++) {
        t.equal(rt.clonesAvailable(), true);
        rt.changeCloneCounter(1);
    }
    rt.changeCloneCounter(1);
    t.equal(rt.clonesAvailable(), false);
    t.end();
});

test('stageWidth and stageHeight', t => {
    const rt = new Runtime();
    t.equal(rt.stageWidth, 480);
    t.equal(rt.stageHeight, 360);
    t.end();
});

test('debug', t => {
    const rt = new Runtime();
    t.equal(rt.debug, false);
    rt.enableDebug();
    t.equal(rt.debug, true);
    t.end();
});

test('setStageSize preserves monitor position relative to center of stage', t => {
    const rt = new Runtime();
    rt.requestAddMonitor(new MonitorRecord({
        id: 'abc',
        // top right corner
        x: 0,
        y: 0
    }));
    rt.setStageSize(640, 362);
    const finalState = rt.getMonitorState().get('abc');
    t.equal(finalState.get('x'), 80);
    t.equal(finalState.get('y'), 1);
    t.end();
});

test('setStageSize argument range', t => {
    t.plan(6);
    const rt = new Runtime();

    rt.once('STAGE_SIZE_CHANGED', (width, height) => {
        t.equal(width, 101);
        t.equal(height, 103);
    });
    rt.setStageSize(101, 103);

    rt.once('STAGE_SIZE_CHANGED', (width, height) => {
        t.equal(width, 1);
        t.equal(height, 1);
    });
    rt.setStageSize(-3.1, 0);

    rt.once('STAGE_SIZE_CHANGED', (width, height) => {
        t.equal(width, 99);
        t.equal(height, 10000);
    });
    rt.setStageSize(99.3, 10000);

    t.end();
});

test('STAGE_SIZE_CHANGED does not fire if no change', t => {
    const rt = new Runtime();
    rt.on('STAGE_SIZE_CHANGED', () => {
        t.fail('STAGE_SIZE_CHANGED emitted');
    });
    rt.setStageSize(rt.stageWidth, rt.stageHeight);
    t.end();
});

test('getNumberOfCloudVariables', t => {
    const rt = new Runtime();

    t.equal(rt.getNumberOfCloudVariables(), 0);
    rt.addCloudVariable();
    t.equal(rt.getNumberOfCloudVariables(), 1);
    rt.addCloudVariable();
    t.equal(rt.getNumberOfCloudVariables(), 2);
    rt.removeCloudVariable();
    t.equal(rt.getNumberOfCloudVariables(), 1);
    rt.removeCloudVariable();
    t.equal(rt.getNumberOfCloudVariables(), 0);

    rt.dispose();
    t.equal(rt.getNumberOfCloudVariables(), 0);
    rt.addCloudVariable();
    t.equal(rt.getNumberOfCloudVariables(), 1);

    t.end();
});

test('currentStepTime default value', t => {
    const rt = new Runtime();
    t.type(rt.currentStepTime, 'number');
    t.ok(rt.currentStepTime > 0);
    t.end();
});

test('convertToPackagedRuntime', t => {
    const rt = new Runtime();
    t.equal(rt.isPackaged, false);
    rt.convertToPackagedRuntime();
    t.equal(rt.isPackaged, true);
    t.end();
});

test('convertToPackagedRuntime and attachStorage call order', t => {
    try {
        const rt1 = new Runtime();
        rt1.attachStorage(makeTestStorage());
        rt1.convertToPackagedRuntime();
    } catch (e) {
        t.equal(e.message, 'convertToPackagedRuntime must be called before attachStorage');
    }
    const rt2 = new Runtime();
    rt2.convertToPackagedRuntime();
    rt2.attachStorage(makeTestStorage());
    t.end();
});

test('visual report -0', t => {
    t.plan(1);

    const rt = new Runtime();
    const target = new Target();
    rt.setEditingTarget(target);

    rt.on(Runtime.VISUAL_REPORT, report => {
        t.same(report, {
            id: 'blockid',
            value: '-0'
        });
    });
    rt.visualReport(target, 'blockid', -0);

    t.end();
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

test('_pushMonitors does nothing when no targets are installed', t => {
    const rt = new Runtime();
    rt.monitorBlocks.createBlock(makeMonitorBlock());

    t.equal(rt.targets.length, 0);
    rt._pushMonitors();
    t.equal(rt.threads.length, 0);

    t.end();
});

test('_pushMonitors queues threads once targets are installed', t => {
    const rt = new Runtime();
    rt.monitorBlocks.createBlock(makeMonitorBlock());

    const stage = new Target(rt);
    rt.targets.push(stage);
    rt.setEditingTarget(stage);

    rt._pushMonitors();
    t.equal(rt.threads.length, 1);
    t.equal(rt.threads[0].target, stage);
    t.equal(rt.threads[0].updateMonitor, true);

    t.end();
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

test('toggleScript is scoped to its target when block IDs collide', t => {
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
    t.equal(rt.threads.length, 1, 'sprite A script started');
    t.equal(rt.threads[0].target, spriteA);

    // Clicking the same-ID script on sprite B must start B, not stop A.
    rt.toggleScript('dup', {target: spriteB, stackClick: true});
    t.equal(rt.threads.length, 2, 'sprite B script started as a second thread');
    t.notOk(rt.threads[0].isKilled, 'sprite A thread was not stopped');
    t.equal(rt.threads[1].target, spriteB);

    // Toggling B again stops only B, leaving A running.
    rt.toggleScript('dup', {target: spriteB, stackClick: true});
    t.notOk(rt.threads[0].isKilled, 'sprite A thread still running');
    t.ok(rt.threads[1].isKilled, 'sprite B thread stopped');

    t.end();
});

test('toggleScript scopes colliding block IDs using the editing target', t => {
    const rt = new Runtime();
    rt.setCompilerOptions({enabled: false});

    const spriteA = new Target(rt);
    const spriteB = new Target(rt);
    spriteA.blocks.createBlock(makeCommandBlock('dup'));
    spriteB.blocks.createBlock(makeCommandBlock('dup'));

    rt.setEditingTarget(spriteA);
    rt.toggleScript('dup', {stackClick: true});
    t.equal(rt.threads.length, 1, 'sprite A script started');
    t.equal(rt.threads[0].target, spriteA);

    rt.setEditingTarget(spriteB);
    rt.toggleScript('dup', {stackClick: true});
    t.equal(rt.threads.length, 2, 'sprite B script started as a second thread');
    t.notOk(rt.threads[0].isKilled, 'sprite A thread was not stopped');
    t.equal(rt.threads[1].target, spriteB);

    t.end();
});

test('toggleScript still toggles a running script off on the same target', t => {
    const rt = new Runtime();
    rt.setCompilerOptions({enabled: false});

    const sprite = new Target(rt);
    sprite.blocks.createBlock(makeCommandBlock('top'));

    rt.toggleScript('top', {target: sprite, stackClick: true});
    t.equal(rt.threads.length, 1, 'script started');
    t.notOk(rt.threads[0].isKilled);

    rt.toggleScript('top', {target: sprite, stackClick: true});
    t.ok(rt.threads[0].isKilled, 'clicking again stopped the script');

    t.end();
});
