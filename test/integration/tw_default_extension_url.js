const {test} = require('node:test');
const assert = require('node:assert');
const VirtualMachine = require('../../src/virtual-machine');

test('Loading project uses default extension URLs', async () => {
    const vm = new VirtualMachine();
    const events = [];
    vm.securityManager.canLoadExtensionFromProject = url => {
        events.push(`canLoadExtensionFromProject ${url}`);
        return true;
    };
    vm.extensionManager.loadExtensionURL = url => {
        events.push(`loadExtensionURL ${url}`);
        return Promise.resolve();
    };

    await vm.loadProject({
        targets: [
            {
                isStage: true,
                name: 'Stage',
                variables: {},
                lists: {},
                broadcasts: {},
                blocks: {
                    a: {
                        opcode: 'text_clearText',
                        next: null,
                        parent: null,
                        inputs: {},
                        fields: {},
                        shadow: false,
                        topLevel: true,
                        x: 203,
                        y: 250
                    },
                    b: {
                        opcode: 'pen_clear',
                        next: null,
                        parent: null,
                        inputs: {},
                        fields: {},
                        shadow: false,
                        topLevel: true,
                        x: 203,
                        y: 250
                    },
                    c: {
                        opcode: 'griffpatch_doTick',
                        next: null,
                        parent: null,
                        inputs: {},
                        fields: {},
                        shadow: false,
                        topLevel: true,
                        x: 203,
                        y: 250
                    }
                },
                comments: {},
                currentCostume: 0,
                costumes: [
                    {
                        assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                        dataFormat: 'svg',
                        md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                        name: 'backdrop1',
                        rotationCenterX: 240,
                        rotationCenterY: 180
                    }
                ],
                sounds: [],
                volume: 100,
                layerOrder: 0,
                tempo: 60,
                videoTransparency: 50,
                videoState: 'on',
                textToSpeechLanguage: null
            }
        ],
        monitors: [],
        extensions: [
            // this list intentionally wrong to make sure we don't rely on its contents
        ],
        extensionURLs: {
            griffpatch: 'https://example.com/box2d.js'
        },
        meta: {
            semver: '3.0.0',
            vm: '0.2.0',
            agent: ''
        }
    });
    assert.deepEqual(events, [
        // All permission checks happen before any extensions are loaded
        'canLoadExtensionFromProject https://extensions.turbowarp.org/lab/text.js',
        'canLoadExtensionFromProject https://example.com/box2d.js',
        'loadExtensionURL https://extensions.turbowarp.org/lab/text.js',
        'loadExtensionURL https://example.com/box2d.js'
    ]);
});
