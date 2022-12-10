const tap = require('tap');
const UnsandboxedExtensionRunner = require('../../src/extension-support/tw-unsandboxed-extension-runner');

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

const mockVM = () => ({
    runtime: {
        renderer: {}
    }
});

tap.afterEach(() => {
    scriptCallbacks.clear();
});

const {test} = tap;

test('basic API', async t => {
    t.plan(9);
    const vm = mockVM();
    class MyExtension {}
    setScript('https://turbowarp.org/1.js', () => {
        t.equal(global.Scratch.vm, vm);
        t.equal(global.Scratch.renderer, vm.runtime.renderer);
        t.equal(global.Scratch.extensions.unsandboxed, true);

        // These APIs are tested elsewhere, just make sure they're getting exported
        t.equal(global.Scratch.ArgumentType.NUMBER, 'number');
        t.equal(global.Scratch.BlockType.REPORTER, 'reporter');
        t.equal(global.Scratch.TargetType.SPRITE, 'sprite');
        t.equal(global.Scratch.Cast.toNumber('3.14'), 3.14);

        global.Scratch.extensions.register(new MyExtension());
    });
    const extensions = await UnsandboxedExtensionRunner.load('https://turbowarp.org/1.js', vm);
    t.equal(extensions.length, 1);
    t.ok(extensions[0] instanceof MyExtension);
    t.end();
});

test('multiple VMs loading extensions', async t => {
    const vm1 = mockVM();
    const vm2 = mockVM();

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

    t.not(api1, api2);
    t.type(api1.extensions.register, 'function');
    t.type(api2.extensions.register, 'function');
    t.equal(api1.vm, vm1);
    t.equal(api2.vm, vm2);

    t.equal(extensions.length, 2);
    t.equal(extensions[0].length, 1);
    t.equal(extensions[1].length, 1);
    t.ok(extensions[0][0] instanceof Extension1);
    t.ok(extensions[1][0] instanceof Extension2);

    t.end();
});

test('register multiple extensions in one script', async t => {
    const vm = mockVM();
    class Extension1 {}
    class Extension2 {}
    setScript('https://turbowarp.org/multiple.js', () => {
        global.Scratch.extensions.register(new Extension1());
        global.Scratch.extensions.register(new Extension2());
    });
    const extensions = await UnsandboxedExtensionRunner.load('https://turbowarp.org/multiple.js', vm);
    t.equal(extensions.length, 2);
    t.ok(extensions[0] instanceof Extension1);
    t.ok(extensions[1] instanceof Extension2);
    t.end();
});

test('extension error results in rejection', async t => {
    const vm = mockVM();
    try {
        await UnsandboxedExtensionRunner.load('https://turbowarp.org/404.js', vm);
        // Above should throw an error as the script will not load successfully
        t.fail();
    } catch (e) {
        t.pass();
    }
    t.end();
});

test('ScratchX', async t => {
    const vm = mockVM();
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
    t.equal(extensions.length, 1);
    t.equal(extensions[0].test(), 2);
    t.end();
});
