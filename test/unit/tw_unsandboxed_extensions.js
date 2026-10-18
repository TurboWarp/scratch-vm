const {test, beforeEach} = require('node:test');
const assert = require('node:assert');
const UnsandboxedExtensionRunner = require('../../src/extension-support/tw-unsandboxed-extension-runner');
const VirtualMachine = require('../../src/virtual-machine');

// Mock enough of the document API for the extension runner to think it works.
// To more accurately test this, we want to make sure that the URLs we pass in are just strings.
// We use a bit of hacky state here to make our document mock know what function to run
// when a script with a given URL "loads"
const scriptCallbacks = new Map();
const setScript = (src, callback) => {
    scriptCallbacks.set(src, callback);
};
global.document = {
    createElement: tagName => {
        if (tagName.toLowerCase() !== 'script') {
            throw new Error(`Unknown element: ${tagName}`);
        }
        return {
            tagName: 'SCRIPT',
            src: '',
            onload: () => {},
            onerror: () => {}
        };
    },
    body: {
        appendChild: element => {
            if (element.tagName === 'SCRIPT') {
                setTimeout(() => {
                    const callback = scriptCallbacks.get(element.src);
                    if (callback) {
                        callback();
                        element.onload();
                    } else {
                        element.onerror();
                    }
                }, 50);
            }
        }
    }
};

// Mock various DOM APIs for fetching, window opening, redirecting, etc.
global.Request = class {
    constructor (url) {
        this.url = url;
    }
};
global.fetch = (url, options = {}) => (
    Promise.resolve(`[Response ${url instanceof Request ? url.url : url} options=${JSON.stringify(options)}]`)
);
global.window = {
    open: (url, target, features) => `[Window ${url} target=${target || ''} features=${features || ''}]`
};

// Remove navigator object from Node 21 and later
delete global.navigator;

beforeEach(() => {
    scriptCallbacks.clear();
    global.location = {
        href: 'https://example.com/'
    };
});

test('basic API', async t => {
    t.plan(9);
    const vm = new VirtualMachine();
    class MyExtension {}
    setScript('https://turbowarp.org/1.js', () => {
        t.assert.strictEqual(global.Scratch.vm, vm);
        t.assert.strictEqual(global.Scratch.renderer, vm.runtime.renderer);
        t.assert.strictEqual(global.Scratch.extensions.unsandboxed, true);

        // These APIs are tested elsewhere, just make sure they're getting exported
        t.assert.strictEqual(global.Scratch.ArgumentType.NUMBER, 'number');
        t.assert.strictEqual(global.Scratch.BlockType.REPORTER, 'reporter');
        t.assert.strictEqual(global.Scratch.TargetType.SPRITE, 'sprite');
        t.assert.strictEqual(global.Scratch.Cast.toNumber('3.14'), 3.14);

        global.Scratch.extensions.register(new MyExtension());
    });
    const extensions = await UnsandboxedExtensionRunner.load('https://turbowarp.org/1.js', vm);
    t.assert.strictEqual(extensions.length, 1);
    t.assert.ok(extensions[0] instanceof MyExtension);
});

test('multiple VMs loading extensions', async () => {
    const vm1 = new VirtualMachine();
    const vm2 = new VirtualMachine();

    class Extension1 {}
    class Extension2 {}

    let api1 = null;
    setScript('https://turbowarp.org/1.js', async () => {
        // Even if this extension takes a while to register, we should still have our own
        // global.Scratch.
        await new Promise(resolve => setTimeout(resolve, 100));

        if (api1) throw new Error('already ran 1');
        api1 = global.Scratch;
        global.Scratch.extensions.register(new Extension1());
    });

    let api2 = null;
    setScript('https://turbowarp.org/2.js', () => {
        if (api2) throw new Error('already ran 2');
        api2 = global.Scratch;
        global.Scratch.extensions.register(new Extension2());
    });

    const extensions = await Promise.all([
        UnsandboxedExtensionRunner.load('https://turbowarp.org/1.js', vm1),
        UnsandboxedExtensionRunner.load('https://turbowarp.org/2.js', vm2)
    ]);

    assert.notStrictEqual(api1, api2);
    assert.strictEqual(typeof api1.extensions.register, 'function');
    assert.strictEqual(typeof api2.extensions.register, 'function');
    assert.strictEqual(api1.vm, vm1);
    assert.strictEqual(api2.vm, vm2);

    assert.strictEqual(extensions.length, 2);
    assert.strictEqual(extensions[0].length, 1);
    assert.strictEqual(extensions[1].length, 1);
    assert.ok(extensions[0][0] instanceof Extension1);
    assert.ok(extensions[1][0] instanceof Extension2);
});

