const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const extractProjectJson = require('../fixtures/readProjectFile').extractProjectJson;
const VirtualMachine = require('../../src/index');

const uri = path.resolve(__dirname, '../fixtures/default.sb2');
const project = extractProjectJson(uri);

test('default', (t, done) => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Evaluate playground data and exit
    vm.on('playgroundData', e => {
        const threads = JSON.parse(e.threads);
        assert.ok(threads.length === 0);
        vm.quit();
        done();
    });

    // Start VM, load project, and run
    assert.doesNotThrow(() => {
        vm.start();
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);
        vm.loadProject(project).then(() => {
            vm.greenFlag();

            // After two seconds, get playground data and stop
            setTimeout(() => {
                vm.getPlaygroundData();
                vm.stopAll();
            }, 2000);
        });
    });
});
