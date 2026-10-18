const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;

const VirtualMachine = require('../../src/virtual-machine');
// const RenderedTarget = require('../../src/sprites/rendered-target');

const projectUri = path.resolve(__dirname, '../fixtures/default.sb2');
const project = readFileToBuffer(projectUri);

const vm = new VirtualMachine();

test('spec', () => {
    assert.strictEqual(typeof vm.deleteSprite, 'function');
});

test('default cat', (t, done) => {
    // Get default cat from .sprite2
    // const uri = path.resolve(__dirname, '../fixtures/example_sprite.sprite2');
    // const sprite = readFileToBuffer(uri);

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

            const defaultSprite = vm.runtime.targets[1];

            // Delete the sprite
            const addSpriteBack = vm.deleteSprite(vm.runtime.targets[1].id);

            assert.strictEqual(vm.runtime.targets.length, 1);

            assert.strictEqual(typeof addSpriteBack, 'function');

            addSpriteBack().then(() => {
                assert.strictEqual(vm.runtime.targets.length, 2);
                assert.strictEqual(vm.runtime.targets[1].getName(), defaultSprite.getName());

                vm.greenFlag();

                setTimeout(() => {
                    vm.getPlaygroundData();
                    vm.stopAll();
                }, 1000);
            });
        });
    });
});
