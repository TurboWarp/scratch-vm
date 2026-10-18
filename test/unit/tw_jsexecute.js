const {test} = require('node:test');
const assert = require('node:assert');
const jsexecute = require('../../src/compiler/jsexecute');
const Cast = require('../../src/util/cast');
const {stringify} = require('@turbowarp/json');

const evaluateRuntimeFunction = functionName => jsexecute.scopedEval(functionName);

test('runtimeFunctions are valid', () => {
    for (const functionName of Object.keys(jsexecute.runtimeFunctions)) {
        const fn = evaluateRuntimeFunction(functionName);
        assert.strictEqual(typeof fn, 'function', `${functionName} is function`);
    }
});

test('all runtimeFunctions can be used together', () => {
    const script = Object.keys(jsexecute.runtimeFunctions).join(';');
    jsexecute.scopedEval(script);
});

const VALUES = [
    0,
    -0,
    1,
    '0',
    '',
    '.',
    true,
    false,
    'true',
    'false',
    'true ',
    'apple',
    'Apple',
    'Apple ',
    ' 123',
    ' 123.0',
    '+123.5',
    123,
    0.23,
    '0.23',
    '.23',
    '-.23',
    '0.0',
    NaN,
    'NaN',
    Infinity,
    -Infinity,
    'Infinity',
    '-Infinity',
    '\t',
    '\r\n\u00a0',
    'ÄPFEL',
    'äpfel'
];

test('comparison functions are equivalent to Cast.compare', () => {
    const compareEqual = evaluateRuntimeFunction('compareEqual');
    const compareGreaterThan = evaluateRuntimeFunction('compareGreaterThan');
    const compareLessThan = evaluateRuntimeFunction('compareLessThan');
    for (const a of VALUES) {
        for (const b of VALUES) {
            // Because there are so many tests, asserting each comparison is actually quite slow,
            // so only call into assert when something failed.
            const cast = Cast.compare(a, b);
            if (compareEqual(a, b) !== (cast === 0)) {
                assert.fail(`${stringify(a)} should be === ${stringify(b)}`);
            }
            if (compareGreaterThan(a, b) !== (cast > 0)) {
                assert.fail(`${stringify(a)} should be > ${stringify(b)}`);
            }
            if (compareLessThan(a, b) !== (cast < 0)) {
                assert.fail(`${stringify(a)} should be < ${stringify(b)}`);
            }
        }
    }
});

test('list search functions are equivalent to Cast.compare', () => {
    const listFind = evaluateRuntimeFunction('listFind');
    const listContains = evaluateRuntimeFunction('listContains');
    for (const item of VALUES) {
        // Lists that contain the item at every possible position, and lists that don't contain it at all
        const lists = [VALUES, VALUES.filter(v => Cast.compare(v, item) !== 0), []];
        for (let i = 0; i <= VALUES.length; i++) {
            const list = VALUES.filter(v => Cast.compare(v, item) !== 0);
            list.splice(i, 0, item);
            lists.push(list);
        }
        for (const list of lists) {
            const expected = list.findIndex(v => Cast.compare(v, item) === 0) + 1;
            const actualIndex = listFind(list, item) + 1;
            if (actualIndex !== expected) {
                assert.fail(
                    `index of ${stringify(item)} in ${stringify(list)} should be ${expected}, got ${actualIndex}`
                );
            }
            if (listContains({value: list}, item) !== (expected !== 0)) {
                assert.fail(`${stringify(list)} should ${expected ? '' : 'not '}contain ${stringify(item)}`);
            }
        }
    }
});

test('listGet is equivalent to listIndexSlow', () => {
    const listGet = evaluateRuntimeFunction('listGet');
    const listIndexSlow = evaluateRuntimeFunction('listIndexSlow');
    const list = ['a', 'b', 'c', 4, 5];
    const INDEXES = [...VALUES, 1, 2, 3.7, 5, 6, -1, -0.5, 2 ** 31, (2 ** 32) + 1, -(2 ** 32) + 2, 'last', '3', ' 2 '];
    for (const index of INDEXES) {
        const expectedIndex = listIndexSlow(index, list.length);
        const expected = expectedIndex === -1 ? '' : list[expectedIndex];
        const actual = listGet(list, index);
        if (actual !== expected) {
            assert.fail(`item ${stringify(index)} should be ${stringify(expected)}, got ${stringify(actual)}`);
        }
    }
});

test('listReplace is equivalent to listIndexSlow', () => {
    const listReplace = evaluateRuntimeFunction('listReplace');
    const listIndexSlow = evaluateRuntimeFunction('listIndexSlow');
    const INDEXES = [...VALUES, 1, 2, 3.7, 5, 6, -1, -0.5, 2 ** 31, (2 ** 32) + 1, -(2 ** 32) + 2, 'last', '3', ' 2 '];
    for (const index of INDEXES) {
        const list = {value: ['a', 'b', 'c', 4, 5], _monitorUpToDate: true};
        const expected = ['a', 'b', 'c', 4, 5];
        const expectedIndex = listIndexSlow(index, expected.length);
        if (expectedIndex !== -1) {
            expected[expectedIndex] = 'new';
        }
        listReplace(list, index, 'new');
        if (stringify(list.value) !== stringify(expected)) {
            assert.fail(
                `replacing ${stringify(index)} should give ${stringify(expected)}, got ${stringify(list.value)}`
            );
        }
        if (list._monitorUpToDate !== (expectedIndex === -1)) {
            assert.fail(`replacing ${stringify(index)} should ${expectedIndex === -1 ? 'not ' : ''}update monitor`);
        }
    }
});
