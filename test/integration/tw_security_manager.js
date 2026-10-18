const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const VirtualMachine = require('../../src/virtual-machine');
const {setupUnsandboxedExtensionAPI} = require('../../src/extension-support/tw-unsandboxed-extension-runner');

const testProject = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'tw-project-with-extensions.sb3'));

// The test project contains two extensions: a fetch one and a bitwise one.
const FETCH_EXTENSION = 'https://extensions.turbowarp.org/fetch.js';
const BITWISE_EXTENSION = 'https://extensions.turbowarp.org/bitwise.js';

/* eslint-disable no-script-url */
/* eslint-disable require-await */

test('Deny both extensions', async () => {
    const vm = new VirtualMachine();
    vm.extensionManager.loadExtensionURL = () => {
        assert.fail();
    };
    vm.securityManager.canLoadExtensionFromProject = () => false;
    // loadProject() should fail because extensions were denied, not because one was loaded
    await assert.rejects(vm.loadProject(testProject), e => !(e instanceof assert.AssertionError));
});

test('Deny 1 of 2 extensions', async () => {
    const vm = new VirtualMachine();
    vm.extensionManager.loadExtensionURL = () => {
        assert.fail();
    };
    vm.securityManager.canLoadExtensionFromProject = url => Promise.resolve(url === FETCH_EXTENSION);
    // loadProject() should fail because extensions were denied, not because one was loaded
    await assert.rejects(vm.loadProject(testProject), e => !(e instanceof assert.AssertionError));
});

test('Allow both extensions', async () => {
    const vm = new VirtualMachine();
    const loadedExtensions = [];
    vm.extensionManager.loadExtensionURL = url => {
        loadedExtensions.push(url);
        return Promise.resolve();
    };
    vm.securityManager.canLoadExtensionFromProject = url => {
        if (url === FETCH_EXTENSION) {
            return true;
        }
        if (url === BITWISE_EXTENSION) {
            return Promise.resolve(true);
        }
        assert.fail('unknown extension');
    };
    await vm.loadProject(testProject);
    assert.deepEqual(new Set(loadedExtensions), new Set([FETCH_EXTENSION, BITWISE_EXTENSION]));
});

