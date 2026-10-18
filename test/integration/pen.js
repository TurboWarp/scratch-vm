const Worker = require('tiny-worker');
const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');

const Scratch3PenBlocks = require('../../src/extensions/scratch3_pen/index.js');
const VirtualMachine = require('../../src/index');
const dispatch = require('../../src/dispatch/central-dispatch');

const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;

const uri = path.resolve(__dirname, '../fixtures/pen.sb2');
const project = readFileToBuffer(uri);

// By default Central Dispatch works with the Worker class built into the browser. Tell it to use TinyWorker instead.
dispatch.workerClass = Worker;

test('pen', (t, done) => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    // Evaluate playground data and exit
    vm.on('playgroundData', () => {
        // @todo Additional tests

        const catSprite = vm.runtime.targets[1].sprite;
        const [originalCat, cloneCat] = catSprite.clones;
        assert.notStrictEqual(originalCat, cloneCat);

        /** @type {PenState} */
        const originalPenState = originalCat.getCustomState(Scratch3PenBlocks.STATE_KEY);

        /** @type {PenState} */
        const clonePenState = cloneCat.getCustomState(Scratch3PenBlocks.STATE_KEY);

        assert.notStrictEqual(originalPenState, clonePenState);
        assert.strictEqual(originalPenState.penAttributes.diameter, 51);
        assert.strictEqual(clonePenState.penAttributes.diameter, 42);

        vm.quit();
        done();
    });

    // Start VM, load project, and run
    assert.doesNotThrow(() => {
        vm.start();
        vm.clear();
        vm.setCompatibilityMode(false);
        vm.setTurboMode(false);
        vm.loadProject(project)
            .then(() => {
                vm.greenFlag();

                // After two seconds, get playground data and stop
                setTimeout(() => {
                    vm.getPlaygroundData();
                    vm.stopAll();
                }, 2000);
            });
    });
});
