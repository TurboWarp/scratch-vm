const test = require('tap').test;
const VirtualMachine = require('../../src/virtual-machine');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Sprite = require('../../src/sprites/sprite');
const Variable = require('../../src/engine/variable');

test('emitTargetsUpdate targetList is lazy', t => {
    const vm = new VirtualMachine();
    let calledToJSON = false;
    vm.runtime.targets = [{
        toJSON () {
            calledToJSON = true;
            return {};
        }
    }];
    let targetsUpdateEvent;
    vm.on('targetsUpdate', e => {
        targetsUpdateEvent = e;
    });
    vm.emitTargetsUpdate();
    t.equal(calledToJSON, false);
    void targetsUpdateEvent.targetList; // should trigger lazy compute
    t.equal(calledToJSON, true);
    t.end();
});

test('values in lists and variables are serialized as-is', t => {
    const vm = new VirtualMachine();
    const sprite = new Sprite();
    const target = new RenderedTarget(sprite, vm.runtime);

    target.variables.var1 = Variable.create('var', 'test var', Variable.SCALAR_TYPE, false);
    target.variables.var1.value = null;

    target.variables.var2 = Variable.create('var2', 'test var', Variable.SCALAR_TYPE, false);
    target.variables.var2.value = undefined;

    target.variables.var3 = Variable.create('var3', 'test var', Variable.SCALAR_TYPE, false);
    target.variables.var3.value = {};

    target.variables.var4 = Variable.create('var4', 'test var', Variable.SCALAR_TYPE, false);
    target.variables.var4.value = 1;

    target.variables.var5 = Variable.create('var5', 'test var', Variable.SCALAR_TYPE, false);
    target.variables.var5.value = 'abc';

    target.variables.var6 = Variable.create('var6', 'test var', Variable.SCALAR_TYPE, false);
    target.variables.var6.value = false;

    target.variables.list = Variable.create('list', 'test list', Variable.LIST_TYPE, false);
    target.variables.list.value = ['abc', false, 1, null, undefined, {}];

    vm.runtime.addTarget(target);

    const json = JSON.parse(vm.toJSON());

    t.deepEqual(json.targets[0].variables.var1[1], null);
    t.deepEqual(json.targets[0].variables.var2[1], null); // undefined becomes null due to JSON limitations
    t.deepEqual(json.targets[0].variables.var3[1], {});
    t.deepEqual(json.targets[0].variables.var4[1], 1);
    t.deepEqual(json.targets[0].variables.var5[1], 'abc');
    t.deepEqual(json.targets[0].variables.var6[1], false);

    t.deepEqual(json.targets[0].lists.list[1], ['abc', false, 1, null, null, {}]);

    t.end();
});

test('addSound error handling when sprite does not exist', async t => {
    t.plan(1);
    const vm = new VirtualMachine();
    const id = 'Inva1id5pri731D$!';
    try {
        await vm.addSound({
            thisObjectDoesNotMatter: true
        }, id);
    } catch (e) {
        if (e && e.message === `No target with ID: ${id}`) {
            t.pass();
        }
    }
    t.end();
});

test('convertToPackagedRuntime forwards to runtime', t => {
    t.plan(1);
    const vm = new VirtualMachine();
    vm.runtime.convertToPackagedRuntime = () => {
        t.pass();
    };
    vm.convertToPackagedRuntime();
    t.end();
});
