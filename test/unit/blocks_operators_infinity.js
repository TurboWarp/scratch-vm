const {test} = require('node:test');
const assert = require('node:assert');
const Operators = require('../../src/blocks/scratch3_operators');

const blocks = new Operators(null);

test('divide: (1) / (0) = Infinity', () => {
    assert.strictEqual(
        blocks.divide({NUM1: '1', NUM2: '0'}), Infinity, '1 / 0 = Infinity'
    );
});

test('divide: division with Infinity', () => {
    assert.strictEqual(
        blocks.divide({NUM1: 'Infinity', NUM2: 111}), Infinity, '"Infinity" / 111 = Infinity'
    );
    assert.strictEqual(
        blocks.divide({NUM1: 'INFINITY', NUM2: 222}), 0, '"INFINITY" / 222 = 0'
    );
    assert.strictEqual(
        blocks.divide({NUM1: Infinity, NUM2: 333}), Infinity, 'Infinity / 333 = Infinity'
    );

    assert.strictEqual(
        blocks.divide({NUM1: 111, NUM2: 'Infinity'}), 0, '111 / "Infinity" = 0'
    );
    assert.strictEqual(
        blocks.divide({NUM1: 222, NUM2: 'INFINITY'}), Infinity, '222 / "INFINITY" = Infinity'
    );
    assert.strictEqual(
        blocks.divide({NUM1: 333, NUM2: Infinity}), 0, '333 / Infinity = 0'
    );

    assert.strictEqual(
        blocks.divide({NUM1: '-Infinity', NUM2: 111}), -Infinity, '"-Infinity" / 111 = -Infinity'
    );
    assert.strictEqual(
        blocks.divide({NUM1: '-INFINITY', NUM2: 222}), 0, '"-INFINITY" / 222 = 0'
    );
    assert.strictEqual(
        blocks.divide({NUM1: -Infinity, NUM2: 333}), -Infinity, '-Infinity / 333 = -Infinity'
    );

    assert.strictEqual(
        blocks.divide({NUM1: 111, NUM2: '-Infinity'}), -0, '111 / "-Infinity" = -0'
    );
    assert.strictEqual(
        blocks.divide({NUM1: 222, NUM2: '-INFINITY'}), Infinity, '222 / "-INFINITY" = Infinity'
    );
    assert.strictEqual(
        blocks.divide({NUM1: 333, NUM2: -Infinity}), -0, '333 / -Infinity = -0'
    );
});

test('multiply: multiply Infinity with numbers', () => {
    assert.strictEqual(
        blocks.multiply({NUM1: 'Infinity', NUM2: 111}), Infinity, '"Infinity" * 111 = Infinity'
    );
    assert.strictEqual(
        blocks.multiply({NUM1: 'INFINITY', NUM2: 222}), 0, '"INFINITY" * 222 = 0'
    );
    assert.strictEqual(
        blocks.multiply({NUM1: Infinity, NUM2: 333}), Infinity, 'Infinity * 333 = Infinity'
    );
    assert.strictEqual(
        blocks.multiply({NUM1: '-Infinity', NUM2: 111}), -Infinity, '"-Infinity" * 111 = -Infinity'
    );
    assert.strictEqual(
        blocks.multiply({NUM1: '-INFINITY', NUM2: 222}), 0, '"-INFINITY" * 222 = 0'
    );
    assert.strictEqual(
        blocks.multiply({NUM1: -Infinity, NUM2: 333}), -Infinity, '-Infinity * 333 = -Infinity'
    );
    assert.strictEqual(
        blocks.multiply({NUM1: -Infinity, NUM2: Infinity}), -Infinity, '-Infinity * Infinity = -Infinity'
    );
    assert.strictEqual(
        Number.isNaN(blocks.multiply({NUM1: Infinity, NUM2: 0})), true, 'Infinity * 0 = NaN'
    );
});

