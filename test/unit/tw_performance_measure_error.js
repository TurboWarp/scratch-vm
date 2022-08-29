const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const VirtualMachine = require('../../src/virtual-machine');

global.performance = {
    mark () {
        // No-op
    },
    measure () {
        throw new Error('Mock error to simulate browser garbage collecting one of the marks before this code runs');
    }
};

test('performance.measure() error in loadProject is ignored', async t => {
    const vm = new VirtualMachine();
    await vm.loadProject(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'tw-empty-project.sb3')));
    t.end();
});
