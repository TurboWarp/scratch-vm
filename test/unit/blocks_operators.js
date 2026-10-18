const {test} = require('node:test');
const assert = require('node:assert');
const Operators = require('../../src/blocks/scratch3_operators');

const blocks = new Operators(null);

test('getPrimitives', () => {
    assert.strictEqual(typeof blocks.getPrimitives(), 'object');
});

test('add', () => {
    assert.strictEqual(blocks.add({NUM1: '1', NUM2: '1'}), 2);
    assert.strictEqual(blocks.add({NUM1: 'foo', NUM2: 'bar'}), 0);
});

test('subtract', () => {
    assert.strictEqual(blocks.subtract({NUM1: '1', NUM2: '1'}), 0);
    assert.strictEqual(blocks.subtract({NUM1: 'foo', NUM2: 'bar'}), 0);
});

test('multiply', () => {
    assert.strictEqual(blocks.multiply({NUM1: '2', NUM2: '2'}), 4);
    assert.strictEqual(blocks.multiply({NUM1: 'foo', NUM2: 'bar'}), 0);
});

test('divide', () => {
    assert.strictEqual(blocks.divide({NUM1: '2', NUM2: '2'}), 1);
    assert.ok(isNaN(blocks.divide({NUM1: 'foo', NUM2: 'bar'}))); // @todo
});

test('lt', () => {
    assert.strictEqual(blocks.lt({OPERAND1: '1', OPERAND2: '2'}), true);
    assert.strictEqual(blocks.lt({OPERAND1: '2', OPERAND2: '1'}), false);
    assert.strictEqual(blocks.lt({OPERAND1: '1', OPERAND2: '1'}), false);
    assert.strictEqual(blocks.lt({OPERAND1: '10', OPERAND2: '2'}), false);
    assert.strictEqual(blocks.lt({OPERAND1: 'a', OPERAND2: 'z'}), true);
});

test('equals', () => {
    assert.strictEqual(blocks.equals({OPERAND1: '1', OPERAND2: '2'}), false);
    assert.strictEqual(blocks.equals({OPERAND1: '2', OPERAND2: '1'}), false);
    assert.strictEqual(blocks.equals({OPERAND1: '1', OPERAND2: '1'}), true);
    assert.strictEqual(blocks.equals({OPERAND1: 'あ', OPERAND2: 'ア'}), false);
});

test('gt', () => {
    assert.strictEqual(blocks.gt({OPERAND1: '1', OPERAND2: '2'}), false);
    assert.strictEqual(blocks.gt({OPERAND1: '2', OPERAND2: '1'}), true);
    assert.strictEqual(blocks.gt({OPERAND1: '1', OPERAND2: '1'}), false);
});

test('and', () => {
    assert.strictEqual(blocks.and({OPERAND1: true, OPERAND2: true}), true);
    assert.strictEqual(blocks.and({OPERAND1: true, OPERAND2: false}), false);
    assert.strictEqual(blocks.and({OPERAND1: false, OPERAND2: false}), false);
});

test('or', () => {
    assert.strictEqual(blocks.or({OPERAND1: true, OPERAND2: true}), true);
    assert.strictEqual(blocks.or({OPERAND1: true, OPERAND2: false}), true);
    assert.strictEqual(blocks.or({OPERAND1: false, OPERAND2: false}), false);
});

test('not', () => {
    assert.strictEqual(blocks.not({OPERAND: true}), false);
    assert.strictEqual(blocks.not({OPERAND: false}), true);
});

test('random', () => {
    const min = 0;
    const max = 100;
    const result = blocks.random({FROM: min, TO: max});
    assert.ok(result >= min);
    assert.ok(result <= max);
});

test('random - equal', () => {
    const min = 1;
    const max = 1;
    assert.strictEqual(blocks.random({FROM: min, TO: max}), min);
});

test('random - decimal', () => {
    const min = 0.1;
    const max = 10;
    const result = blocks.random({FROM: min, TO: max});
    assert.ok(result >= min);
    assert.ok(result <= max);
});

test('random - int', () => {
    const min = 0;
    const max = 10;
    const result = blocks.random({FROM: min, TO: max});
    assert.ok(result >= min);
    assert.ok(result <= max);
});