test('register multiple extensions in one script', async () => {
    const vm = new VirtualMachine();
    class Extension1 {}
    class Extension2 {}
    setScript('https://turbowarp.org/multiple.js', () => {
        global.Scratch.extensions.register(new Extension1());
        global.Scratch.extensions.register(new Extension2());
    });
    const extensions = await UnsandboxedExtensionRunner.load('https://turbowarp.org/multiple.js', vm);
    assert.strictEqual(extensions.length, 2);
    assert.ok(extensions[0] instanceof Extension1);
    assert.ok(extensions[1] instanceof Extension2);
});

test('extension error results in rejection', async () => {
    const vm = new VirtualMachine();
    // The script will not load successfully
    await assert.rejects(UnsandboxedExtensionRunner.load('https://turbowarp.org/404.js', vm));
});

test('ScratchX', async () => {
    const vm = new VirtualMachine();
    setScript('https://turbowarp.org/scratchx.js', () => {
        const ext = {
            test: () => 2
        };
        const descriptor = {
            blocks: [
                ['r', 'test', 'test']
            ]
        };
        global.ScratchExtensions.register('Test', descriptor, ext);
    });
    const extensions = await UnsandboxedExtensionRunner.load('https://turbowarp.org/scratchx.js', vm);
    assert.strictEqual(extensions.length, 1);
    assert.strictEqual(extensions[0].test(), 2);
});

test('canFetch', async () => {
    // see tw_security_manager.js
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    const result = global.Scratch.canFetch('https://example.com/');
    assert.ok(result instanceof Promise);
    assert.strictEqual(await result, true);
});

test('fetch', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    global.Scratch.canFetch = url => url === 'https://example.com/2';
    await assert.rejects(global.Scratch.fetch('https://example.com/1'), /Permission to fetch https:\/\/example.com\/1 rejected/);
    await assert.rejects(global.Scratch.fetch(new Request('https://example.com/1')), /Permission to fetch https:\/\/example.com\/1 rejected/);
    assert.strictEqual(await global.Scratch.fetch('https://example.com/2'), '[Response https://example.com/2 options={}]');
    assert.strictEqual(await global.Scratch.fetch(new Request('https://example.com/2')), '[Response https://example.com/2 options={}]');
    assert.strictEqual(await global.Scratch.fetch('https://example.com/2', {
        redirect: 'follow',
        method: 'POST',
        body: 'abc'
    }), '[Response https://example.com/2 options={"redirect":"follow","method":"POST","body":"abc"}]');
});

test('canOpenWindow', async () => {
    // see tw_security_manager.js
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    const result = global.Scratch.canOpenWindow('https://example.com/');
    assert.ok(result instanceof Promise);
    assert.strictEqual(await result, true);
});

test('openWindow', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    global.Scratch.canOpenWindow = url => url === 'https://example.com/2';
    await assert.rejects(global.Scratch.openWindow('https://example.com/1'), /Permission to open tab https:\/\/example.com\/1 rejected/);
    assert.strictEqual(await global.Scratch.openWindow('https://example.com/2'), '[Window https://example.com/2 target=_blank features=noreferrer]');
    assert.strictEqual(await global.Scratch.openWindow('https://example.com/2', 'popup=1'), '[Window https://example.com/2 target=_blank features=noreferrer,popup=1]');
});

test('canRedirect', async () => {
    // see tw_security_manager.js
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    const result = global.Scratch.canRedirect('https://example.com/');
    assert.ok(result instanceof Promise);
    assert.strictEqual(await result, true);
});

