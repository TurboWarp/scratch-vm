const {test} = require('node:test');
const assert = require('node:assert');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Sprite = require('../../src/sprites/sprite');
const Runtime = require('../../src/engine/runtime');
const FakeRenderer = require('../fixtures/fake-renderer');

test('clone effects', () => {
    // Create two clones and ensure they have different graphic effect objects.
    // Regression test for Github issue #224
    const r = new Runtime();
    const spr = new Sprite(null, r);
    const a = new RenderedTarget(spr, r);
    const b = new RenderedTarget(spr, r);
    assert.ok(a.effects !== b.effects);
});

test('setxy', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const a = new RenderedTarget(s, r);
    const renderer = new FakeRenderer();
    a.renderer = renderer;
    a.setXY(123, 321, true);
    assert.strictEqual(a.x, 123);
    assert.strictEqual(a.y, 321);
    renderer.getFencedPositionOfDrawable = () => [50, 50];
    a.setXY(100, 100, true);
    assert.strictEqual(a.x, 50);
    assert.strictEqual(a.y, 50);
    r.setRuntimeOptions({
        fencing: false
    });
    a.setXY(100, 100, true);
    assert.strictEqual(a.x, 100);
    assert.strictEqual(a.y, 100);
});

test('blocks get new id on duplicate', async () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const rt = new RenderedTarget(s, r);
    const block = {
        id: 'id1',
        topLevel: true,
        fields: {}
    };

    rt.blocks.createBlock(block);

    const duplicate = await rt.duplicate();
    assert.ok(!Object.prototype.hasOwnProperty.call(duplicate.blocks._blocks, block.id));
});

test('direction', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const a = new RenderedTarget(s, r);
    const renderer = new FakeRenderer();
    a.renderer = renderer;
    a.setDirection(123);
    assert.strictEqual(a._getRenderedDirectionAndScale().direction, 123);
});

test('setVisible', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const a = new RenderedTarget(s, r);
    const renderer = new FakeRenderer();
    a.renderer = renderer;
    a.setVisible(true);
});

test('setSize', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const a = new RenderedTarget(s, r);
    const renderer = new FakeRenderer();
    a.renderer = renderer;
    a.setSize(123);
    assert.strictEqual(a._getRenderedDirectionAndScale().scale[0], 123);
    renderer.getCurrentSkinSize = () => [100, 100];
    a.setSize(99999);
    assert.strictEqual(a._getRenderedDirectionAndScale().scale[0], 540);
    r.setRuntimeOptions({
        fencing: false
    });
    a.setSize(99999);
    assert.strictEqual(a._getRenderedDirectionAndScale().scale[0], 99999);
});

test('set and clear effects', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const a = new RenderedTarget(s, r);
    const renderer = new FakeRenderer();
    a.renderer = renderer;
    for (const effect in a.effects) {
        a.setEffect(effect, 1);
        assert.strictEqual(a.effects[effect], 1);
    }
    a.clearEffects();
    for (const effect in a.effects) {
        assert.strictEqual(a.effects[effect], 0);
    }
});

test('setCostume', () => {
    const o = new Object();
    const r = new Runtime();
    const s = new Sprite(null, r);
    s.costumes = [o];
    const a = new RenderedTarget(s, r);
    const renderer = new FakeRenderer();
    a.renderer = renderer;
    a.setCostume(0);
});