test('add: add Infinity to a number', () => {

    assert.strictEqual(
        blocks.add({NUM1: 'Infinity', NUM2: 111}), Infinity, '"Infinity" + 111 = Infinity'
    );
    assert.strictEqual(
        blocks.add({NUM1: 'INFINITY', NUM2: 222}), 222, '"INFINITY" + 222 = 222'
    );
    assert.strictEqual(
        blocks.add({NUM1: Infinity, NUM2: 333}), Infinity, 'Infinity + 333 = Infinity'
    );
    assert.strictEqual(
        blocks.add({NUM1: '-Infinity', NUM2: 111}), -Infinity, '"-Infinity" + 111 = -Infinity'
    );
    assert.strictEqual(
        blocks.add({NUM1: '-INFINITY', NUM2: 222}), 222, '"-INFINITY" + 222 = 222'
    );
    assert.strictEqual(
        blocks.add({NUM1: -Infinity, NUM2: 333}), -Infinity, '-Infinity + 333 = -Infinity'
    );
    assert.strictEqual(
        Number.isNaN(blocks.add({NUM1: -Infinity, NUM2: Infinity})), true, '-Infinity + Infinity = NaN'
    );
});

test('subtract: subtract Infinity with a number', () => {

    assert.strictEqual(
        blocks.subtract({NUM1: 'Infinity', NUM2: 111}), Infinity, '"Infinity" - 111 = Infinity'
    );
    assert.strictEqual(
        blocks.subtract({NUM1: 'INFINITY', NUM2: 222}), -222, '"INFINITY" - 222 = -222'
    );
    assert.strictEqual(
        blocks.subtract({NUM1: Infinity, NUM2: 333}), Infinity, 'Infinity - 333 = Infinity'
    );
    assert.strictEqual(
        blocks.subtract({NUM1: 111, NUM2: 'Infinity'}), -Infinity, '111 - "Infinity" = -Infinity'
    );
    assert.strictEqual(
        blocks.subtract({NUM1: 222, NUM2: 'INFINITY'}), 222, '222 - "INFINITY" = 222'
    );
    assert.strictEqual(
        blocks.subtract({NUM1: 333, NUM2: Infinity}), -Infinity, '333 - Infinity = -Infinity'
    );
    assert.strictEqual(
        Number.isNaN(blocks.subtract({NUM1: Infinity, NUM2: Infinity})), true, 'Infinity - Infinity = NaN'
    );
});

test('equals: compare string infinity and numeric Infinity', () => {

    assert.strictEqual(
        blocks.equals({OPERAND1: 'Infinity', OPERAND2: 'INFINITY'}), true, '"Infinity" = "INFINITY"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: 'INFINITY', OPERAND2: 'Infinity'}), true, '"INFINITY" = "Infinity"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: 'Infinity', OPERAND2: 'Infinity'}), true, '"Infinity" = "Infinity"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: 'INFINITY', OPERAND2: 'INFINITY'}), true, '"INFINITY" = "INFINITY"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: 'INFINITY', OPERAND2: 'infinity'}), true, '"INFINITY" = "infinity"'
    );

    assert.strictEqual(
        blocks.equals({OPERAND1: Infinity, OPERAND2: Infinity}), true, 'Infinity = Infinity'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: 'Infinity', OPERAND2: Infinity}), true, '"Infinity" = Infinity'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: 'INFINITY', OPERAND2: Infinity}), true, '"INFINITY" = Infinity'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: Infinity, OPERAND2: 'Infinity'}), true, 'Infinity = "Infinity"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: Infinity, OPERAND2: 'INFINITY'}), true, 'Infinity = "INFINITY'
    );
});

test('equals: compare string negative infinity and numeric negative Infinity', () => {

    assert.strictEqual(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: '-INFINITY'}), true, '"-Infinity" = "-INFINITY"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: '-Infinity'}), true, '"-INFINITY" = "-Infinity"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: '-Infinity'}), true, '"-Infinity" = "-Infinity"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: '-INFINITY'}), true, '"-INFINITY" = "-INFINITY"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: '-infinity'}), true, '"-INFINITY" = "-infinity"'
    );

    assert.strictEqual(
        blocks.equals({OPERAND1: -Infinity, OPERAND2: -Infinity}), true, '-Infinity = -Infinity'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: -Infinity}), true, '"-Infinity" = -Infinity'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: -Infinity}), true, '"-INFINITY" = -Infinity'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: -Infinity, OPERAND2: '-Infinity'}), true, '-Infinity = "-Infinity"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: -Infinity, OPERAND2: '-INFINITY'}), true, '-Infinity = "-INFINITY'
    );
});


