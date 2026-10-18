const {test} = require('node:test');
const assert = require('node:assert');
const VM = require('../../src/virtual-machine');
const platform = require('../../src/engine/tw-platform');
const Clone = require('../../src/util/clone');

test('the internal object', () => {
    // the idea with this test is to make it harder for forks to screw up modifying the file
    assert.strictEqual(typeof platform.name, 'string');
    assert.strictEqual(typeof platform.url, 'string');
});

test('vm property', () => {
    const vm = new VM();
    assert.deepEqual(vm.runtime.platform, platform, 'copy of tw-platform.js');
    assert.notStrictEqual(vm.runtime.platform, platform, 'not the same object as tw-platform.js');
});

test('sanitize', () => {
    const vm = new VM();
    vm.runtime.platform.name += ' - test';
    const json = JSON.parse(vm.toJSON());
    assert.deepEqual(json.meta.platform, vm.runtime.platform, 'copy of runtime.platform');
    assert.notStrictEqual(json.meta.platform, vm.runtime.platform, 'not the same object as runtime.platform');
});

const vanillaProject = {
    targets: [
        {
            isStage: true,
            name: 'Stage',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            comments: {},
            currentCostume: 0,
            costumes: [
                {
                    name: 'backdrop1',
                    dataFormat: 'svg',
                    assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                    rotationCenterX: 240,
                    rotationCenterY: 180
                }
            ],
            sounds: [],
            volume: 100,
            layerOrder: 0,
            tempo: 60,
            videoTransparency: 50,
            videoState: 'on',
            textToSpeechLanguage: null
        }
    ],
    monitors: [],
    extensions: [],
    meta: {
        semver: '3.0.0',
        vm: '0.2.0',
        agent: ''
    }
};

test('deserialize no platform', async () => {
    const vm = new VM();
    vm.runtime.on('PLATFORM_MISMATCH', () => {
        assert.fail('Called PLATFORM_MISMATCH');
    });
    await vm.loadProject(vanillaProject);
});

test('deserialize matching platform', async () => {
    const vm = new VM();
    vm.runtime.on('PLATFORM_MISMATCH', () => {
        assert.fail('Called PLATFORM_MISMATCH');
    });
    const project = Clone.simple(vanillaProject);
    project.meta.platform = Object.assign({}, platform);
    await vm.loadProject(project);
});

test('deserialize mismatching platform with no listener', async () => {
    const vm = new VM();
    const project = Clone.simple(vanillaProject);
    project.meta.platform = {
        name: '3tw4ergo980uitegr5hoijuk;'
    };
    await vm.loadProject(project);
});

test('deserialize mismatching platform with 1 listener', async t => {
    t.plan(2);
    const vm = new VM();
    vm.runtime.on('PLATFORM_MISMATCH', (pl, callback) => {
        t.assert.deepEqual(pl, {
            name: 'aa',
            url: '...'
        });
        t.assert.ok('called PLATFORM_MISMATCH');
        callback();
    });
    const project = Clone.simple(vanillaProject);
    project.meta.platform = {
        name: 'aa',
        url: '...'
    };
    await vm.loadProject(project);
});

test('deserialize mismatching platform with 3 listeners', (t, done) => {
    t.plan(2);

    const calls = [];
    let expectedToLoad = false;
    const vm = new VM();
    vm.runtime.on('PLATFORM_MISMATCH', (_, callback) => {
        calls.push([1, callback]);
    });
    vm.runtime.on('PLATFORM_MISMATCH', (_, callback) => {
        calls.push([2, callback]);
    });
    vm.runtime.on('PLATFORM_MISMATCH', (_, callback) => {
        calls.push([3, callback]);
    });

    const project = Clone.simple(vanillaProject);
    project.meta.platform = {
        name: ''
    };
    vm.loadProject(project).then(() => {
        t.assert.ok(expectedToLoad);
        done();
    });

    // loadProject is async, may need to wait a bit
    setTimeout(async () => {
        t.assert.deepEqual(calls.map(i => i[0]), [1, 2, 3], 'listeners called in correct order');

        // loadProject should not finish until we call all of the listeners' callbacks
        calls[0][1]();
        await new Promise(resolve => setTimeout(resolve, 100));

        calls[1][1]();
        await new Promise(resolve => setTimeout(resolve, 100));

        expectedToLoad = true;
        calls[2][1]();
    }, 0);
});