test('deleteCostume', () => {
    const o1 = {id: 1};
    const o2 = {id: 2};
    const o3 = {id: 3};
    const o4 = {id: 4};
    const o5 = {id: 5};

    const r = new Runtime();
    const s = new Sprite(null, r);
    s.costumes = [o1, o2, o3];
    const a = new RenderedTarget(s, r);
    s.clones.push(a);
    const renderer = new FakeRenderer();
    a.renderer = renderer;

    // x* Costume 1        * Costume 2
    //    Costume 2   =>     Costume 3
    //    Costume 3
    a.setCostume(0);
    const deletedCostume = a.deleteCostume(0);
    assert.strictEqual(a.sprite.costumes.length, 2);
    assert.strictEqual(a.sprite.costumes[0].id, 2);
    assert.strictEqual(a.sprite.costumes[1].id, 3);
    assert.strictEqual(a.currentCostume, 0);
    assert.deepEqual(deletedCostume, o1);

    //    Costume 1          Costume 1
    // x* Costume 2   =>   * Costume 3
    //    Costume 3
    a.sprite.costumes = [o1, o2, o3];
    a.setCostume(1);
    const deletedCostume2 = a.deleteCostume(1);
    assert.strictEqual(a.sprite.costumes.length, 2);
    assert.strictEqual(a.sprite.costumes[0].id, 1);
    assert.strictEqual(a.sprite.costumes[1].id, 3);
    assert.strictEqual(a.currentCostume, 1);
    assert.deepEqual(deletedCostume2, o2);

    //    Costume 1          Costume 1
    //    Costume 2   =>   * Costume 2
    // x* Costume 3
    a.sprite.costumes = [o1, o2, o3];
    a.setCostume(2);
    const deletedCostume3 = a.deleteCostume(2);
    assert.strictEqual(a.sprite.costumes.length, 2);
    assert.strictEqual(a.sprite.costumes[0].id, 1);
    assert.strictEqual(a.sprite.costumes[1].id, 2);
    assert.strictEqual(a.currentCostume, 1);
    assert.deepEqual(deletedCostume3, o3);

    // Refuses to delete only costume
    a.sprite.costumes = [o1];
    a.setCostume(0);
    const noDeletedCostume = a.deleteCostume(0);
    assert.strictEqual(a.sprite.costumes.length, 1);
    assert.strictEqual(a.sprite.costumes[0].id, 1);
    assert.strictEqual(a.currentCostume, 0);
    assert.strictEqual(noDeletedCostume, null);

    //   Costume 1          Costume 1
    // x Costume 2          Costume 3
    //   Costume 3   =>   * Costume 4
    // * Costume 4          Costume 5
    //   Costume 5
    a.sprite.costumes = [o1, o2, o3, o4, o5];
    a.setCostume(3);
    a.deleteCostume(1);
    assert.strictEqual(a.sprite.costumes.length, 4);
    assert.strictEqual(a.sprite.costumes[0].id, 1);
    assert.strictEqual(a.sprite.costumes[1].id, 3);
    assert.strictEqual(a.sprite.costumes[2].id, 4);
    assert.strictEqual(a.sprite.costumes[3].id, 5);
    assert.strictEqual(a.currentCostume, 2);

    //   Costume 1          Costume 1
    // * Costume 2        * Costume 2
    //   Costume 3   =>     Costume 3
    // x Costume 4          Costume 5
    //   Costume 5
    a.sprite.costumes = [o1, o2, o3, o4, o5];
    a.setCostume(1);
    a.deleteCostume(3);
    assert.strictEqual(a.sprite.costumes.length, 4);
    assert.strictEqual(a.sprite.costumes[0].id, 1);
    assert.strictEqual(a.sprite.costumes[1].id, 2);
    assert.strictEqual(a.sprite.costumes[2].id, 3);
    assert.strictEqual(a.sprite.costumes[3].id, 5);
    assert.strictEqual(a.currentCostume, 1);

    //   Costume 1          Costume 1
    // * Costume 2        * Costume 2
    //   Costume 3   =>     Costume 3
    //   Costume 4          Costume 4
    // x Costume 5
    a.sprite.costumes = [o1, o2, o3, o4, o5];
    a.setCostume(1);
    a.deleteCostume(4);
    assert.strictEqual(a.sprite.costumes.length, 4);
    assert.strictEqual(a.sprite.costumes[0].id, 1);
    assert.strictEqual(a.sprite.costumes[1].id, 2);
    assert.strictEqual(a.sprite.costumes[2].id, 3);
    assert.strictEqual(a.sprite.costumes[3].id, 4);
    assert.strictEqual(a.currentCostume, 1);
});

