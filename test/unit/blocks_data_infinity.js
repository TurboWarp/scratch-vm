const {test} = require('node:test');
const assert = require('node:assert');
const Data = require('../../src/blocks/scratch3_data');

const blocks = new Data();

const lists = {};
const util = {
    target: {
        lookupOrCreateList (id, name) {
            if (!(name in lists)) {
                lists[name] = {value: []};
            }
            return lists[name];
        }
    }
};

test('List with postive infinity primitive contains postive infinity', () => {
    lists.list = {value: [Infinity]};
    let args = {ITEM: Infinity, LIST: {name: 'list'}};
    let contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '[Infinity] contains Infinity');

    lists.list = {value: [Infinity]};
    args = {ITEM: 'Infinity', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '[Infinity] contains "Infinity"');

    lists.list = {value: [Infinity]};
    args = {ITEM: 'INFINITY', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '[Infinity] contains "INFINITY"');

    lists.list = {value: ['Infinity']};
    args = {ITEM: Infinity, LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["Infinity"] contains Infinity');

    lists.list = {value: ['Infinity']};
    args = {ITEM: 'Infinity', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["Infinity"] contains "Infinity"');

    lists.list = {value: ['Infinity']};
    args = {ITEM: 'INFINITY', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["Infinity"] contains "INFINITY"');

    lists.list = {value: ['INFINITY']};
    args = {ITEM: Infinity, LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["INFINITY"] contains Infinity');

    lists.list = {value: ['INFINITY']};
    args = {ITEM: 'Infinity', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["INFINITY"] contains "Infinity"');

    lists.list = {value: ['INFINITY']};
    args = {ITEM: 'INFINITY', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["INFINITY"] contains "INFINITY"');
});

test('List with negative infinity primitive contains negative infinity', () => {
    lists.list = {value: [-Infinity]};
    let args = {ITEM: -Infinity, LIST: {name: 'list'}};
    let contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '[-Infinity] contains -Infinity');

    lists.list = {value: [-Infinity]};
    args = {ITEM: '-Infinity', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '[-Infinity] contains "-Infinity"');

    lists.list = {value: [-Infinity]};
    args = {ITEM: '-INFINITY', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '[-Infinity] contains "-INFINITY"');

    lists.list = {value: ['-Infinity']};
    args = {ITEM: -Infinity, LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["-Infinity"] contains -Infinity');

    lists.list = {value: ['-Infinity']};
    args = {ITEM: '-Infinity', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["-Infinity"] contains "-Infinity"');

    lists.list = {value: ['-Infinity']};
    args = {ITEM: '-INFINITY', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["-Infinity"] contains "-INFINITY"');

    lists.list = {value: ['-INFINITY']};
    args = {ITEM: -Infinity, LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["-INFINITY"] contains -Infinity');

    lists.list = {value: ['-INFINITY']};
    args = {ITEM: '-Infinity', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["-INFINITY"] contains "-Infinity"');

    lists.list = {value: ['-INFINITY']};
    args = {ITEM: '-INFINITY', LIST: {name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    assert.strictEqual(contains, true, '["-INFINITY"] contains "-INFINITY"');
});
