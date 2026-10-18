const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const VirtualMachine = require('../../src/virtual-machine');
const Sampler = require('../../src/engine/tw-sampler');
const FakeRenderer = require('../fixtures/fake-renderer');

const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-sampler.sb3'));

// The runtime skips drawing when the document is hidden
global.document = {
    hidden: false
};

const setup = async () => {
    const vm = new VirtualMachine();
    const renderer = new FakeRenderer();
    vm.attachRenderer(renderer);
    await vm.loadProject(fixture);

    // Value of pc each time a block moved the sprite and each time the renderer drew.
    // Bounded so that a broken test can't eat all memory.
    const moves = [];
    const draws = [];
    const getPC = () => (vm.runtime.sampler.pc ? vm.runtime.sampler.pc[0] : null);
    const originalUpdateDrawablePosition = renderer.updateDrawablePosition;
    renderer.updateDrawablePosition = function (...args) {
        if (moves.length < 100) moves.push(getPC());
        return originalUpdateDrawablePosition.apply(this, args);
    };
    renderer.draw = () => {
        if (draws.length < 100) draws.push(getPC());
    };

    return {vm, moves, draws};
};

test('blockToLocation is stable and per-sprite', () => {
    const sampler = new Sampler(null);
    const a = sampler.blockToLocation('sprite1', 'block1');
    const b = sampler.blockToLocation('sprite1', 'block2');
    const c = sampler.blockToLocation('sprite2', 'block1');
    assert.notStrictEqual(a, b);
    assert.notStrictEqual(a, c);
    assert.ok(a >= 0 && b >= 0 && c >= 0);
    assert.strictEqual(sampler.blockToLocation('sprite1', 'block1'), a);
    assert.deepStrictEqual(sampler.locationToBlock(c), {
        spriteId: 'sprite2',
        blockId: 'block1'
    });
    assert.throws(() => sampler.locationToBlock(Sampler.IDLE));
});

test('disabled by default', async () => {
    const {vm, moves, draws} = await setup();
    vm.greenFlag();
    vm.runtime._step();
    assert.strictEqual(vm.runtime.sampler.pc, null);
    assert.deepStrictEqual(moves, [null, null]);
    assert.deepStrictEqual(draws, [null]);
    assert.strictEqual(vm.runtime.sampler.locations.length, 0);
});

test('basic level attributes compiled scripts to RUNTIME', async () => {
    const {vm, moves, draws} = await setup();
    vm.runtime.sampler.setEnabled(Sampler.LEVEL_BASIC);
    vm.greenFlag();
    vm.runtime._step();
    assert.ok(vm.runtime.threads[0].isCompiled);
    assert.deepStrictEqual(moves, [Sampler.RUNTIME, Sampler.RUNTIME]);
    assert.deepStrictEqual(draws, [Sampler.RENDERER]);
    assert.strictEqual(vm.runtime.sampler.pc[0], Sampler.IDLE);
    assert.strictEqual(vm.runtime.sampler.locations.length, 0);
});

test('commands level attributes compiled scripts to blocks', async () => {
    const {vm, moves, draws} = await setup();
    const sampler = vm.runtime.sampler;
    sampler.setEnabled(Sampler.LEVEL_COMMANDS);
    vm.greenFlag();

    vm.runtime._step();
    assert.ok(vm.runtime.threads[0].isCompiled);
    const spriteId = vm.runtime.getSpriteTargetByName('Sprite1').id;
    const changeOnce = sampler.blockToLocation(spriteId, 'b');
    const changeInLoop = sampler.blockToLocation(spriteId, 'f');
    assert.deepStrictEqual(moves, [changeOnce, changeInLoop]);
    assert.deepStrictEqual(draws, [Sampler.RENDERER]);
    assert.strictEqual(sampler.pc[0], Sampler.IDLE);

    // After resuming from the loop's yield
    vm.runtime._step();
    assert.deepStrictEqual(moves, [changeOnce, changeInLoop, changeInLoop]);
    assert.deepStrictEqual(draws, [Sampler.RENDERER, Sampler.RENDERER]);
    assert.strictEqual(sampler.pc[0], Sampler.IDLE);
});

test('setEnabled(0) turns sampling back off', async () => {
    const {vm, moves, draws} = await setup();
    vm.runtime.sampler.setEnabled(Sampler.LEVEL_COMMANDS);
    vm.runtime.sampler.setEnabled(0);
    assert.strictEqual(vm.runtime.sampler.enableBasic, false);
    assert.strictEqual(vm.runtime.sampler.enableCommands, false);

    // pc is kept around but no longer written to
    vm.runtime.sampler.pc[0] = 1234;
    vm.greenFlag();
    vm.runtime._step();
    assert.deepStrictEqual(moves, [1234, 1234]);
    assert.deepStrictEqual(draws, [1234]);
    assert.strictEqual(vm.runtime.sampler.locations.length, 0);
});

test('Sampler is exported', () => {
    const vm = new VirtualMachine();
    assert.strictEqual(vm.exports.Sampler, Sampler);
});
