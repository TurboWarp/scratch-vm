const {test} = require('tap');
const fs = require('fs');
const path = require('path');
const VirtualMachine = require('../../src/virtual-machine');
const Sprite = require('../../src/sprites/sprite');
const RenderedTarget = require('../../src/sprites/rendered-target');
const sb3 = require('../../src/serialization/sb3');

test('serialize data', t => {
    const vm = new VirtualMachine();
    const rt = vm.runtime;

    const target1 = new RenderedTarget(new Sprite(null, rt), rt);
    const target2 = new RenderedTarget(new Sprite(null, rt), rt);
    rt.addTarget(target1);
    rt.addTarget(target2);

    t.same(sb3.serialize(rt).extensionStorage, undefined, 'global - nothing when no extensions');
    t.same(
        sb3.serialize(rt).targets.map(i => i.extensionStorage),
        [undefined, undefined],
        'sprites - nothing when no extensions'
    );

    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'test1',
            blocks: []
        })
    });
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'test2',
            blocks: []
        })
    });
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'test3',
            blocks: []
        })
    });

    t.same(sb3.serialize(rt).extensionStorage, undefined, 'global - nothing when no storage');
    t.same(
        sb3.serialize(rt).targets.map(i => i.extensionStorage),
        [undefined, undefined],
        'sprites - nothing when no storage'
    );

    const topLevelBlockBase = {
        // this is not interesting for this test
        inputs: {},
        fields: {},
        topLevel: true,
        next: null,
        parent: null
    };

    target1.blocks.createBlock({
        ...topLevelBlockBase,
        id: 'block1',
        opcode: 'test1_whatever'
    });
    target2.blocks.createBlock({
        ...topLevelBlockBase,
        id: 'block2',
        opcode: 'test2_whatever'
    });

    target1.extensionStorage.test1 = 1234321;
    t.same(sb3.serialize(rt, target1.id).extensionStorage, {
        test1: 1234321
    }, 'target1 alone has test1');
    t.same(sb3.serialize(rt, target2.id).extensionStorage, undefined, 'target2 alone does not have test1');

    target1.extensionStorage.test1 = null;
    t.same(sb3.serialize(rt, target1.id).extensionStorage, undefined, 'null is not serialized');

    target1.extensionStorage.test1 = undefined;
    t.same(sb3.serialize(rt, target1.id).extensionStorage, undefined, 'undefined is not serialized');

    target1.extensionStorage.test1 = {it: 'works'};
    target1.extensionStorage.test2 = true;
    target1.extensionStorage.test3 = {should_not: 'be_saved'};

    target2.extensionStorage.test1 = ['ok'];
    delete target2.extensionStorage.test2;
    delete target2.extensionStorage.test3;

    rt.extensionStorage.test1 = 'global ok';
    delete rt.extensionStorage.test2;
    rt.extensionStorage.test3 = ['dont save this'];

    const json = sb3.serialize(rt);
    t.same(json.extensionStorage, {
        test1: 'global ok'
    }, 'final - global has test1');
    t.same(json.targets.map(i => i.extensionStorage), [
        {
            test1: {
                it: 'works'
            },
            test2: true
        },
        {
            test1: ['ok']
        }
    ], 'final - targets ok');
    
    t.end();
});

test('deserialize project with data', t => {
    const vm = new VirtualMachine();

    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'test1',
            blocks: []
        })
    });
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'test2',
            blocks: []
        })
    });
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'test3',
            blocks: []
        })
    });

    // trick it into thinking the extensions are real and loaded...
    vm.extensionManager._loadedExtensions.set('test1', 'invalid');
    vm.extensionManager._loadedExtensions.set('test2', 'invalid');
    vm.extensionManager._loadedExtensions.set('test3', 'invalid');

    const fixture = fs.readFileSync(path.resolve(__dirname, '../fixtures/tw-extension-storage.sb3'));
    vm.loadProject(fixture).then(() => {
        t.same(vm.runtime.extensionStorage, {
            test1: 'global ok'
        }, 'deserialized global');
        t.same(vm.runtime.targets[0].extensionStorage, {
            test1: {
                it: 'works'
            },
            test2: true
        }, 'deserialized target 0');
        t.same(vm.runtime.targets[1].extensionStorage, {
            test1: ['ok']
        }, 'deserialized target 1');
        t.same(vm.runtime.targets[2].extensionStorage, {}, 'deserialized target 2');

        t.end();
    });
});

test('deserialize project with no data', t => {
    const vm = new VirtualMachine();
    const fixture = fs.readFileSync(path.resolve(__dirname, '../fixtures/tw-extension-storage-no-data.sb3'));
    vm.loadProject(fixture).then(() => {
        t.same(vm.runtime.extensionStorage, {}, 'deserialized global');
        t.same(vm.runtime.targets[0].extensionStorage, {}, 'deserialized target 0');
        t.end();
    });
});
