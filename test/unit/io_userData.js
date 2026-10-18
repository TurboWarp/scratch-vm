const {test} = require('node:test');
const assert = require('node:assert');
const UserData = require('../../src/io/userData');

test('spec', () => {
    const userData = new UserData();

    assert.strictEqual(typeof userData, 'object');
    assert.strictEqual(typeof userData.postData, 'function');
    assert.strictEqual(typeof userData.getUsername, 'function');
});

test('getUsername returns empty string initially', () => {
    const userData = new UserData();

    assert.strictEqual(userData.getUsername(), '');
});

test('postData sets the username', () => {
    const userData = new UserData();
    userData.postData({username: 'TEST'});
    assert.strictEqual(userData.getUsername(), 'TEST');
});
