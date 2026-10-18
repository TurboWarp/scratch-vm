const {test} = require('node:test');
const assert = require('node:assert');
require('../fixtures/tw_mock_blob'); // must load Blob before VM so JSZip thinks Blob is supported
const fs = require('fs');
const pathUtil = require('path');
const VirtualMachine = require('../../src/virtual-machine');
const makeTestStorage = require('../fixtures/make-test-storage');
const JSZip = require('@turbowarp/jszip');

const fixture = fs.readFileSync(pathUtil.join(__dirname, '..', 'fixtures', 'tw-save-project-sb3.sb3'));

test('saveProjectSb3', async () => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());
    await vm.loadProject(fixture);

    // Test that it defaults to Blob
    // Note: we use a mock implementation of Blob in tests
    const blob = await vm.saveProjectSb3();
    assert.ok(blob instanceof Blob);

    const buffer = await vm.saveProjectSb3('arraybuffer');
    assert.ok(buffer instanceof ArrayBuffer);

    const base64 = await vm.saveProjectSb3('base64');
    assert.strictEqual(typeof base64, 'string');

    const zip = await JSZip.loadAsync(buffer);
    assert.strictEqual((await zip.file('project.json').async('string'))[0], '{');
    assert.strictEqual((await zip.file('d9c625ae1996b615a146ac2a7dbe74d7.svg').async('uint8array')).byteLength, 691);
    assert.strictEqual((await zip.file('cd21514d0531fdffb22204e0ec5ed84a.svg').async('uint8array')).byteLength, 202);
});

test('saveProjectSb3Stream', async t => {
    t.plan(6);

    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());
    await vm.loadProject(fixture);

    let receivedDataEvent = false;
    const stream = vm.saveProjectSb3Stream();
    stream.on('data', data => {
        if (receivedDataEvent) {
            return;
        }
        receivedDataEvent = true;
        t.assert.ok(data instanceof Uint8Array);
    });
    stream.resume();
    const buffer = await stream.accumulate();
    t.assert.ok(buffer instanceof ArrayBuffer);

    const stream2 = vm.saveProjectSb3Stream('uint8array');
    const uint8array = await stream2.accumulate();
    t.assert.ok(uint8array instanceof Uint8Array);

    const zip = await JSZip.loadAsync(buffer);
    t.assert.strictEqual((await zip.file('project.json').async('string'))[0], '{');
    t.assert.strictEqual((await zip.file('d9c625ae1996b615a146ac2a7dbe74d7.svg').async('uint8array')).byteLength, 691);
    t.assert.strictEqual((await zip.file('cd21514d0531fdffb22204e0ec5ed84a.svg').async('uint8array')).byteLength, 202);
});

test('saveProjectSb3DontZip', async () => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());
    await vm.loadProject(fixture);

    const map = vm.saveProjectSb3DontZip();
    assert.strictEqual(map['project.json'][0], '{'.charCodeAt(0));
    assert.strictEqual(map['d9c625ae1996b615a146ac2a7dbe74d7.svg'].byteLength, 691);
    assert.strictEqual(map['cd21514d0531fdffb22204e0ec5ed84a.svg'].byteLength, 202);

    // Make sure that the asset buffers returned are the exact same as the ones used internally, not copies.
    const costume = vm.runtime.targets[0].getCostumes()[0];
    assert.strictEqual(map['cd21514d0531fdffb22204e0ec5ed84a.svg'], costume.asset.data);
});