test('redirect', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    global.Scratch.canRedirect = url => url === 'https://example.com/2';
    await assert.rejects(global.Scratch.redirect('https://example.com/1'), /Permission to redirect to https:\/\/example.com\/1 rejected/);
    assert.strictEqual(global.location.href, 'https://example.com/');
    await global.Scratch.redirect('https://example.com/2');
    assert.strictEqual(global.location.href, 'https://example.com/2');
});

test('translate', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    assert.strictEqual(global.Scratch.translate({
        id: 'test1',
        default: 'Message 1: {var}',
        description: 'Description'
    }, {
        var: 'test'
    }), 'Message 1: test');
    assert.strictEqual(global.Scratch.translate('test1 {var}', {
        var: 'ok'
    }), 'test1 ok');
    assert.strictEqual(global.Scratch.translate.language, 'en');

    global.Scratch.translate.setup({
        en: {
            test1: 'EN Message 1: {var}'
        },
        es: {
            test1: 'ES Message 1: {var}'
        }
    });
    assert.strictEqual(global.Scratch.translate({
        id: 'test1',
        default: 'Message 1: {var}',
        description: 'Description'
    }, {
        var: 'test'
    }), 'EN Message 1: test');
    assert.strictEqual(global.Scratch.translate('test1 {var}', {
        var: 'ok'
    }), 'test1 ok');
    assert.strictEqual(global.Scratch.translate.language, 'en');

    await vm.setLocale('es');
    // do not call setup() again; real extensions will not do that.
    // need to make sure that the translatiosn are saved after calling setLocale.
    assert.strictEqual(global.Scratch.translate({
        id: 'test1',
        default: 'Message 1: {var}',
        description: 'Description'
    }, {
        var: 'test'
    }), 'ES Message 1: test');
    assert.strictEqual(global.Scratch.translate.language, 'es');
});

test('canRecordAudio', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canRecordAudio = () => false;
    assert.strictEqual(await global.Scratch.canRecordAudio(), false);

    vm.securityManager.canRecordAudio = () => true;
    assert.strictEqual(await global.Scratch.canRecordAudio(), true);
    
});

test('canRecordVideo', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canRecordVideo = () => false;
    assert.strictEqual(await global.Scratch.canRecordVideo(), false);

    vm.securityManager.canRecordVideo = () => true;
    assert.strictEqual(await global.Scratch.canRecordVideo(), true);
    
});

test('canReadClipboard', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canReadClipboard = () => false;
    assert.strictEqual(await global.Scratch.canReadClipboard(), false);

    vm.securityManager.canReadClipboard = () => true;
    assert.strictEqual(await global.Scratch.canReadClipboard(), true);
    
});

test('canNotify', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canNotify = () => false;
    assert.strictEqual(await global.Scratch.canNotify(), false);

    vm.securityManager.canNotify = () => true;
    assert.strictEqual(await global.Scratch.canNotify(), true);
    
});

test('canGeolocate', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canGeolocate = () => false;
    assert.strictEqual(await global.Scratch.canGeolocate(), false);

    vm.securityManager.canGeolocate = () => true;
    assert.strictEqual(await global.Scratch.canGeolocate(), true);
    
});

test('rewriteExtensionURL', async () => {
    const vm = new VirtualMachine();

    let createdRewrittenExtension = false;
    class RewrittenExtension {
        getInfo () {
            createdRewrittenExtension = true;
            return {
                id: 'extensionid',
                blocks: []
            };
        }
    }
    setScript('https://turbowarp.org/rewritten.js', () => {
        global.Scratch.extensions.register(new RewrittenExtension());
    });

    class OriginalExtension {
        getInfo () {
            assert.fail('Should not create original extension');
            return {
                id: 'extensionid',
                blocks: []
            };
        }
    }
    setScript('https://turbowarp.org/original.js', () => {
        global.Scratch.extensions.register(new OriginalExtension());
    });

    vm.securityManager.getSandboxMode = () => 'unsandboxed';
    vm.securityManager.rewriteExtensionURL = url => {
        if (url === 'https://turbowarp.org/original.js') {
            return 'https://turbowarp.org/rewritten.js';
        }
        return url;
    };

    await vm.extensionManager.loadExtensionURL('https://turbowarp.org/original.js');

    assert.ok(createdRewrittenExtension, 'used rewritten extension');
    assert.ok(vm.extensionManager.isExtensionURLLoaded('https://turbowarp.org/original.js'), 'marks original URL as loaded');
    assert.ok(!vm.extensionManager.isExtensionURLLoaded('https://turbowarp.org/rewritten.js'), 'does not mark new URL as loaded');
});

