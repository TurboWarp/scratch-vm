const {test} = require('node:test');
const assert = require('node:assert');
const StringUtil = require('../../src/util/string-util');

test('caseInsensitiveUnusedName', () => {
    assert.strictEqual(StringUtil.caseInsensitiveUnusedName('test', []), 'test');
    assert.strictEqual(StringUtil.caseInsensitiveUnusedName('test', ['Test']), 'test2');
    assert.strictEqual(StringUtil.caseInsensitiveUnusedName('TEST3', ['test3']), 'TEST2');
    assert.strictEqual(StringUtil.caseInsensitiveUnusedName('TEST', ['test', 'TESt1', 'teST2']), 'TEST3');
});
