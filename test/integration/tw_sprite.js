const {test} = require('tap');
const Sprite = require('../../src/sprites/sprite');
const Runtime = require('../../src/engine/runtime');

test('isLazy === false', t => {
    const sprite = new Sprite(null, new Runtime());
    t.equal(sprite.isLazy, false);
    t.end();
});
