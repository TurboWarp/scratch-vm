const {test} = require('node:test');
const assert = require('node:assert');
const VM = require('../../src/virtual-machine');

test('saveProjectSb3 is deterministic over time', async () => {
    const vm = new VM();
    const [a, b] = await Promise.all([
        vm.saveProjectSb3('nodebuffer'),
        // Zip modification time is only accurate to the second
        new Promise(resolve => setTimeout(resolve, 1000)).then(() => vm.saveProjectSb3('nodebuffer'))
    ]);
    assert.deepEqual(a, b);
});
