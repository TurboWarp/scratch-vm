const {test} = require('node:test');
const assert = require('node:assert');
const xml = require('../../src/util/xml-escape');

test('escape', () => {
    const input = '<foo bar="he & llo \'"></foo>';
    const output = '&lt;foo bar=&quot;he &amp; llo &apos;&quot;&gt;&lt;/foo&gt;';
    assert.strictEqual(xml(input), output);
});

test('xmlEscape (more)', () => {
    const empty = '';
    assert.strictEqual(xml(empty), empty);

    const safe = 'hello';
    assert.strictEqual(xml(safe), safe);

    const unsafe = '< > & \' "';
    assert.strictEqual(xml(unsafe), '&lt; &gt; &amp; &apos; &quot;');

    const single = '&';
    assert.strictEqual(xml(single), '&amp;');

    const mix = '<a>b& c\'def_-"';
    assert.strictEqual(xml(mix), '&lt;a&gt;b&amp; c&apos;def_-&quot;');

    const dupes = '<<&_"_"_&>>';
    assert.strictEqual(xml(dupes), '&lt;&lt;&amp;_&quot;_&quot;_&amp;&gt;&gt;');

    const emoji = '(>^_^)>';
    assert.strictEqual(xml(emoji), '(&gt;^_^)&gt;');
});

test('xmlEscape should handle non strings', () => {
    const array = ['hello', 'world'];
    assert.strictEqual(xml(array), String(array));

    const arrayWithSpecialChar = ['hello', '<world>'];
    assert.strictEqual(xml(arrayWithSpecialChar), 'hello,&lt;world&gt;');

    const arrayWithNumbers = [1, 2, 3];
    assert.strictEqual(xml(arrayWithNumbers), '1,2,3');

    // Objects shouldn't get provided to replaceUnsafeChars, but in the event
    // they do, it should just return the object (and log an error)
    const object = {hello: 'world'};
    assert.strictEqual(xml(object), object);
});