test('deleteSound', () => {
    const o1 = {id: 1};
    const o2 = {id: 2};
    const o3 = {id: 3};

    const r = new Runtime();
    const s = new Sprite(null, r);
    s.sounds = [o1, o2, o3];
    const a = new RenderedTarget(s, r);
    const renderer = new FakeRenderer();
    a.renderer = renderer;

    const firstDeleted = a.deleteSound(0);
    assert.deepEqual(a.sprite.sounds, [o2, o3]);
    assert.deepEqual(firstDeleted, o1);

    // Allows deleting the only sound
    a.sprite.sounds = [o1];
    a.deleteSound(0);
    assert.deepEqual(a.sprite.sounds, []);
});

test('setRotationStyle', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const a = new RenderedTarget(s, r);
    const renderer = new FakeRenderer();
    a.renderer = renderer;
    a.setRotationStyle(RenderedTarget.ROTATION_STYLE_NONE);
});

test('getBounds', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const renderer = new FakeRenderer();
    r.attachRenderer(renderer);
    const a = new RenderedTarget(s, r);
    a.renderer = renderer;
    assert.strictEqual(a.getBounds().top, 0);
    a.setXY(241, 241);
    assert.strictEqual(a.getBounds().top, 241);
});

test('isTouchingPoint', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const renderer = new FakeRenderer();
    r.attachRenderer(renderer);
    const a = new RenderedTarget(s, r);
    a.renderer = renderer;
    assert.strictEqual(a.isTouchingPoint(), true);
});

test('isTouchingEdge', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const renderer = new FakeRenderer();
    r.attachRenderer(renderer);
    const a = new RenderedTarget(s, r);
    a.renderer = renderer;
    assert.strictEqual(a.isTouchingEdge(), false);
    a.setXY(1000, 1000);
    assert.strictEqual(a.isTouchingEdge(), true);
});

test('isTouchingSprite', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const renderer = new FakeRenderer();
    r.attachRenderer(renderer);
    const a = new RenderedTarget(s, r);
    a.renderer = renderer;
    assert.strictEqual(a.isTouchingSprite('fake'), false);
});

test('isTouchingColor', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const renderer = new FakeRenderer();
    r.attachRenderer(renderer);
    const a = new RenderedTarget(s, r);
    a.renderer = renderer;
    assert.strictEqual(a.isTouchingColor(), false);
});

test('colorIsTouchingColor', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const renderer = new FakeRenderer();
    r.attachRenderer(renderer);
    const a = new RenderedTarget(s, r);
    a.renderer = renderer;
    assert.strictEqual(a.colorIsTouchingColor(), false);
});

test('layers', () => { // TODO this tests fake functionality. Move layering tests into Render.
    const r = new Runtime();
    const s = new Sprite(null, r);
    const renderer = new FakeRenderer();
    const o = new Object();
    r.attachRenderer(renderer);
    const a = new RenderedTarget(s, r);
    a.renderer = renderer;
    a.goToFront();
    assert.strictEqual(a.renderer.order, 5);
    a.goBackwardLayers(2);
    assert.strictEqual(a.renderer.order, 3);
    a.goToBack();
    // Note, there are only sprites in this test, no stage, and the addition
    // of layer groups, goToBack no longer specifies a minimum order number
    assert.strictEqual(a.renderer.order, 0);
    a.goForwardLayers(1);
    assert.strictEqual(a.renderer.order, 1);
    o.drawableID = 999;
    a.goBehindOther(o);
    assert.strictEqual(a.renderer.order, 1);
});

test('getLayerOrder returns result of renderer getDrawableOrder or null if renderer is not attached', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const a = new RenderedTarget(s, r);

    // getLayerOrder should return null if there is no renderer attached to the runtime
    assert.strictEqual(a.getLayerOrder(), null);

    const renderer = new FakeRenderer();
    r.attachRenderer(renderer);
    const b = new RenderedTarget(s, r);

    assert.strictEqual(b.getLayerOrder(), 'stub');
});

