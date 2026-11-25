const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const JSZip = require('@turbowarp/jszip');
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
    assert.ok(a >= Sampler.FIRST_BLOCK && b >= Sampler.FIRST_BLOCK && c >= Sampler.FIRST_BLOCK);
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
    assert.strictEqual(vm.runtime.sampler.locations.length, Sampler.FIRST_BLOCK);
});

test('basic level attributes compiled scripts to UNPROFILED', async () => {
    const {vm, moves, draws} = await setup();
    vm.runtime.sampler.setEnabled(Sampler.LEVEL_BASIC);
    vm.greenFlag();
    vm.runtime._step();
    assert.ok(vm.runtime.threads[0].isCompiled);
    assert.deepStrictEqual(moves, [Sampler.UNPROFILED, Sampler.UNPROFILED]);
    assert.deepStrictEqual(draws, [Sampler.RENDERER]);
    assert.strictEqual(vm.runtime.sampler.pc[0], Sampler.IDLE);
    assert.strictEqual(vm.runtime.sampler.locations.length, Sampler.FIRST_BLOCK);
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

test('commands level does not count executions', async () => {
    const {vm} = await setup();
    const sampler = vm.runtime.sampler;
    sampler.setEnabled(Sampler.LEVEL_COMMANDS);
    vm.greenFlag();
    vm.runtime._step();
    vm.runtime._step();
    assert.ok(sampler.locations.length > Sampler.FIRST_BLOCK);
    assert.ok(sampler.counts.every(count => count === 0));
});

test('counts level counts executions per block', async () => {
    const {vm, moves} = await setup();
    const sampler = vm.runtime.sampler;
    sampler.setEnabled(Sampler.LEVEL_COUNTS);
    vm.greenFlag();
    vm.runtime._step();
    vm.runtime._step();

    const spriteId = vm.runtime.getSpriteTargetByName('Sprite1').id;
    const changeOnce = sampler.blockToLocation(spriteId, 'b');
    const changeInLoop = sampler.blockToLocation(spriteId, 'f');
    assert.deepStrictEqual(moves, [changeOnce, changeInLoop, changeInLoop]);
    assert.strictEqual(sampler.counts.length, sampler.locations.length);
    assert.strictEqual(sampler.counts[changeOnce], 1);
    assert.strictEqual(sampler.counts[changeInLoop], 2);
    assert.strictEqual(sampler.counts[Sampler.RENDERER], 2);
    assert.strictEqual(sampler.counts[Sampler.RUNTIME], 2);
    assert.strictEqual(sampler.counts[Sampler.WARP_TIMER], 0);
    assert.strictEqual(sampler.counts[Sampler.UNPROFILED], 0);

    sampler.resetCounts();
    vm.runtime._step();
    assert.strictEqual(sampler.counts[changeOnce], 0);
    assert.strictEqual(sampler.counts[changeInLoop], 1);
    assert.strictEqual(sampler.counts[Sampler.RENDERER], 1);
    assert.strictEqual(sampler.counts[Sampler.RUNTIME], 1);
});

test('counts level counts warp timer checks', async () => {
    const zip = await JSZip.loadAsync(fixture);
    const project = JSON.parse(await zip.file('project.json').async('string'));
    const mutation = {tagName: 'mutation', children: [], proccode: 'loop', argumentids: '[]', warp: 'true'};
    const block = (opcode, props) => ({
        opcode,
        next: null,
        parent: null,
        inputs: {},
        fields: {},
        shadow: false,
        topLevel: false,
        ...props
    });
    project.targets[1].blocks = {
        hat: block('event_whenflagclicked', {next: 'call', topLevel: true, x: 0, y: 0}),
        call: block('procedures_call', {parent: 'hat', mutation}),
        def: block('procedures_definition', {
            next: 'repeat',
            inputs: {custom_block: [1, 'proto']},
            topLevel: true,
            x: 0,
            y: 200
        }),
        proto: block('procedures_prototype', {
            parent: 'def',
            shadow: true,
            mutation: {...mutation, argumentnames: '[]', argumentdefaults: '[]'}
        }),
        repeat: block('control_repeat', {parent: 'def', inputs: {TIMES: [1, [6, '5']], SUBSTACK: [2, 'move']}}),
        move: block('motion_changexby', {parent: 'repeat', inputs: {DX: [1, [4, '1']]}})
    };

    const vm = new VirtualMachine();
    const renderer = new FakeRenderer();
    renderer.draw = () => {};
    vm.attachRenderer(renderer);
    await vm.loadProject(project);
    vm.setCompilerOptions({warpTimer: true});
    const sampler = vm.runtime.sampler;
    sampler.setEnabled(Sampler.LEVEL_COUNTS);
    vm.greenFlag();
    vm.runtime._step();

    assert.strictEqual(vm.runtime.threads.length, 0);
    const move = sampler.blockToLocation(vm.runtime.getSpriteTargetByName('Sprite1').id, 'move');
    assert.strictEqual(sampler.counts[move], 5);
    assert.strictEqual(sampler.counts[Sampler.WARP_TIMER], 5);
    assert.strictEqual(sampler.counts[Sampler.UNPROFILED], 0);
    assert.strictEqual(sampler.counts[Sampler.RENDERER], 1);
});

test('scripts compiled before enabling commands are UNPROFILED', async () => {
    const {vm, moves, draws} = await setup();
    const sampler = vm.runtime.sampler;
    vm.greenFlag();
    vm.runtime._step();
    assert.ok(vm.runtime.threads[0].isCompiled);

    sampler.setEnabled(Sampler.LEVEL_COUNTS);
    vm.runtime._step();
    assert.deepStrictEqual(moves, [null, null, Sampler.UNPROFILED]);
    assert.deepStrictEqual(draws, [null, Sampler.RENDERER]);
    assert.strictEqual(sampler.counts[Sampler.UNPROFILED], 0);
    assert.strictEqual(sampler.locations.length, Sampler.FIRST_BLOCK);

    // Restarting the script compiles it again with sampling
    vm.greenFlag();
    vm.runtime._step();
    const spriteId = vm.runtime.getSpriteTargetByName('Sprite1').id;
    assert.deepStrictEqual(moves.slice(3), [
        sampler.blockToLocation(spriteId, 'b'),
        sampler.blockToLocation(spriteId, 'f')
    ]);
    assert.strictEqual(sampler.counts[Sampler.UNPROFILED], 0);
});

test('interpolation is RUNTIME and its draws are RENDERER', async () => {
    const {vm, draws} = await setup();
    const sampler = vm.runtime.sampler;
    sampler.setEnabled(Sampler.LEVEL_COUNTS);
    vm.runtime._renderInterpolatedPositions();
    assert.deepStrictEqual(draws, [Sampler.RENDERER]);
    assert.strictEqual(sampler.counts[Sampler.RUNTIME], 1);
    assert.strictEqual(sampler.counts[Sampler.RENDERER], 1);
    assert.strictEqual(sampler.pc[0], Sampler.IDLE);
});

test('GUI updates are their own location', async () => {
    const zip = await JSZip.loadAsync(fixture);
    const project = JSON.parse(await zip.file('project.json').async('string'));
    project.monitors = [{
        id: '`jEk@4|i[#Fk?(8x)AV.-my variable',
        mode: 'default',
        opcode: 'data_variable',
        params: {VARIABLE: 'my variable'},
        spriteName: null,
        value: 0,
        width: 0,
        height: 0,
        x: 5,
        y: 5,
        visible: true,
        sliderMin: 0,
        sliderMax: 100,
        isDiscrete: true
    }];

    const vm = new VirtualMachine();
    const renderer = new FakeRenderer();
    renderer.draw = () => {};
    vm.attachRenderer(renderer);
    await vm.loadProject(project);
    const sampler = vm.runtime.sampler;
    sampler.setEnabled(Sampler.LEVEL_COUNTS);
    vm.greenFlag();

    const emits = [];
    for (const event of ['TARGETS_UPDATE', 'MONITORS_UPDATE']) {
        vm.runtime.on(event, () => {
            if (emits.length < 100) emits.push([event, sampler.pc[0]]);
        });
    }
    vm.runtime._step();

    assert.deepStrictEqual(emits, [
        ['TARGETS_UPDATE', Sampler.GUI_UPDATES],
        ['MONITORS_UPDATE', Sampler.GUI_UPDATES]
    ]);
    assert.strictEqual(sampler.counts[Sampler.GUI_UPDATES], 1);
    assert.strictEqual(sampler.counts[Sampler.RUNTIME], 1);
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
    assert.strictEqual(vm.runtime.sampler.locations.length, Sampler.FIRST_BLOCK);
});

test('Sampler is exported', () => {
    const vm = new VirtualMachine();
    assert.strictEqual(vm.exports.Sampler, Sampler);
});
