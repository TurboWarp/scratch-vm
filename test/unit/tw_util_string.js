const {test} = require('tap');
const StringUtil = require('../../src/util/string-util');

test('caseInsensitiveUnusedName', t => {
    t.equal(StringUtil.caseInsensitiveUnusedName('test', []), 'test');
    t.equal(StringUtil.caseInsensitiveUnusedName('test', ['Test']), 'test2');
    t.equal(StringUtil.caseInsensitiveUnusedName('TEST3', ['test3']), 'TEST2');
    t.equal(StringUtil.caseInsensitiveUnusedName('TEST', ['test', 'TESt1', 'teST2']), 'TEST3');
    t.end();
});
