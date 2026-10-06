const crypto = require('crypto');
const {test} = require('tap');
const JSZip = require('@turbowarp/jszip');
const VirtualMachine = require('../../src/virtual-machine');
const FakeRenderer = require('../fixtures/fake-renderer');
const makeTestStorage = require('../fixtures/make-test-storage');

const md5 = buffer => crypto.createHash('md5')
    .update(buffer)
    .digest('hex');

const SVG = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>';
const SVG_MD5 = md5(SVG);
const WAV = 'RIFF fake wav data';
const WAV_MD5 = md5(WAV);

const makeCostume = name => ({
    name,
    assetId: SVG_MD5,
    md5ext: `${SVG_MD5}.svg`,
    dataFormat: 'svg',
    bitmapResolution: 1,
    rotationCenterX: 5,
    rotationCenterY: 5
});

const makeSound = name => ({
    name,
    assetId: WAV_MD5,
    md5ext: `${WAV_MD5}.wav`,
    dataFormat: 'wav',
    format: '',
    rate: 44100,
    sampleCount: 100
});

const makeSprite = (name, extra) => Object.assign({
    isStage: false,
    name,
    variables: {},
    lists: {},
    broadcasts: {},
    blocks: {},
    comments: {},
    currentCostume: 0,
    costumes: [],
    sounds: [],
    volume: 100,
    visible: true,
    x: 0,
    y: 0,
    size: 100,
    direction: 90,
    draggable: false,
    rotationStyle: 'all around'
}, extra);

const makeProjectZip = () => {
    const projectJson = {
        targets: [
            makeSprite('Stage', {
                isStage: true,
                costumes: [makeCostume('backdrop1')],
                layerOrder: 0
            }),
            makeSprite('Sprite1', {
                costumes: [makeCostume('costume1'), makeCostume('costume2')],
                sounds: [makeSound('sound1'), makeSound('sound2')],
                layerOrder: 1
            })
        ],
        monitors: [],
        extensions: [],
        meta: {
            semver: '3.0.0',
            vm: '0.2.0',
            agent: ''
        }
    };
    const zip = new JSZip();
    zip.file('project.json', JSON.stringify(projectJson));
    zip.file(`${SVG_MD5}.svg`, SVG);
    zip.file(`${WAV_MD5}.wav`, WAV);
    return zip.generateAsync({type: 'arraybuffer'});
};

class FakeSoundBank {
    constructor () {
        this.soundPlayers = {};
        this.removedSounds = [];
        this.disposed = false;
    }
    addSoundPlayer (soundPlayer) {
        this.soundPlayers[soundPlayer.id] = soundPlayer;
    }
    removeSoundPlayer (soundId) {
        this.removedSounds.push(soundId);
        delete this.soundPlayers[soundId];
    }
    stopAllSounds () {}
    setEffects () {}
    dispose () {
        this.disposed = true;
    }
}

class FakeAudioEngine {
    constructor () {
        this.decodedSounds = 0;
    }
    createBank () {
        return new FakeSoundBank();
    }
    decodeSoundPlayer () {
        this.decodedSounds++;
        return Promise.resolve({
            id: `player${this.decodedSounds}`,
            buffer: {
                sampleRate: 44100,
                length: 100
            },
            connect: () => {},
            stop: () => {},
            dispose: () => {}
        });
    }
}

const makeVM = async () => {
    const vm = new VirtualMachine();
    const renderer = new FakeRenderer();
    renderer.destroyedSkins = [];
    renderer.destroySkin = skinId => renderer.destroyedSkins.push(skinId);
    renderer.destroyDrawable = () => {};
    vm.attachRenderer(renderer);
    vm.attachAudioEngine(new FakeAudioEngine());
    vm.attachStorage(makeTestStorage());
    await vm.loadProject(await makeProjectZip());
    return vm;
};

test('deleting a costume destroys its skin; restoring re-creates it', async t => {
    const vm = await makeVM();
    const target = vm.runtime.getSpriteTargetByName('Sprite1');
    const sprite = target.sprite;
    vm.editingTarget = target;

    const clone = target.makeClone();
    vm.runtime.addTarget(clone);
    clone.setCostume(1);

    const costume = sprite.costumes[1];
    const skinId = costume.skinId;
    t.type(skinId, 'number', 'costume has a skin');

    const restore = vm.deleteCostume(1);
    t.same(sprite.costumes.map(c => c.name), ['costume1'], 'costume removed');
    t.ok(vm.runtime.renderer.destroyedSkins.includes(skinId), 'skin destroyed');
    t.equal(clone.currentCostume, 0, 'clone switched costume');

    await restore();
    t.same(sprite.costumes.map(c => c.name), ['costume1', 'costume2'], 'costume restored');
    t.type(sprite.costumes[1].skinId, 'number', 'restored costume has a new skin');

    t.end();
});

