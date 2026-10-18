const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const VM = require('../../src/virtual-machine');
const Timer = require('../../src/util/timer');

test('compatibility stack frame is exposed on thread', async () => {
    const vm = new VM();
    await vm.loadProject(fs.readFileSync(path.join(__dirname, '../fixtures/tw-glide.sb3')));
    vm.greenFlag();
    vm.runtime._step();
    assert.ok(vm.runtime.threads[0].compatibilityStackFrame.timer instanceof Timer);
});