test('equals: compare negative to postive string and numeric Infinity', () => {
    assert.strictEqual(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: 'Infinity'}), false, '"-Infinity" != "Infinity"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: 'INFINITY'}), false, '"-infinity" != "INFINITY"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: 'Infinity'}), false, '"-INFINITY" != "Infinity"'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: 'INFINITY'}), false, '"-INFINITY" != "INFINITY"'
    );

    assert.strictEqual(
        blocks.equals({OPERAND1: '-Infinity', OPERAND2: Infinity}), false, '"-Infinity" != Infinity'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: '-INFINITY', OPERAND2: Infinity}), false, '"-INFINITY" != Infinity'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: 'Infinity', OPERAND2: -Infinity}), false, '"Infinity" != -Infinity'
    );
    assert.strictEqual(
        blocks.equals({OPERAND1: 'INFINITY', OPERAND2: -Infinity}), false, '"INFINITY" != -Infinity'
    );

    assert.strictEqual(
        blocks.equals({OPERAND1: Infinity, OPERAND2: -Infinity}), false, 'Infinity != -Infinity'
    );
});

test('less than: compare string infinity and numeric Infinity', () => {

    assert.strictEqual(
        blocks.lt({OPERAND1: 'Infinity', OPERAND2: 'INFINITY'}), false, '"Infinity" !< "INFINITY"'
    );
    assert.strictEqual(
        blocks.lt({OPERAND1: 'INFINITY', OPERAND2: Infinity}), false, '"INFINITY" !< "Infinity"'
    );

    assert.strictEqual(
        blocks.lt({OPERAND1: '-INFINITY', OPERAND2: 'INFINITY'}), true, '"-Infinity" < "INFINITY"'
    );
    assert.strictEqual(
        blocks.lt({OPERAND1: -Infinity, OPERAND2: 'INFINITY'}), true, '-Infinity < "INFINITY"'
    );


    assert.strictEqual(
        blocks.lt({OPERAND1: 'Infinity', OPERAND2: 111}), false, '"Infinity" !< 111'
    );
    assert.strictEqual(
        blocks.lt({OPERAND1: 'INFINITY', OPERAND2: 222}), false, '"INFINITY" !< 222'
    );
    assert.strictEqual(
        blocks.lt({OPERAND1: Infinity, OPERAND2: 333}), false, 'Infinity !< 333'
    );

    assert.strictEqual(
        blocks.lt({OPERAND1: 111, OPERAND2: 'Infinity'}), true, '111 < "Infinity"'
    );
    assert.strictEqual(
        blocks.lt({OPERAND1: 222, OPERAND2: 'INFINITY'}), true, '222 < "INFINITY"'
    );
    assert.strictEqual(
        blocks.lt({OPERAND1: 333, OPERAND2: Infinity}), true, '333 < Infinity'
    );
});

test('more than: compare string infinity and numeric Infinity', () => {

    assert.strictEqual(
        blocks.gt({OPERAND1: 'Infinity', OPERAND2: 'INFINITY'}), false, '"Infinity" !> "INFINITY"'
    );
    assert.strictEqual(
        blocks.gt({OPERAND1: 'INFINITY', OPERAND2: Infinity}), false, '"INFINITY" !> "Infinity"'
    );

    assert.strictEqual(
        blocks.gt({OPERAND1: 'INFINITY', OPERAND2: '-INFINITY'}), true, '"Infinity" < "-INFINITY"'
    );
    assert.strictEqual(
        blocks.gt({OPERAND1: Infinity, OPERAND2: '-INFINITY'}), true, 'Infinity < "-INFINITY"'
    );

    assert.strictEqual(
        blocks.gt({OPERAND1: 'Infinity', OPERAND2: 111}), true, '"Infinity" > 111'
    );
    assert.strictEqual(
        blocks.gt({OPERAND1: 'INFINITY', OPERAND2: 222}), true, '"INFINITY" > 222'
    );
    assert.strictEqual(
        blocks.gt({OPERAND1: Infinity, OPERAND2: 333}), true, 'Infinity > 333'
    );

    assert.strictEqual(
        blocks.gt({OPERAND1: 111, OPERAND2: 'Infinity'}), false, '111 !> "Infinity"'
    );
    assert.strictEqual(
        blocks.gt({OPERAND1: 222, OPERAND2: 'INFINITY'}), false, '222 !> "INFINITY"'
    );
    assert.strictEqual(
        blocks.gt({OPERAND1: 333, OPERAND2: Infinity}), false, '333 !> Infinity'
    );
});
