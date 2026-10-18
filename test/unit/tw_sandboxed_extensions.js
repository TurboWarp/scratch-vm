const {test} = require('node:test');
const assert = require('node:assert');

global.Request = class {
    constructor (url) {
        this.url = url;
    }
};
global.fetch = (url, options = {}) => (
    Promise.resolve(`[Response ${url instanceof Request ? url.url : url} options=${JSON.stringify(options)}]`)
);

// Remove navigator object from Node 21 and later
delete global.navigator;

// Need to trick the extension API to think it's running in a worker
// It will not actually use this object ever.
global.self = {};
// This will install extension worker APIs onto `global`
require('../../src/extension-support/extension-worker');

test('basic API', () => {
    assert.strictEqual(typeof global.Scratch.extensions.register, 'function');
    assert.strictEqual(global.Scratch.ArgumentType.BOOLEAN, 'Boolean');
    assert.strictEqual(global.Scratch.BlockType.REPORTER, 'reporter');
});

test('not unsandboxed', () => {
    assert.notStrictEqual(global.Scratch.extensions.unsandboxed, true);
});

test('Cast', () => {
    // Cast is thoroughly tested elsewhere
    assert.strictEqual(global.Scratch.Cast.toString(5), '5');
    assert.strictEqual(global.Scratch.Cast.toNumber(' 5'), 5);
    assert.strictEqual(global.Scratch.Cast.toBoolean('true'), true);
});

test('fetch', async () => {
    assert.strictEqual(await global.Scratch.canFetch('https://untrusted.example/'), true);
    assert.strictEqual(await global.Scratch.fetch('https://untrusted.example/'), '[Response https://untrusted.example/ options={}]');
    assert.strictEqual(await global.Scratch.fetch('https://untrusted.example/', {
        method: 'POST'
    }), `[Response https://untrusted.example/ options={"method":"POST"}]`);
});

test('openWindow', async () => {
    assert.strictEqual(await global.Scratch.canOpenWindow('https://example.com/'), false);
    await assert.rejects(global.Scratch.openWindow('https://example.com/'), {
        message: /^Scratch\.openWindow not supported in sandboxed extensions$/
    });
});

test('redirect', async () => {
    assert.strictEqual(await global.Scratch.canRedirect('https://example.com/'), false);
    await assert.rejects(global.Scratch.redirect('https://example.com/'), {
        message: /^Scratch\.redirect not supported in sandboxed extensions$/
    });
});

test('translate', () => {
    assert.strictEqual(global.Scratch.translate({
        id: 'test1',
        default: 'Message 1: {var}',
        description: 'Description'
    }, {
        var: 'test'
    }), 'Message 1: test');
    assert.strictEqual(global.Scratch.translate('test1'), 'test1');
    assert.strictEqual(global.Scratch.translate('test1 {VAR}', {
        VAR: '3'
    }), 'test1 3');
    assert.strictEqual(global.Scratch.translate.language, 'en');

    const messages = {
        en: {
            test1: 'EN Message 1: {var}'
        },
        es: {
            test1: 'ES Message 1: {var}'
        }
    };

    // Should default to English when no navigator object
    global.Scratch.translate.setup(messages);
    assert.strictEqual(global.Scratch.translate({
        id: 'test1',
        default: 'Message 1',
        description: 'Description'
    }, {
        var: 'ok'
    }), 'EN Message 1: ok');
    assert.strictEqual(global.Scratch.translate.language, 'en');

    // But if there is a navigator object, it should use its language.
    global.navigator = {
        language: 'es'
    };
    // Note that real extensions will only generally call setup() once, but we need to do this
    // again so that it realizes the language changed.
    global.Scratch.translate.setup(messages);
    assert.strictEqual(global.Scratch.translate({
        id: 'test1',
        default: 'Message 1',
        description: 'Description'
    }, {
        var: 'ok'
    }), 'ES Message 1: ok');
    assert.strictEqual(global.Scratch.translate.language, 'es');
});

test('canRecordAudio', async () => {
    assert.strictEqual(await global.Scratch.canRecordAudio(), false);
});

test('canRecordVideo', async () => {
    assert.strictEqual(await global.Scratch.canRecordVideo(), false);
});

test('canReadClipboard', async () => {
    assert.strictEqual(await global.Scratch.canReadClipboard(), false);
});

test('canNotify', async () => {
    assert.strictEqual(await global.Scratch.canNotify(), false);
});

test('canGeolocate', async () => {
    assert.strictEqual(await global.Scratch.canGeolocate(), false);
});

test('canEmbed', async () => {
    assert.strictEqual(await global.Scratch.canEmbed('https://example.com/'), false);
});

test('canDownload', async () => {
    assert.strictEqual(await global.Scratch.canDownload('https://example.com/test.sb3', 'test.sb3'), false);
});

test('download', async () => {
    await assert.rejects(global.Scratch.download('https://turbowarp.org/', 'index.html'), /not supported in sandboxed extension/);
});
