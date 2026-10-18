const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;

const VirtualMachine = require('../../src/virtual-machine');
const RenderedTarget = require('../../src/sprites/rendered-target');

const projectUri = path.resolve(__dirname, '../fixtures/default.sb2');
const project = readFileToBuffer(projectUri);

const vm = new VirtualMachine();

test('spec', () => {
    assert.strictEqual(typeof vm.addSprite, 'function');
});

test('default cat', (t, done) => {
    // Get default cat from .sprite2
    const uri = path.resolve(__dirname, '../fixtures/example_sprite.sprite2');
    const sprite = readFileToBuffer(uri);

    vm.attachStorage(makeTestStorage());

    // Evaluate playground data and exit
    vm.on('playgroundData', e => {
        const threads = JSON.parse(e.threads);
        assert.ok(threads.length === 0);
        vm.quit();
        done();
    });

    vm.start();
    vm.clear();
    vm.setCompatibilityMode(false);
    vm.setTurboMode(false);
    assert.doesNotThrow(() => {
        vm.loadProject(project).then(() => {

            assert.strictEqual(vm.runtime.targets.length, 2); // stage and default sprite

            // Add another sprite
            vm.addSprite(sprite).then(() => {
                const targets = vm.runtime.targets;

                // Test
                assert.strictEqual(typeof targets, 'object');
                assert.strictEqual(targets.length, 3);

                const newTarget = targets[2];

                assert.ok(newTarget instanceof RenderedTarget);
                assert.strictEqual(typeof newTarget.id, 'string');
                assert.strictEqual(typeof newTarget.blocks, 'object');
                assert.strictEqual(typeof newTarget.variables, 'object');
                const varIds = Object.keys(newTarget.variables);
                assert.strictEqual(varIds.length, 1);
                const variable = newTarget.variables[varIds[0]];
                assert.strictEqual(variable.name, 'foo');
                assert.strictEqual(variable.value, 0);

                assert.strictEqual(newTarget.isOriginal, true);
                assert.strictEqual(newTarget.currentCostume, 0);
                assert.strictEqual(newTarget.isOriginal, true);
                assert.strictEqual(newTarget.isStage, false);
                assert.strictEqual(newTarget.sprite.name, 'Apple');

                vm.greenFlag();

                setTimeout(() => {
                    assert.strictEqual(variable.value, 10);
                    vm.getPlaygroundData();
                    vm.stopAll();
                }, 1000);
            });
        });
    });
});
