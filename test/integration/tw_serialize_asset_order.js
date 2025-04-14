const fs = require('fs');
const path = require('path');
const {test} = require('tap');
const JSZip = require('@turbowarp/jszip');
const VM = require('../../src/virtual-machine');
const makeTestStorage = require('../fixtures/make-test-storage');

const fixture = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'tw-serialize-asset-order.sb3'));

test('serializeAssets serialization order', t => {
    t.plan(15);
    const vm = new VM();
    vm.attachStorage(makeTestStorage());
    vm.loadProject(fixture).then(() => {
        vm.serializeAssets().then(assets => {
            for (let i = 0; i < assets.length; i++) {
                // won't deduplicate assets, so expecting 8 costumes, 7 sounds
                // 8 costumes, 6 sounds
                if (i < 8) {
                    t.ok(assets[i].fileName.endsWith('.svg'), `file ${i + 1} is costume`);
                } else {
                    t.ok(assets[i].fileName.endsWith('.wav'), `file ${i + 1} is sound`);
                }
            }
            t.end();
        });
    });
});

test('saveProjectSb3 serialization order', t => {
    t.plan(13);
    const vm = new VM();
    vm.attachStorage(makeTestStorage());
    vm.loadProject(fixture).then(() => {
        vm.saveProjectSb3('arraybuffer').then(serialized => {
            JSZip.loadAsync(serialized).then(zip => {
                const files = Object.keys(zip.files);
                for (let i = 0; i < files.length; i++) {
                    // 6 costumes, 6 sounds
                    if (i === 0) {
                        t.equal(files[i], 'project.json', 'first file is project.json');
                    } else if (i < 7) {
                        t.ok(files[i].endsWith('.svg'), `file ${i + 1} is costume`);
                    } else {
                        t.ok(files[i].endsWith('.wav'), `file ${i + 1} is sound`);
                    }
                }
                t.end();
            });
        });
    });
});

test('exportSprite serialization order', t => {
    t.plan(9);
    const vm = new VM();
    vm.attachStorage(makeTestStorage());
    vm.loadProject(fixture).then(() => {
        vm.exportSprite(vm.runtime.targets[1].id, 'arraybuffer').then(serialized => {
            JSZip.loadAsync(serialized).then(zip => {
                const files = Object.keys(zip.files);
                for (let i = 0; i < files.length; i++) {
                    // 4 costumes, 4 sounds
                    if (i === 0) {
                        t.equal(files[i], 'sprite.json', 'first file is sprite.json');
                    } else if (i < 5) {
                        t.ok(files[i].endsWith('.svg'), `file ${i + 1} is costume`);
                    } else {
                        t.ok(files[i].endsWith('.wav'), `file ${i + 1} is sound`);
                    }
                }
                t.end();
            });
        });
    });
});

test('saveProjectSb3DontZip', t => {
    t.plan(13);
    const vm = new VM();
    vm.attachStorage(makeTestStorage());
    vm.loadProject(fixture).then(() => {
        vm.saveProjectSb3DontZip().then(exported => {
            const files = Object.keys(exported);
    
            for (let i = 0; i < files.length; i++) {
                // 6 costumes, 6 sounds
                if (i === 0) {
                    t.equal(files[i], 'project.json', 'first file is project.json');
                } else if (i < 7) {
                    t.ok(files[i].endsWith('.svg'), `file ${i + 1} is costume`);
                } else {
                    t.ok(files[i].endsWith('.wav'), `file ${i + 1} is sound`);
                }
            }
    
            t.end();
        });
    });
});