test('canFetch', async () => {
    const vm = new VirtualMachine();
    setupUnsandboxedExtensionAPI(vm);
    global.location = {
        href: 'https://example.com/'
    };

    // data: and blob: are always allowed, shouldn't call security manager
    vm.securityManager.canFetch = () => assert.fail('security manager should be ignored for these protocols');
    assert.strictEqual(await global.Scratch.canFetch('data:text/html,test'), true);
    assert.strictEqual(await global.Scratch.canFetch('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), true);

    vm.securityManager.canFetch = () => false;
    assert.strictEqual(await global.Scratch.canFetch('file:///etc/hosts'), false);
    assert.strictEqual(await global.Scratch.canFetch('http://example.com/'), false);
    assert.strictEqual(await global.Scratch.canFetch('https://example.com/'), false);
    assert.strictEqual(await global.Scratch.canFetch('null'), false);
    assert.strictEqual(await global.Scratch.canFetch(null), false);

    vm.securityManager.canFetch = () => Promise.resolve(false);
    assert.strictEqual(await global.Scratch.canFetch('file:///etc/hosts'), false);
    assert.strictEqual(await global.Scratch.canFetch('http://example.com/'), false);
    assert.strictEqual(await global.Scratch.canFetch('https://example.com/'), false);
    assert.strictEqual(await global.Scratch.canFetch('boring.html'), false);
    assert.strictEqual(await global.Scratch.canFetch('null'), false);
    assert.strictEqual(await global.Scratch.canFetch(null), false);

    vm.securityManager.canFetch = () => true;
    assert.strictEqual(await global.Scratch.canFetch('file:///etc/hosts'), true);
    assert.strictEqual(await global.Scratch.canFetch('http://example.com/'), true);
    assert.strictEqual(await global.Scratch.canFetch('https://example.com/'), true);
    assert.strictEqual(await global.Scratch.canFetch('boring.html'), true);
    assert.strictEqual(await global.Scratch.canFetch('null'), true);
    assert.strictEqual(await global.Scratch.canFetch(null), true);

    const calledWithURLs = [];
    vm.securityManager.canFetch = async url => {
        calledWithURLs.push(url);
        return url === 'https://example.com/null';
    };
    assert.strictEqual(await global.Scratch.canFetch('file:///etc/hosts'), false);
    assert.strictEqual(await global.Scratch.canFetch('http://example.com/'), false);
    assert.strictEqual(await global.Scratch.canFetch('https://example.com/null'), true);
    assert.strictEqual(await global.Scratch.canFetch('null'), true);
    assert.strictEqual(await global.Scratch.canFetch(null), true);
    assert.deepEqual(calledWithURLs, [
        'file:///etc/hosts',
        'http://example.com/',
        'https://example.com/null',
        'https://example.com/null',
        'https://example.com/null'
    ]);
});

test('canOpenWindow', async () => {
    const vm = new VirtualMachine();
    setupUnsandboxedExtensionAPI(vm);
    global.location = {
        href: 'https://example.com/'
    };

    // javascript: should never be allowed, shouldn't call security manager
    vm.securityManager.canOpenWindow = () => assert.fail('should not call security manager for javascript:');
    assert.strictEqual(await global.Scratch.canOpenWindow('javascript:alert(1)'), false);
    
    vm.securityManager.canOpenWindow = () => false;
    assert.strictEqual(await global.Scratch.canOpenWindow('data:text/html,test'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('file:///etc/hosts'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('https://example.com/'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('index.html'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow(null), false);

    vm.securityManager.canOpenWindow = () => Promise.resolve(false);
    assert.strictEqual(await global.Scratch.canOpenWindow('data:text/html,test'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('file:///etc/hosts'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('https://example.com/'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('index.html'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow(null), false);

    vm.securityManager.canOpenWindow = () => true;
    assert.strictEqual(await global.Scratch.canOpenWindow('data:text/html,test'), true);
    assert.strictEqual(await global.Scratch.canOpenWindow('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), true);
    assert.strictEqual(await global.Scratch.canOpenWindow('file:///etc/hosts'), true);
    assert.strictEqual(await global.Scratch.canOpenWindow('https://example.com/'), true);
    assert.strictEqual(await global.Scratch.canOpenWindow('index.html'), true);
    assert.strictEqual(await global.Scratch.canOpenWindow(null), true);

    const calledWithURLs = [];
    vm.securityManager.canOpenWindow = async url => {
        calledWithURLs.push(url);
        return url === 'file:///etc/hosts';
    };
    assert.strictEqual(await global.Scratch.canOpenWindow('data:text/html,test'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('file:///etc/hosts'), true);
    assert.strictEqual(await global.Scratch.canOpenWindow('https://example.com/'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow('index.html'), false);
    assert.strictEqual(await global.Scratch.canOpenWindow(null), false);
    assert.deepEqual(calledWithURLs, [
        'data:text/html,test',
        'blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd',
        'file:///etc/hosts',
        'https://example.com/',
        'https://example.com/index.html',
        'https://example.com/null'
    ]);
});

test('canRedirect', async () => {
    const vm = new VirtualMachine();
    setupUnsandboxedExtensionAPI(vm);
    global.location = {
        href: 'https://example.com/'
    };

    // javascript: should never be allowed, shouldn't call security manager
    vm.securityManager.canRedirect = () => assert.fail('should not call security manager for javascript:');
    assert.strictEqual(await global.Scratch.canRedirect('javascript:alert(1)'), false);

    vm.securityManager.canRedirect = () => false;
    assert.strictEqual(await global.Scratch.canRedirect('data:text/html,test'), false);
    assert.strictEqual(await global.Scratch.canRedirect('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    assert.strictEqual(await global.Scratch.canRedirect('file:///etc/hosts'), false);
    assert.strictEqual(await global.Scratch.canRedirect('https://example.com/'), false);
    assert.strictEqual(await global.Scratch.canRedirect('index.html'), false);
    assert.strictEqual(await global.Scratch.canRedirect(null), false);

    vm.securityManager.canRedirect = () => Promise.resolve(false);
    assert.strictEqual(await global.Scratch.canRedirect('data:text/html,test'), false);
    assert.strictEqual(await global.Scratch.canRedirect('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    assert.strictEqual(await global.Scratch.canRedirect('file:///etc/hosts'), false);
    assert.strictEqual(await global.Scratch.canRedirect('https://example.com/'), false);
    assert.strictEqual(await global.Scratch.canRedirect('index.html'), false);
    assert.strictEqual(await global.Scratch.canRedirect(null), false);

    vm.securityManager.canRedirect = () => true;
    assert.strictEqual(await global.Scratch.canRedirect('data:text/html,test'), true);
    assert.strictEqual(await global.Scratch.canRedirect('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), true);
    assert.strictEqual(await global.Scratch.canRedirect('file:///etc/hosts'), true);
    assert.strictEqual(await global.Scratch.canRedirect('https://example.com/'), true);
    assert.strictEqual(await global.Scratch.canRedirect('index.html'), true);
    assert.strictEqual(await global.Scratch.canRedirect(null), true);

    const calledWithURLs = [];
    vm.securityManager.canRedirect = async url => {
        calledWithURLs.push(url);
        return url === 'file:///etc/hosts';
    };
    assert.strictEqual(await global.Scratch.canRedirect('data:text/html,test'), false);
    assert.strictEqual(await global.Scratch.canRedirect('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    assert.strictEqual(await global.Scratch.canRedirect('file:///etc/hosts'), true);
    assert.strictEqual(await global.Scratch.canRedirect('https://example.com/'), false);
    assert.strictEqual(await global.Scratch.canRedirect('index.html'), false);
    assert.strictEqual(await global.Scratch.canRedirect(null), false);
    assert.deepEqual(calledWithURLs, [
        'data:text/html,test',
        'blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd',
        'file:///etc/hosts',
        'https://example.com/',
        'https://example.com/index.html',
        'https://example.com/null'
    ]);
});

test('canEmbed', async () => {
    const vm = new VirtualMachine();
    setupUnsandboxedExtensionAPI(vm);
    global.location = {
        href: 'https://example.com/'
    };

    const calledWithURLs = [];
    vm.securityManager.canEmbed = async url => {
        calledWithURLs.push(url);
        return url === 'https://example.com/ok';
    };

    assert.strictEqual(await global.Scratch.canEmbed('https://example.com/ok'), true);
    assert.strictEqual(await global.Scratch.canEmbed('https://example.com/bad'), false);
    assert.strictEqual(await global.Scratch.canEmbed('file:///etc/hosts'), false);
    assert.strictEqual(await global.Scratch.canEmbed('data:text/html;,<h1>test</h1>'), false);
    assert.strictEqual(await global.Scratch.canEmbed('ok'), true);
    assert.deepEqual(calledWithURLs, [
        'https://example.com/ok',
        'https://example.com/bad',
        'file:///etc/hosts',
        'data:text/html;,<h1>test</h1>',
        'https://example.com/ok'
    ]);
});

test('canDownload', async () => {
    const vm = new VirtualMachine();
    setupUnsandboxedExtensionAPI(vm);

    const calledWithArguments = [];
    vm.securityManager.canDownload = async (url, name) => {
        calledWithArguments.push([url, name]);
        return name.includes('safe');
    };

    assert.strictEqual(await global.Scratch.canDownload('http://example.com/', 'safe.html'), true);
    assert.strictEqual(await global.Scratch.canDownload('http://example.com/', 'dangerous.html'), false);

    // should not even call security manager
    assert.strictEqual(await global.Scratch.canDownload('javascript:alert(1)', 'safe.html'), false);

    assert.deepEqual(calledWithArguments, [
        ['http://example.com/', 'safe.html'],
        ['http://example.com/', 'dangerous.html']
    ]);
});