test('keepInFence', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const renderer = new FakeRenderer();
    r.attachRenderer(renderer);
    const a = new RenderedTarget(s, r);
    a.renderer = renderer;
    assert.strictEqual(a.keepInFence(1000, 1000)[0], 240);
    assert.strictEqual(a.keepInFence(-1000, 1000)[0], -240);
    assert.strictEqual(a.keepInFence(1000, 1000)[1], 180);
    assert.strictEqual(a.keepInFence(1000, -1000)[1], -180);
});

test('#stopAll clears graphics effects', () => {
    const r = new Runtime();
    const s = new Sprite(null, r);
    const a = new RenderedTarget(s, r);
    const effectName = 'brightness';
    a.setEffect(effectName, 100);
    a.onStopAll();
    assert.strictEqual(a.effects[effectName], 0);
});

test('#getCostumes returns the costumes', () => {
    const r = new Runtime();
    const spr = new Sprite(null, r);
    const a = new RenderedTarget(spr, r);
    a.sprite.costumes = [{id: 1}, {id: 2}, {id: 3}];
    assert.strictEqual(a.getCostumes().length, 3);
    assert.strictEqual(a.getCostumes()[0].id, 1);
    assert.strictEqual(a.getCostumes()[1].id, 2);
    assert.strictEqual(a.getCostumes()[2].id, 3);
});

test('#getSounds returns the sounds', () => {
    const r = new Runtime();
    const spr = new Sprite(null, r);
    const a = new RenderedTarget(spr, r);
    const sounds = [1, 2, 3];
    a.sprite.sounds = sounds;
    assert.strictEqual(a.getSounds(), sounds);
});

test('#toJSON returns the sounds and costumes', () => {
    const r = new Runtime();
    const spr = new Sprite(null, r);
    const a = new RenderedTarget(spr, r);
    const sounds = [1, 2, 3];
    a.sprite.sounds = sounds;
    a.sprite.costumes = [{id: 1}, {id: 2}, {id: 3}];
    assert.deepEqual(a.toJSON().sounds, sounds);
    assert.deepEqual(a.toJSON().costumes, a.sprite.costumes);
});

test('#addSound does not duplicate names', () => {
    const r = new Runtime();
    const spr = new Sprite(null, r);
    const a = new RenderedTarget(spr, r);
    a.sprite.sounds = [{name: 'first'}];
    a.addSound({name: 'first'});
    assert.deepEqual(a.sprite.sounds, [{name: 'first'}, {name: 'first2'}]);
});

test('#addCostume does not duplicate names', () => {
    const r = new Runtime();
    const spr = new Sprite(null, r);
    const a = new RenderedTarget(spr, r);
    a.addCostume({name: 'first'});
    a.addCostume({name: 'first'});
    assert.strictEqual(a.sprite.costumes.length, 2);
    assert.strictEqual(a.sprite.costumes[0].name, 'first');
    assert.strictEqual(a.sprite.costumes[1].name, 'first2');
});

test('#renameSound does not duplicate names', () => {
    const r = new Runtime();
    const spr = new Sprite(null, r);
    const a = new RenderedTarget(spr, r);
    a.sprite.sounds = [{name: 'first'}, {name: 'second'}];
    a.renameSound(0, 'first'); // Shouldn't increment the name, noop
    assert.deepEqual(a.sprite.sounds, [{name: 'first'}, {name: 'second'}]);
    a.renameSound(1, 'first');
    assert.deepEqual(a.sprite.sounds, [{name: 'first'}, {name: 'first2'}]);
});

test('#renameCostume does not duplicate names', () => {
    const r = new Runtime();
    const spr = new Sprite(null, r);
    const a = new RenderedTarget(spr, r);
    a.sprite.costumes = [{name: 'first'}, {name: 'second'}];
    a.renameCostume(0, 'first'); // Shouldn't increment the name, noop
    assert.strictEqual(a.sprite.costumes.length, 2);
    assert.strictEqual(a.sprite.costumes[0].name, 'first');
    assert.strictEqual(a.sprite.costumes[1].name, 'second');
    a.renameCostume(1, 'first');
    assert.strictEqual(a.sprite.costumes.length, 2);
    assert.strictEqual(a.sprite.costumes[0].name, 'first');
    assert.strictEqual(a.sprite.costumes[1].name, 'first2');
});