test('random - reverse', () => {
    const min = 0;
    const max = 10;
    const result = blocks.random({FROM: max, TO: min});
    assert.ok(result >= min);
    assert.ok(result <= max);
});

test('join', () => {
    assert.strictEqual(blocks.join({STRING1: 'foo', STRING2: 'bar'}), 'foobar');
    assert.strictEqual(blocks.join({STRING1: '1', STRING2: '2'}), '12');
});

test('letterOf', () => {
    assert.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 0}), '');
    assert.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 1}), 'f');
    assert.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 2}), 'o');
    assert.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 3}), 'o');
    assert.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 4}), '');
    assert.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 'bar'}), '');
});

test('length', () => {
    assert.strictEqual(blocks.length({STRING: ''}), 0);
    assert.strictEqual(blocks.length({STRING: 'foo'}), 3);
    assert.strictEqual(blocks.length({STRING: '1'}), 1);
    assert.strictEqual(blocks.length({STRING: '100'}), 3);
});

test('contains', () => {
    assert.strictEqual(blocks.contains({STRING1: 'hello world', STRING2: 'hello'}), true);
    assert.strictEqual(blocks.contains({STRING1: 'foo', STRING2: 'bar'}), false);
    assert.strictEqual(blocks.contains({STRING1: 'HeLLo world', STRING2: 'hello'}), true);
});

test('mod', () => {
    assert.strictEqual(blocks.mod({NUM1: 1, NUM2: 1}), 0);
    assert.strictEqual(blocks.mod({NUM1: 3, NUM2: 6}), 3);
    assert.strictEqual(blocks.mod({NUM1: -3, NUM2: 6}), 3);
});

test('round', () => {
    assert.strictEqual(blocks.round({NUM: 1}), 1);
    assert.strictEqual(blocks.round({NUM: 1.1}), 1);
    assert.strictEqual(blocks.round({NUM: 1.5}), 2);
});

test('mathop', () => {
    assert.strictEqual(blocks.mathop({OPERATOR: 'abs', NUM: -1}), 1);
    assert.strictEqual(blocks.mathop({OPERATOR: 'floor', NUM: 1.5}), 1);
    assert.strictEqual(blocks.mathop({OPERATOR: 'ceiling', NUM: 0.1}), 1);
    assert.strictEqual(blocks.mathop({OPERATOR: 'sqrt', NUM: 1}), 1);
    assert.strictEqual(blocks.mathop({OPERATOR: 'sin', NUM: 1}), 0.0174524064);
    assert.strictEqual(blocks.mathop({OPERATOR: 'sin', NUM: 90}), 1);
    assert.strictEqual(blocks.mathop({OPERATOR: 'cos', NUM: 1}), 0.9998476952);
    assert.strictEqual(blocks.mathop({OPERATOR: 'cos', NUM: 180}), -1);
    assert.strictEqual(blocks.mathop({OPERATOR: 'tan', NUM: 1}), 0.0174550649);
    assert.strictEqual(blocks.mathop({OPERATOR: 'tan', NUM: 90}), Infinity);
    assert.strictEqual(blocks.mathop({OPERATOR: 'tan', NUM: 180}), -0);
    assert.strictEqual(blocks.mathop({OPERATOR: 'asin', NUM: 1}), 90);
    assert.strictEqual(blocks.mathop({OPERATOR: 'acos', NUM: 1}), 0);
    assert.strictEqual(blocks.mathop({OPERATOR: 'atan', NUM: 1}), 45);
    assert.strictEqual(blocks.mathop({OPERATOR: 'ln', NUM: 1}), 0);
    assert.strictEqual(blocks.mathop({OPERATOR: 'log', NUM: 1}), 0);
    assert.strictEqual(blocks.mathop({OPERATOR: 'e ^', NUM: 1}), 2.718281828459045);
    assert.strictEqual(blocks.mathop({OPERATOR: '10 ^', NUM: 1}), 10);
    assert.strictEqual(blocks.mathop({OPERATOR: 'undefined', NUM: 1}), 0);
});
