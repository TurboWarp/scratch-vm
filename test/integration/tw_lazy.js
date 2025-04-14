const {test} = require('tap');
const path = require('path');
const fs = require('fs');
const nodeCrypto = require('crypto');
const JSZip = require('@turbowarp/jszip');
const VM = require('../../src/virtual-machine');
const FakeRenderer = require('../fixtures/fake-renderer');
const makeTestStorage = require('../fixtures/make-test-storage');
const LazySprite = require('../../src/sprites/tw-lazy-sprite');

test('lazy loaded sprite inside a zip', t => {
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-lazy-simple.sb3'));

    const loadedMd5Sums = new Set();
    const renderer = new FakeRenderer();
    renderer.createSVGSkin = function (svgData) {
        const md5sum = nodeCrypto
            .createHash('md5')
            .update(svgData)
            .digest('hex');

        loadedMd5Sums.add(md5sum);
        return this._nextSkinId++;
    };

    vm.attachRenderer(renderer);
    vm.attachStorage(makeTestStorage());

    vm.loadProject(fixture).then(() => {
        t.equal(vm.runtime.targets.length, 1);

        t.equal(vm.runtime.lazySprites.length, 1);
        const lazySprite = vm.runtime.lazySprites[0];
        t.equal(lazySprite.name, 'Sprite1');

        t.equal(lazySprite.object.name, 'Sprite1');
        t.not(lazySprite.zip, null);

        t.notOk(loadedMd5Sums.has('927d672925e7b99f7813735c484c6922'));

        lazySprite.load().then(target => {
            // Ensure sprite pointer matches
            t.equal(target.sprite, lazySprite);

            // Make sure costume got passed to renderer
            t.ok(loadedMd5Sums.has('927d672925e7b99f7813735c484c6922'));

            // Make sure various properties from JSON got copied
            t.equal(target.getName(), 'Sprite1');
            t.equal(target.x, 10);
            t.equal(target.y, 20);
            t.equal(target.direction, 95);
            t.equal(target.size, 101);
            t.equal(target.draggable, true);

            t.end();
        });
    });
});

test('isLazy === true', t => {
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-lazy-simple.sb3'));
    vm.loadProject(fixture).then(() => {
        const lazySprite = vm.runtime.lazySprites[0];
        t.equal(lazySprite.isLazy, true);
        t.end();
    });
});

test('unload before load finishes', t => {
    const vm = new VM();
    const renderer = new FakeRenderer();
    vm.attachRenderer(renderer);
    vm.attachStorage(makeTestStorage());

    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-lazy-simple.sb3'));
    vm.loadProject(fixture).then(() => {
        const lazySprite = vm.runtime.lazySprites[0];

        lazySprite.load().then(target => {
            t.equal(target, null);
            t.end();
        });
        lazySprite.unload();
    });
});

test('eagerly imports extensions used only inside lazy sprite', t => {
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-lazy-pen-used-only-in-lazy-sprite.sb3'));
    vm.loadProject(fixture).then(() => {
        // Make sure pen extension got loaded
        t.equal(vm.runtime._blockInfo[0].id, 'pen');

        // And make sure that the sprite actually loads.
        const lazySprite = vm.runtime.lazySprites[0];
        lazySprite.load().then(target => {
            t.equal(target.getName(), 'Sprite1');
            t.end();
        });
    });
});

test('invalid LazySprite.load() state transitions', t => {
    t.plan(4);
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-lazy-simple.sb3'));
    vm.loadProject(fixture).then(() => {
        const lazySprite = vm.runtime.lazySprites[0];

        // This load runs first, should succeed
        lazySprite.load().then(target => {
            t.equal(target.getName(), 'Sprite1');

            // Third load. Should fail.
            lazySprite.load().catch(err => {
                t.equal(err.message, 'Unknown state transition loaded -> loading');

                // Mock the error state. load() should fail.
                lazySprite.state = LazySprite.State.ERROR;
                lazySprite.load().catch(err2 => {
                    t.equal(err2.message, 'Unknown state transition error -> loading');
                    t.end();
                });
            });
        });

        // Second load. Should fail.
        lazySprite.load().catch(err => {
            t.equal(err.message, 'Unknown state transition loading -> loading');
        });
    });
});

test('LazySprite.load() handles error', t => {
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-lazy-simple.sb3'));
    vm.loadProject(fixture).then(() => {
        const lazySprite = vm.runtime.lazySprites[0];
        lazySprite.createClone = () => {
            throw new Error('Simulated error to test error handling');
        };

        lazySprite.load().catch(err => {
            // Make sure it is the expected simulated error, not a real error
            t.equal(err.message, 'Simulated error to test error handling');

            t.equal(lazySprite.state, LazySprite.State.ERROR);
            t.end();
        });
    });
});

test('lazy sprites removed on dispose', t => {
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-lazy-simple.sb3'));
    vm.loadProject(fixture).then(() => {
        t.equal(vm.runtime.lazySprites.length, 1);
        vm.runtime.dispose();
        t.equal(vm.runtime.lazySprites.length, 0);
        t.end();
    });
});

test('dispose cancels current load operations', t => {
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-lazy-simple.sb3'));
    vm.loadProject(fixture).then(() => {
        const lazySprite = vm.runtime.lazySprites[0];
        lazySprite.load().then(target => {
            t.equal(target, null);
            t.end();
        });
        vm.runtime.dispose();
    });
});

test('sb2 has no lazy sprites', t => {
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/default.sb2'));
    vm.loadProject(fixture).then(() => {
        t.equal(vm.runtime.lazySprites.length, 0);
        t.end();
    });
});

for (const load of [true, false]) {
    test(`export lazy sprites ${load ? 'after' : 'before'} loading`, t => {
        const vm = new VM();
        vm.attachStorage(makeTestStorage());
        const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-lazy-simple.sb3'));
    
        vm.loadProject(fixture).then(async () => {
            if (load) {
                await vm.runtime.loadLazySprites(['Sprite1']);
            }
    
            const buffer = await vm.saveProjectSb3('arraybuffer');
            const zip = await JSZip.loadAsync(buffer);
            const json = JSON.parse(await zip.file('project.json').async('text'));
    
            // Surface-level checks
            t.equal(json.targets.length, 2);
            t.notOk(Object.prototype.hasOwnProperty.call(json.targets[0], 'lazy'));
            t.equal(json.targets[1].name, 'Sprite1');
            t.equal(json.targets[1].lazy, true);
    
            // Expect exact equality of target JSON
            const fixtureZip = await JSZip.loadAsync(fixture);
            const fixtureJSON = JSON.parse(await fixtureZip.file('project.json').async('text'));
    
            delete json.targets[1].targetPaneOrder;
            delete fixtureJSON.targets[1].targetPaneOrder;
            delete json.targets[1].layerOrder;
            delete fixtureJSON.targets[1].layerOrder;

            t.same(json.targets[1], fixtureJSON.targets[1]);

            // Check for lazy loaded sprite's costume existing
            t.not(zip.file('927d672925e7b99f7813735c484c6922.svg'), null);

            t.end();
        });
    });
}

test('lazy sprite is not lazy when exported individually', t => {
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-lazy-simple.sb3'));
    vm.loadProject(fixture).then(() => {
        vm.runtime.loadLazySprites(['Sprite1']).then(([target]) => {
            const json = JSON.parse(vm.toJSON(target.id));
            t.notOk(Object.prototype.hasOwnProperty.call(json, 'lazy'));
            t.end();
        });
    });
});
