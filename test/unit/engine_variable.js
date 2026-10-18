const {test} = require('node:test');
const assert = require('node:assert');
const Variable = require('../../src/engine/variable');
const htmlparser = require('htmlparser2');

test('spec', () => {
    assert.strictEqual(typeof (typeof Variable.SCALAR_TYPE), typeof Variable.LIST_TYPE);
    assert.strictEqual(typeof (typeof Variable.SCALAR_TYPE), typeof Variable.BROADCAST_MESSAGE_TYPE);

    const varId = 'varId';
    const varName = 'varName';
    const varIsCloud = false;
    let v = Variable.create(
        varId,
        varName,
        Variable.SCALAR_TYPE,
        varIsCloud
    );

    assert.strictEqual(typeof Variable, 'function');
    assert.strictEqual(typeof v, 'object');
    assert.ok(v instanceof Variable);

    assert.strictEqual(v.id, varId);
    assert.strictEqual(v.name, varName);
    assert.strictEqual(v.type, Variable.SCALAR_TYPE);
    assert.strictEqual(typeof v.value, 'number');
    assert.strictEqual(v.isCloud, varIsCloud);

    assert.strictEqual(typeof v.toXML, 'function');

    v = Variable.create(
        varId,
        varName,
        Variable.LIST_TYPE,
        varIsCloud
    );
    assert.ok(Array.isArray(v.value));

    v = Variable.create(
        varId,
        varName,
        Variable.BROADCAST_MESSAGE_TYPE,
        varIsCloud
    );
    assert.strictEqual(v.value, 'varName');
});

test('toXML', () => {
    const varId = 'varId';
    const varName = 'varName';
    const varIsCloud = false;
    const varIsLocal = false;
    const v = Variable.create(
        varId,
        varName,
        Variable.SCALAR_TYPE,
        varIsCloud
    );

    const parser = new htmlparser.Parser({
        onopentag: function (name, attribs){
            if (name === 'variable'){
                assert.strictEqual(attribs.type, Variable.SCALAR_TYPE);
                assert.strictEqual(attribs.id, varId);
                assert.strictEqual(attribs.iscloud, varIsCloud.toString());
                assert.strictEqual(attribs.islocal, varIsLocal.toString());
            }
        },
        ontext: function (text){
            assert.strictEqual(text, varName);
        }
    }, {decodeEntities: false});
    parser.write(v.toXML(false));
    parser.end();
});

test('escape variable name for XML', () => {
    const varId = 'varId';
    const varName = '<>&\'"';
    const varIsCloud = false;
    const varIsLocal = false;
    const v = Variable.create(
        varId,
        varName,
        Variable.SCALAR_TYPE,
        varIsCloud
    );

    const parser = new htmlparser.Parser({
        onopentag: function (name, attribs){
            if (name === 'variable'){
                assert.strictEqual(attribs.type, Variable.SCALAR_TYPE);
                assert.strictEqual(attribs.id, varId);
                assert.strictEqual(attribs.iscloud, varIsCloud.toString());
                assert.strictEqual(attribs.islocal, varIsLocal.toString());
            }
        },
        ontext: function (text){
            assert.strictEqual(text, '&lt;&gt;&amp;&apos;&quot;');
        }
    }, {decodeEntities: false});
    parser.write(v.toXML(false));
    parser.end();
});

test('each variable has its own class', () => {
    const a = Variable.create('a', 'a', Variable.SCALAR_TYPE, false);
    const b = Variable.create('b', 'b', Variable.SCALAR_TYPE, false);
    assert.ok(a instanceof Variable);
    assert.ok(b instanceof Variable);
    assert.notStrictEqual(a.constructor, Variable);
    assert.notStrictEqual(a.constructor, b.constructor);
});

test('createSibling shares class with original', () => {
    const a = Variable.create('a', 'a', Variable.LIST_TYPE, false);
    const b = Variable.createSibling(a, 'b', 'b', Variable.LIST_TYPE, false);
    assert.strictEqual(b.constructor, a.constructor);
    assert.strictEqual(b.id, 'b');
    assert.deepEqual(b.value, []);
});

test('lists share one class', () => {
    const a = Variable.create('a', 'a', Variable.LIST_TYPE, false);
    const b = Variable.create('b', 'b', Variable.LIST_TYPE, false);
    const c = Variable.create('c', 'c', Variable.SCALAR_TYPE, false);
    assert.ok(a instanceof Variable);
    assert.notStrictEqual(a.constructor, Variable);
    assert.strictEqual(a.constructor, b.constructor);
    assert.notStrictEqual(a.constructor, c.constructor);
});
