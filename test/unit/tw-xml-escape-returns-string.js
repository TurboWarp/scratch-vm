const {test} = require('tap');
const xmlEscape = require('../../src/util/xml-escape');

test('xmlEscape always returns a string', t => {
    // Logging errors during this test is expected.
    t.equal(xmlEscape('<< >> "\'&"\'&'), '&lt;&lt; &gt;&gt; &quot;&apos;&amp;&quot;&apos;&amp;');
    t.equal(xmlEscape(null), 'null');
    t.equal(xmlEscape(undefined), 'undefined');
    t.equal(xmlEscape(5), '5');
    t.equal(xmlEscape(true), 'true');
    t.equal(xmlEscape(false), 'false');
    t.equal(xmlEscape(['<', '>']), '&lt;,&gt;');
    t.equal(xmlEscape({a: 'whatever'}), '[object Object]');
    t.end();
});
