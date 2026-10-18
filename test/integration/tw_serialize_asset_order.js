const fs = require('fs');
const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const JSZip = require('@turbowarp/jszip');
const VM = require('../../src/virtual-machine');
const makeTestStorage = require('../fixtures/make-test-storage');

const fixture = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'tw-serialize-asset-order.sb3'));

test('serializeAssets serialization order', async () => {
    const vm = new VM();
    vm.attachStorage(makeTestStorage());
    await vm.loadProject(fixture);
    const assets = vm.serializeAssets();
    for (let i = 0; i < assets.length; i++) {
        // won't deduplicate assets, so expecting 8 costumes, 7 sounds
        // 8 costumes, 6 sounds
        if (i < 8) {
            assert.ok(assets[i].fileName.endsWith('.svg'), `file ${i + 1} is costume`);
        } else {
            assert.ok(assets[i].fileName.endsWith('.wav'), `file ${i + 1} is sound`);
        }
    }
});

test('saveProjectSb3 serialization order', async () => {
    const vm = new VM();
    vm.attachStorage(makeTestStorage());
    await vm.loadProject(fixture);
    const serialized = await vm.saveProjectSb3('arraybuffer');
    const zip = await JSZip.loadAsync(serialized);
    const files = Object.keys(zip.files);
    for (let i = 0; i < files.length; i++) {
        // 6 costumes, 6 sounds
        if (i === 0) {
            assert.strictEqual(files[i], 'project.json', 'first file is project.json');
        } else if (i < 7) {
            assert.ok(files[i].endsWith('.svg'), `file ${i + 1} is costume`);
        } else {
            assert.ok(files[i].endsWith('.wav'), `file ${i + 1} is sound`);
        }
    }
});

test('exportSprite serialization order', async () => {
    const vm = new VM();
    vm.attachStorage(makeTestStorage());
    await vm.loadProject(fixture);
    const serialized = await vm.exportSprite(vm.runtime.targets[1].id, 'arraybuffer');
    const zip = await JSZip.loadAsync(serialized);
    const files = Object.keys(zip.files);
    for (let i = 0; i < files.length; i++) {
        // 4 costumes, 4 sounds
        if (i === 0) {
            assert.strictEqual(files[i], 'sprite.json', 'first file is sprite.json');
        } else if (i < 5) {
            assert.ok(files[i].endsWith('.svg'), `file ${i + 1} is costume`);
        } else {
            assert.ok(files[i].endsWith('.wav'), `file ${i + 1} is sound`);
        }
    }
});

test('saveProjectSb3DontZip', async () => {
    const vm = new VM();
    vm.attachStorage(makeTestStorage());
    await vm.loadProject(fixture);
    const exported = vm.saveProjectSb3DontZip();
    const files = Object.keys(exported);

    for (let i = 0; i < files.length; i++) {
        // 6 costumes, 6 sounds
        if (i === 0) {
            assert.strictEqual(files[i], 'project.json', 'first file is project.json');
        } else if (i < 7) {
            assert.ok(files[i].endsWith('.svg'), `file ${i + 1} is costume`);
        } else {
            assert.ok(files[i].endsWith('.wav'), `file ${i + 1} is sound`);
        }
    }
});
