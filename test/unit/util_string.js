const {test} = require('node:test');
const assert = require('node:assert');
const StringUtil = require('../../src/util/string-util');

test('splitFirst', () => {
    assert.deepEqual(StringUtil.splitFirst('asdf.1234', '.'), ['asdf', '1234']);
    assert.deepEqual(StringUtil.splitFirst('asdf.', '.'), ['asdf', '']);
    assert.deepEqual(StringUtil.splitFirst('.1234', '.'), ['', '1234']);
    assert.deepEqual(StringUtil.splitFirst('foo', '.'), ['foo', null]);
});

test('withoutTrailingDigits', () => {
    assert.strictEqual(StringUtil.withoutTrailingDigits('boeing747'), 'boeing');
    assert.strictEqual(StringUtil.withoutTrailingDigits('boeing747 '), 'boeing747 ');
    assert.strictEqual(StringUtil.withoutTrailingDigits('boeing𝟨'), 'boeing𝟨');
    assert.strictEqual(StringUtil.withoutTrailingDigits('boeing 747'), 'boeing ');
    assert.strictEqual(StringUtil.withoutTrailingDigits('747'), '');
});

test('unusedName', () => {
    assert.strictEqual(
        StringUtil.unusedName(
            'name',
            ['not the same name']
        ),
        'name'
    );
    assert.strictEqual(
        StringUtil.unusedName(
            'name',
            ['name']
        ),
        'name2'
    );
    assert.strictEqual(
        StringUtil.unusedName(
            'name',
            ['name30']
        ),
        'name'
    );
    assert.strictEqual(
        StringUtil.unusedName(
            'name',
            ['name', 'name2']
        ),
        'name3'
    );
    assert.strictEqual(
        StringUtil.unusedName(
            'name',
            ['name', 'name3']
        ),
        'name2'
    );
    assert.strictEqual(
        StringUtil.unusedName(
            'boeing747',
            ['boeing747']
        ),
        'boeing2' // Yup, this matches scratch-flash...
    );
});

test('stringify', () => {
    const obj = {
        a: Infinity,
        b: NaN,
        c: -Infinity,
        d: 23,
        e: 'str',
        f: {
            nested: Infinity
        }
    };
    const parsed = JSON.parse(StringUtil.stringify(obj));
    assert.strictEqual(parsed.a, 0);
    assert.strictEqual(parsed.b, 0);
    assert.strictEqual(parsed.c, 0);
    assert.strictEqual(parsed.d, 23);
    assert.strictEqual(parsed.e, 'str');
    assert.strictEqual(parsed.f.nested, 0);
});

test('replaceUnsafeChars', () => {
    const empty = '';
    assert.strictEqual(StringUtil.replaceUnsafeChars(empty), empty);

    const safe = 'hello';
    assert.strictEqual(StringUtil.replaceUnsafeChars(safe), safe);

    const unsafe = '< > & \' "';
    assert.strictEqual(StringUtil.replaceUnsafeChars(unsafe), 'lt gt amp apos quot');

    const single = '&';
    assert.strictEqual(StringUtil.replaceUnsafeChars(single), 'amp');

    const mix = '<a>b& c\'def_-"';
    assert.strictEqual(StringUtil.replaceUnsafeChars(mix), 'ltagtbamp caposdef_-quot');

    const dupes = '<<&_"_"_&>>';
    assert.strictEqual(StringUtil.replaceUnsafeChars(dupes), 'ltltamp_quot_quot_ampgtgt');

    const emoji = '(>^_^)>';
    assert.strictEqual(StringUtil.replaceUnsafeChars(emoji), '(gt^_^)gt');
});

test('replaceUnsafeChars should handle non strings', () => {
    const array = ['hello', 'world'];
    assert.strictEqual(StringUtil.replaceUnsafeChars(array), String(array));

    const arrayWithSpecialChar = ['hello', '<world>'];
    assert.strictEqual(StringUtil.replaceUnsafeChars(arrayWithSpecialChar), 'hello,ltworldgt');

    const arrayWithNumbers = [1, 2, 3];
    assert.strictEqual(StringUtil.replaceUnsafeChars(arrayWithNumbers), '1,2,3');

    // Objects shouldn't get provided to replaceUnsafeChars, but in the event
    // they do, it should just return the object (and log an error)
    const object = {hello: 'world'};
    assert.strictEqual(StringUtil.replaceUnsafeChars(object), object);
});
