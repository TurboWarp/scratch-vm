const {test} = require('node:test');
const assert = require('node:assert');
const maybeFormatMessage = require('../../src/util/maybe-format-message');

const nonMessages = [
    'hi',
    42,
    true,
    function () {
        return 'unused';
    },
    {
        a: 1,
        b: 2
    },
    {
        id: 'almost a message',
        notDefault: 'but missing the "default" property'
    },
    {
        notId: 'this one is missing the "id" property',
        default: 'but has "default"'
    }
];

const argsQuick = {
    speed: 'quick'
};

const argsOther = {
    speed: 'slow'
};

const argsEmpty = {};

const simpleMessage = {
    id: 'test.simpleMessage',
    default: 'The quick brown fox jumped over the lazy dog.'
};

const complexMessage = {
    id: 'test.complexMessage',
    default: '{speed, select, quick {The quick brown fox jumped over the lazy dog.} other {Too slow, Gobo!}}'
};

const quickExpectedResult = 'The quick brown fox jumped over the lazy dog.';
const otherExpectedResult = 'Too slow, Gobo!';

test('preserve non-messages', () => {
    for (const x of nonMessages) {
        const result = maybeFormatMessage(x);
        assert.deepStrictEqual(x, result);
    }
});

test('format messages', () => {
    const quickResult1 = maybeFormatMessage(simpleMessage);
    assert.notDeepStrictEqual(quickResult1, simpleMessage);
    assert.deepEqual(quickResult1, quickExpectedResult);

    const quickResult2 = maybeFormatMessage(complexMessage, argsQuick);
    assert.notDeepStrictEqual(quickResult2, complexMessage);
    assert.deepEqual(quickResult2, quickExpectedResult);

    const otherResult1 = maybeFormatMessage(complexMessage, argsOther);
    assert.notDeepStrictEqual(otherResult1, complexMessage);
    assert.deepEqual(otherResult1, otherExpectedResult);

    const otherResult2 = maybeFormatMessage(complexMessage, argsEmpty);
    assert.notDeepStrictEqual(otherResult2, complexMessage);
    assert.deepEqual(otherResult2, otherExpectedResult);
});