test('deleting a sound disposes its player; restoring re-decodes it', async t => {
    const vm = await makeVM();
    const target = vm.runtime.getSpriteTargetByName('Sprite1');
    const sprite = target.sprite;
    vm.editingTarget = target;

    const sound = sprite.sounds[0];
    const soundId = sound.soundId;
    t.type(soundId, 'string', 'sound has a player');

    const restore = vm.deleteSound(0);
    t.same(sprite.sounds.map(s => s.name), ['sound2'], 'sound removed');
    t.same(sprite.soundBank.removedSounds, [soundId], 'player removed from the bank');

    await restore();
    t.same(sprite.sounds.map(s => s.name), ['sound2', 'sound1'], 'sound restored');
    const restored = sprite.sounds[1];
    t.type(restored.soundId, 'string', 'restored sound has a player');
    t.ok(sprite.soundBank.soundPlayers[restored.soundId], 'player is in the bank');

    t.end();
});

test('reordering sounds does not dispose their players', async t => {
    const vm = await makeVM();
    const target = vm.runtime.getSpriteTargetByName('Sprite1');
    const sprite = target.sprite;

    target.reorderSound(0, 1);
    t.same(sprite.sounds.map(s => s.name), ['sound2', 'sound1'], 'sounds reordered');
    t.same(sprite.soundBank.removedSounds, [], 'no players disposed');

    t.end();
});

test('deleting a sprite frees all of its resources, including with clones', async t => {
    const vm = await makeVM();
    const target = vm.runtime.getSpriteTargetByName('Sprite1');
    const sprite = target.sprite;

    vm.runtime.addTarget(target.makeClone());
    vm.runtime.addTarget(target.makeClone());
    t.equal(sprite.clones.length, 3, 'sprite has clones');

    const skinIds = sprite.costumes.map(c => c.skinId);
    const soundBank = sprite.soundBank;

    vm.deleteSprite(target.id);
    t.ok(vm.runtime.targets.every(t2 => t2.sprite !== sprite), 'all clones are disposed');
    for (const skinId of skinIds) {
        t.ok(vm.runtime.renderer.destroyedSkins.includes(skinId), `skin ${skinId} destroyed`);
    }
    t.ok(soundBank.disposed, 'sound bank disposed');

    t.end();
});

test('loading a new project frees the resources of the previous one', async t => {
    const vm = await makeVM();
    const skinIds = [];
    for (const target of vm.runtime.targets) {
        for (const costume of target.sprite.costumes) {
            skinIds.push(costume.skinId);
        }
    }
    const soundBank = vm.runtime.getSpriteTargetByName('Sprite1').sprite.soundBank;
    t.ok(skinIds.length >= 3, 'previous project had skins');

    await vm.loadProject(await makeProjectZip());
    for (const skinId of skinIds) {
        t.ok(vm.runtime.renderer.destroyedSkins.includes(skinId), `skin ${skinId} destroyed`);
    }
    t.ok(soundBank.disposed, 'sound bank disposed');

    t.end();
});

test('restoring a costume that has no md5', async t => {
    const vm = await makeVM();
    const target = vm.runtime.getSpriteTargetByName('Sprite1');
    const sprite = target.sprite;
    vm.editingTarget = target;

    await vm.addCostume(`${SVG_MD5}.svg`, {
        name: 'library',
        asset: sprite.costumes[0].asset,
        bitmapResolution: 1,
        rotationCenterX: 5,
        rotationCenterY: 5
    });
    t.notOk(sprite.costumes[2].md5, 'costume has no md5');

    const restore = vm.deleteCostume(2);
    await restore();
    t.same(sprite.costumes.map(c => c.name), ['costume1', 'costume2', 'library'], 'costume restored');

    t.end();
});

test('restoring after the sprite is deleted does not leak', async t => {
    const vm = await makeVM();
    const target = vm.runtime.getSpriteTargetByName('Sprite1');
    const sprite = target.sprite;
    vm.editingTarget = target;

    const deletedCostume = sprite.costumes[1];
    const oldSkinId = deletedCostume.skinId;
    const restoreCostume = vm.deleteCostume(1);
    const deletedSound = sprite.sounds[1];
    const restoreSound = vm.deleteSound(1);
    const costumePromise = restoreCostume();
    const soundPromise = restoreSound();
    const soundBank = sprite.soundBank;
    vm.deleteSprite(target.id);
    await costumePromise;
    await soundPromise;

    t.same(sprite.costumes, [], 'costume not added to deleted sprite');
    t.same(sprite.sounds, [], 'sound not added to deleted sprite');
    t.not(deletedCostume.skinId, oldSkinId, 'restore created a new skin');
    t.ok(vm.runtime.renderer.destroyedSkins.includes(deletedCostume.skinId), 'new skin destroyed');
    t.ok(soundBank.removedSounds.includes(deletedSound.soundId), 'restored player removed from bank');

    t.end();
});

test('deleting the editing sprite while it has clones', async t => {
    const vm = await makeVM();
    const stage = vm.runtime.getTargetForStage();
    const target = vm.runtime.getSpriteTargetByName('Sprite1');
    vm.setEditingTarget(target.id);
    vm.runtime.addTarget(target.makeClone());

    vm.deleteSprite(target.id);
    t.equal(vm.editingTarget, stage, 'editing target moved to the stage');

    t.end();
});

test('deleting a sprite does not modify previously returned costume or sound lists', async t => {
    const vm = await makeVM();
    const target = vm.runtime.getSpriteTargetByName('Sprite1');
    const costumes = target.getCostumes();
    const sounds = target.getSounds();

    vm.deleteSprite(target.id);
    t.equal(costumes.length, 2);
    t.equal(sounds.length, 2);

    t.end();
});
