const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');

const projectUri = path.resolve(__dirname, '../fixtures/hat-execution-order.sb2');
const project = readFileToBuffer(projectUri);

const compilerAndInterpreter = (name, callback) => {
    test(`${name} - interpreted`, (t, done) => callback(done, {
        enabled: false
    }));
    test(`${name} - compiled`, (t, done) => callback(done, {
        enabled: true
    }));
};

compilerAndInterpreter('complex', (done, co) => {
    const vm = new VirtualMachine();
    vm.setCompilerOptions(co);
    vm.attachStorage(makeTestStorage());

    // Evaluate playground data and exit
    vm.on('playgroundData', e => {
        const threads = JSON.parse(e.threads);
        assert.ok(threads.length === 0);

        const resultKey = Object.keys(vm.runtime.targets[0].variables)[0];
        const results = vm.runtime.targets[0].variables[resultKey].value;
        assert.deepEqual(results, ['3', '2', '1', 'stage']);

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
