const {test} = require('node:test');
const assert = require('node:assert');
const Thread = require('../../src/engine/thread');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Sprite = require('../../src/sprites/sprite');
const Runtime = require('../../src/engine/runtime');

test('spec', () => {
    assert.strictEqual(typeof Thread, 'function');

    const th = new Thread('arbitraryString');
    assert.strictEqual(typeof th, 'object');
    assert.ok(th instanceof Thread);
    assert.strictEqual(typeof th.pushStack, 'function');
    assert.strictEqual(typeof th.reuseStackForNextBlock, 'function');
    assert.strictEqual(typeof th.popStack, 'function');
    assert.strictEqual(typeof th.stopThisScript, 'function');
    assert.strictEqual(typeof th.peekStack, 'function');
    assert.strictEqual(typeof th.peekStackFrame, 'function');
    assert.strictEqual(typeof th.peekParentStackFrame, 'function');
    assert.strictEqual(typeof th.pushReportedValue, 'function');
    assert.strictEqual(typeof th.initParams, 'function');
    assert.strictEqual(typeof th.pushParam, 'function');
    assert.strictEqual(typeof th.peekStack, 'function');
    assert.strictEqual(typeof th.getParam, 'function');
    assert.strictEqual(typeof th.atStackTop, 'function');
    assert.strictEqual(typeof th.goToNextBlock, 'function');
    assert.strictEqual(typeof th.isRecursiveCall, 'function');
});

test('pushStack', () => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
});

test('popStack', () => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    assert.strictEqual(th.popStack(), 'arbitraryString');
    assert.strictEqual(th.popStack(), undefined);
});

test('atStackTop', () => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    th.pushStack('secondString');
    assert.strictEqual(th.atStackTop(), false);
    th.popStack();
    assert.strictEqual(th.atStackTop(), true);
});

test('reuseStackForNextBlock', () => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    th.reuseStackForNextBlock('secondString');
    assert.strictEqual(th.popStack(), 'secondString');
});

test('peekStackFrame', () => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    assert.strictEqual(th.peekStackFrame().warpMode, false);
    th.popStack();
    assert.strictEqual(th.peekStackFrame(), null);
});

test('peekParentStackFrame', () => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    th.peekStackFrame().warpMode = true;
    assert.strictEqual(th.peekParentStackFrame(), null);
    th.pushStack('secondString');
    assert.strictEqual(th.peekParentStackFrame().warpMode, true);
});

test('pushReportedValue', () => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    th.pushStack('secondString');
    th.pushReportedValue('value');
    assert.strictEqual(th.justReported, 'value');
});

test('peekStack', () => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    assert.strictEqual(th.peekStack(), 'arbitraryString');
    th.popStack();
    assert.strictEqual(th.peekStack(), null);
});

test('PushGetParam', () => {
    const th = new Thread('arbitraryString');
    th.pushStack('arbitraryString');
    th.initParams();
    th.pushParam('testParam', 'testValue');
    assert.strictEqual(th.peekStackFrame().params.testParam, 'testValue');
    assert.strictEqual(th.getParam('testParam'), 'testValue');
    // Params outside of define stack always evaluate to null
    assert.strictEqual(th.getParam('nonExistentParam'), null);
});

test('goToNextBlock', () => {
    const th = new Thread('arbitraryString');
    const r = new Runtime();
    const s = new Sprite(null, r);
    const rt = new RenderedTarget(s, r);
    const block1 = {fields: Object,
        id: 'arbitraryString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: 'secondString',
        opcode: 'motion_movesteps',
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };
    const block2 = {fields: Object,
        id: 'secondString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: null,
        opcode: 'procedures_call',
        mutation: {proccode: 'fakeCode'},
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };

    rt.blocks.createBlock(block1);
    rt.blocks.createBlock(block2);
    rt.blocks.createBlock(block2);
    th.target = rt;

    assert.strictEqual(th.peekStack(), null);
    th.pushStack('secondString');
    assert.strictEqual(th.peekStack(), 'secondString');
    th.goToNextBlock();
    assert.strictEqual(th.peekStack(), null);
    th.pushStack('secondString');
    th.pushStack('arbitraryString');
    assert.strictEqual(th.peekStack(), 'arbitraryString');
    th.goToNextBlock();
    assert.strictEqual(th.peekStack(), 'secondString');
    th.goToNextBlock();
    assert.strictEqual(th.peekStack(), null);
});

test('stopThisScript', () => {
    const th = new Thread('arbitraryString');
    const r = new Runtime();
    const s = new Sprite(null, r);
    const rt = new RenderedTarget(s, r);
    const block1 = {fields: Object,
        id: 'arbitraryString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: null,
        opcode: 'motion_movesteps',
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };
    const block2 = {fields: Object,
        id: 'secondString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: null,
        opcode: 'procedures_call',
        mutation: {proccode: 'fakeCode'},
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };

    rt.blocks.createBlock(block1);
    rt.blocks.createBlock(block2);
    th.target = rt;

    th.stopThisScript();
    assert.strictEqual(th.peekStack(), null);
    th.pushStack('arbitraryString');
    assert.strictEqual(th.peekStack(), 'arbitraryString');
    th.stopThisScript();
    assert.strictEqual(th.peekStack(), null);
    th.pushStack('arbitraryString');
    th.pushStack('secondString');
    th.stopThisScript();
    assert.strictEqual(th.peekStack(), null);
});

test('isRecursiveCall', () => {
    const th = new Thread('arbitraryString');
    const r = new Runtime();
    const s = new Sprite(null, r);
    const rt = new RenderedTarget(s, r);
    const block1 = {fields: Object,
        id: 'arbitraryString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: null,
        opcode: 'motion_movesteps',
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };
    const block2 = {fields: Object,
        id: 'secondString',
        inputs: Object,
        STEPS: Object,
        block: 'fakeBlock',
        name: 'STEPS',
        next: null,
        opcode: 'procedures_call',
        mutation: {proccode: 'fakeCode'},
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };

    rt.blocks.createBlock(block1);
    rt.blocks.createBlock(block2);
    th.target = rt;

    const pushStack = id => {
        th.pushStack(id);
        th.peekStackFrame().op = {id};
    };

    assert.strictEqual(th.isRecursiveCall('fakeCode'), false);
    pushStack('secondString');
    assert.strictEqual(th.isRecursiveCall('fakeCode'), false);
    pushStack('arbitraryString');
    assert.strictEqual(th.isRecursiveCall('fakeCode'), true);
    pushStack('arbitraryString');
    assert.strictEqual(th.isRecursiveCall('fakeCode'), true);
    th.popStack();
    assert.strictEqual(th.isRecursiveCall('fakeCode'), true);
    th.popStack();
    assert.strictEqual(th.isRecursiveCall('fakeCode'), false);
    th.popStack();
    assert.strictEqual(th.isRecursiveCall('fakeCode'), false);
});