test('canEmbed', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canEmbed = url => url === 'https://example.com/safe';
    assert.ok(await global.Scratch.canEmbed('https://example.com/safe'));
    assert.ok(!(await global.Scratch.canEmbed('https://example.com/unsafe')));
    
});

test('canDownload', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    const canDownloadChecks = [];
    vm.securityManager.canDownload = (url, name) => {
        canDownloadChecks.push([url, name]);
        return url === 'https://example.com/safe.txt' && name === 'safe.txt';
    };

    assert.ok(await global.Scratch.canDownload('https://example.com/safe.txt', 'safe.txt'));
    assert.ok(!(await global.Scratch.canDownload('https://example.com/unsafe.txt', 'safe.txt')));
    assert.ok(!(await global.Scratch.canDownload('https://example.com/safe.txt', 'unsafe.txt')));
    assert.ok(!(await global.Scratch.canDownload('https://example.com/unsafe.txt', 'unsafe.txt')));

    // Should be rejected without even calling user-provided canDownload.
    // eslint-disable-next-line no-script-url
    assert.ok(!(await global.Scratch.canDownload('javascript:alert(1)', 'index.html')));

    assert.deepEqual(canDownloadChecks, [
        [
            'https://example.com/safe.txt',
            'safe.txt'
        ],
        [
            'https://example.com/unsafe.txt',
            'safe.txt'
        ],
        [
            'https://example.com/safe.txt',
            'unsafe.txt'
        ],
        [
            'https://example.com/unsafe.txt',
            'unsafe.txt'
        ]
    ]);
});

test('download', async () => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    const actualDownloadAttempts = [];
    global.document = {
        createElement: tagName => ({
            tagName,
            click () {
                actualDownloadAttempts.push([
                    this.href,
                    this.download
                ]);
            },
            remove () {}
        }),
        body: {
            appendChild () {}
        }
    };

    const canDownloadChecks = [];
    vm.securityManager.canDownload = (url, name) => {
        canDownloadChecks.push([url, name]);
        return url === 'https://example.com/safe.txt' && name === 'safe.txt';
    };

    await global.Scratch.download('https://example.com/safe.txt', 'safe.txt');
    await assert.rejects(global.Scratch.download('https://example.com/unsafe.txt', 'safe.txt'), /Permission to download/);
    await assert.rejects(global.Scratch.download('https://example.com/safe.txt', 'unsafe.txt'), /Permission to download/);
    await assert.rejects(global.Scratch.download('https://example.com/unsafe.txt', 'unsafe.txt'), /Permission to download/);
    // eslint-disable-next-line no-script-url
    await assert.rejects(global.Scratch.download('javascript:alert(1)', 'safe.txt'), /Permission to download/);

    assert.deepEqual(actualDownloadAttempts, [
        [
            'https://example.com/safe.txt',
            'safe.txt'
        ]
    ]);

    assert.deepEqual(canDownloadChecks, [
        [
            'https://example.com/safe.txt',
            'safe.txt'
        ],
        [
            'https://example.com/unsafe.txt',
            'safe.txt'
        ],
        [
            'https://example.com/safe.txt',
            'unsafe.txt'
        ],
        [
            'https://example.com/unsafe.txt',
            'unsafe.txt'
        ]
    ]);
});

test('CREATE_UNSANDBOXED_EXTENSION_API', () => {
    const vm = new VirtualMachine();
    vm.on('CREATE_UNSANDBOXED_EXTENSION_API', api => {
        api.extraStuff = 'aaaa';
    });
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    assert.strictEqual(global.Scratch.extraStuff, 'aaaa');
});