test('#reorderCostume', () => {
    const o1 = {id: 0};
    const o2 = {id: 1};
    const o3 = {id: 2};
    const o4 = {id: 3};
    const o5 = {id: 4};
    const r = new Runtime();
    const s = new Sprite(null, r);
    s.costumes = [o1, o2, o3, o4, o5];
    const a = new RenderedTarget(s, r);
    const renderer = new FakeRenderer();
    a.renderer = renderer;

    const resetCostumes = () => {
        a.setCostume(0);
        s.costumes = [o1, o2, o3, o4, o5];
    };
    const costumeIds = () => a.sprite.costumes.map(c => c.id);

    resetCostumes();
    assert.deepEqual(costumeIds(), [0, 1, 2, 3, 4]);
    assert.strictEqual(a.currentCostume, 0);

    // Returns false if the costumes are the same and no change occurred
    assert.strictEqual(a.reorderCostume(3, 3), false);
    assert.strictEqual(a.reorderCostume(999, 5000), false); // Clamped to the same values.
    assert.strictEqual(a.reorderCostume(-999, -5000), false);

    // Make sure reordering up and down works and current costume follows
    resetCostumes();
    assert.strictEqual(a.reorderCostume(0, 3), true);
    assert.deepEqual(costumeIds(), [1, 2, 3, 0, 4]);
    assert.strictEqual(a.currentCostume, 3); // Index of id=0

    resetCostumes();
    a.setCostume(1);
    assert.strictEqual(a.reorderCostume(3, 1), true);
    assert.deepEqual(costumeIds(), [0, 3, 1, 2, 4]);
    assert.strictEqual(a.currentCostume, 2); // Index of id=1

    // Out of bounds indices get clamped
    resetCostumes();
    assert.strictEqual(a.reorderCostume(10, 0), true);
    assert.deepEqual(costumeIds(), [4, 0, 1, 2, 3]);
    assert.strictEqual(a.currentCostume, 1); // Index of id=0

    resetCostumes();
    assert.strictEqual(a.reorderCostume(2, -1000), true);
    assert.deepEqual(costumeIds(), [2, 0, 1, 3, 4]);
    assert.strictEqual(a.currentCostume, 1); // Index of id=0
});

test('#reorderSound', () => {
    const o1 = {id: 0, name: 'name0'};
    const o2 = {id: 1, name: 'name1'};
    const o3 = {id: 2, name: 'name2'};
    const o4 = {id: 3, name: 'name3'};
    const o5 = {id: 4, name: 'name4'};
    const r = new Runtime();
    const s = new Sprite(null, r);
    s.sounds = [o1, o2, o3, o4, o5];
    const a = new RenderedTarget(s, r);
    const renderer = new FakeRenderer();
    a.renderer = renderer;

    const resetSounds = () => {
        s.sounds = [o1, o2, o3, o4, o5];
    };
    const soundIds = () => a.sprite.sounds.map(c => c.id);

    resetSounds();
    assert.deepEqual(soundIds(), [0, 1, 2, 3, 4]);

    // Return false if indices are the same and no change occurred.
    assert.strictEqual(a.reorderSound(3, 3), false);
    assert.strictEqual(a.reorderSound(100000, 99999), false); // Clamped to the same values
    assert.strictEqual(a.reorderSound(-100000, -99999), false);

    // Make sure reordering up and down works and current sound follows
    resetSounds();
    assert.strictEqual(a.reorderSound(0, 3), true);
    assert.deepEqual(soundIds(), [1, 2, 3, 0, 4]);

    resetSounds();
    assert.strictEqual(a.reorderSound(3, 1), true);
    assert.deepEqual(soundIds(), [0, 3, 1, 2, 4]);

    // Out of bounds indices get clamped
    resetSounds();
    assert.strictEqual(a.reorderSound(10, 0), true);
    assert.deepEqual(soundIds(), [4, 0, 1, 2, 3]);

    resetSounds();
    assert.strictEqual(a.reorderSound(2, -1000), true);
    assert.deepEqual(soundIds(), [2, 0, 1, 3, 4]);
});
