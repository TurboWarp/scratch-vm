/**
 * This test mocks breaking on loading a corrupted sound.
 * The VM should handle this safely by replacing the sound data with the default (empty) sound,
 * but keeping track of the original sound data and serializing the
 * original sound data back out. The saved project.json should not
 * reflect that the sound is broken and should therefore re-attempt
 * to load the sound if the saved project is re-loaded.
 */
const path = require('path');
const {test, beforeEach} = require('node:test');
const assert = require('node:assert');
const md5 = require('js-md5');
const makeTestStorage = require('../fixtures/make-test-storage');
const {extractAsset, readFileToBuffer} = require('../fixtures/readProjectFile');
const VirtualMachine = require('../../src/index');
const {serializeSounds} = require('../../src/serialization/serialize-assets');

const projectUri = path.resolve(__dirname, '../fixtures/corrupt_sound.sb3');
const project = readFileToBuffer(projectUri);
const soundFileName = '78618aadd225b1db7bf837fa17dc0568.wav';
const originalSound = extractAsset(projectUri, soundFileName);
// We need to get the actual md5 because we hand modified the sound file to corrupt it
// after we downloaded the project from Scratch
// Loading the project back into the VM will correct the assetId and md5
const brokenSoundMd5 = md5(originalSound);

let fakeId = -1;

const FakeAudioEngine = function () {
    return {
        decodeSoundPlayer: soundData => {
            const soundDataString = soundData.asset.decodeText();
            if (soundDataString.includes('here is some')) {
                return Promise.reject(new Error('mock audio engine broke'));
            }

            // Otherwise return fake data
            return Promise.resolve({
                id: fakeId++,
                buffer: {
                    sampleRate: 1,
                    length: 1
                }
            });
        },
        createBank: () => null
    };
};

let vm;
let defaultSoundAssetId;

beforeEach(() => {
    const storage = makeTestStorage();

    vm = new VirtualMachine();
    vm.attachStorage(storage);
    defaultSoundAssetId = vm.runtime.storage.defaultAssetId.Sound;

    vm.attachAudioEngine(FakeAudioEngine());

    return vm.loadProject(project);
});

test('load sb3 project with corrupted sound file', () => {
    assert.strictEqual(vm.runtime.targets.length, 2);

    const stage = vm.runtime.targets[0];
    assert.ok(stage.isStage);

    const catSprite = vm.runtime.targets[1];
    assert.strictEqual(catSprite.getName(), 'Sprite1');
    assert.strictEqual(catSprite.getSounds().length, 1);

    const corruptedSound = catSprite.getSounds()[0];
    assert.strictEqual(corruptedSound.name, 'Boop Sound Recording');
    assert.strictEqual(corruptedSound.assetId, defaultSoundAssetId);
    assert.strictEqual(corruptedSound.dataFormat, 'wav');
    // Runtime should have info about broken asset
    assert.ok(corruptedSound.broken);
    assert.strictEqual(corruptedSound.broken.assetId, brokenSoundMd5);
    // Verify that we saved the original asset data
    assert.strictEqual(md5(corruptedSound.broken.asset.data), brokenSoundMd5);
});

test('load and then save project with corrupted sound file', () => {
    const resavedProject = JSON.parse(vm.toJSON());

    assert.strictEqual(resavedProject.targets.length, 2);

    const stage = resavedProject.targets[0];
    assert.ok(stage.isStage);

    const catSprite = resavedProject.targets[1];
    assert.strictEqual(catSprite.name, 'Sprite1');
    assert.strictEqual(catSprite.sounds.length, 1);

    const corruptedSound = catSprite.sounds[0];
    assert.strictEqual(corruptedSound.name, 'Boop Sound Recording');
    // Resaved project costume should have the metadata that corresponds to the original broken costume
    assert.strictEqual(corruptedSound.assetId, brokenSoundMd5);
    assert.strictEqual(corruptedSound.dataFormat, 'wav');
    // Test that we didn't save any data about the costume being broken
    assert.ok(!corruptedSound.broken);
});

test('serializeSounds saves orignal broken sound', () => {
    const soundDescs = serializeSounds(vm.runtime, vm.runtime.targets[1].id);
    assert.strictEqual(soundDescs.length, 1);
    const sound = soundDescs[0];
    assert.strictEqual(sound.fileName, `${brokenSoundMd5}.wav`);
    assert.strictEqual(md5(sound.fileContent), brokenSoundMd5);
});
