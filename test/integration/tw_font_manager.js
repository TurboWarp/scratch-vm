const fs = require('fs');
const path = require('path');
const {test} = require('node:test');
const assert = require('node:assert');
const _makeTestStorage = require('../fixtures/make-test-storage');
const Runtime = require('../../src/engine/runtime');
const VirtualMachine = require('../../src/virtual-machine');

const emptyProjectFixture = path.join(__dirname, '..', 'fixtures', 'tw-empty-project.sb3');

const makeTestStorage = () => {
    const storage = _makeTestStorage();
    storage.DataFormat.TTF = 'ttf';
    storage.AssetType.Font = {
        contentType: 'font/ttf',
        name: 'Font',
        runtimeFormat: storage.DataFormat.TTF,
        immutable: true
    };
    return storage;
};

test('isValidSystemFont', () => {
    const {fontManager} = new Runtime();
    assert.ok(fontManager.isValidSystemFont('Roboto'));
    assert.ok(fontManager.isValidSystemFont('sans-serif'));
    assert.ok(fontManager.isValidSystemFont('helvetica neue'));
    assert.ok(!fontManager.isValidSystemFont('Roboto;Bold'));
    assert.ok(!fontManager.isValidSystemFont('Arial, sans-serif'));

    fontManager.restrictFont('Roboto');
    assert.ok(fontManager.isValidSystemFont('Roboto'));
});

test('isValidCustomFont', () => {
    const {fontManager} = new Runtime();
    assert.ok(fontManager.isValidCustomFont('Roboto'));
    assert.ok(fontManager.isValidCustomFont('sans-serif'));
    assert.ok(fontManager.isValidCustomFont('helvetica neue'));
    assert.ok(!fontManager.isValidCustomFont('Roboto;Bold'));
    assert.ok(!fontManager.isValidCustomFont('Arial, sans-serif'));

    fontManager.restrictFont('Roboto');
    assert.ok(!fontManager.isValidCustomFont('Roboto'));
    assert.ok(!fontManager.isValidCustomFont('roboto'));
    assert.ok(!fontManager.isValidCustomFont('ROBOTO'));
    assert.ok(fontManager.isValidCustomFont('Roboto '));
    assert.ok(fontManager.isValidCustomFont('Roboto2'));
    assert.ok(fontManager.isValidCustomFont('sans-serif'));
    assert.ok(fontManager.isValidCustomFont('helvetica neue'));
    assert.ok(!fontManager.isValidCustomFont('Roboto;Bold'));
    assert.ok(!fontManager.isValidCustomFont('Arial, sans-serif'));
});

test('getSafeSystemFont', () => {
    const {fontManager} = new Runtime();
    assert.strictEqual(fontManager.getUnusedSystemFont('Arial'), 'Arial');
    fontManager.addSystemFont('Arial', 'sans-serif');
    assert.strictEqual(fontManager.getUnusedSystemFont('Arial'), 'Arial2');
    assert.strictEqual(fontManager.getUnusedSystemFont('Weird123!@"<>?'), 'Weird123');

    fontManager.restrictFont('Restricted');
    assert.strictEqual(fontManager.getUnusedSystemFont('Restricted'), 'Restricted');
});

test('getSafeCustomFont', () => {
    const {fontManager} = new Runtime();
    assert.strictEqual(fontManager.getUnusedCustomFont('Arial'), 'Arial');
    fontManager.addSystemFont('Arial', 'sans-serif');
    assert.strictEqual(fontManager.getUnusedCustomFont('Arial'), 'Arial2');
    assert.strictEqual(fontManager.getUnusedCustomFont('Weird123!@"<>?'), 'Weird123');

    fontManager.restrictFont('Restricted');
    assert.strictEqual(fontManager.getUnusedCustomFont('Restricted'), 'Restricted2');
    assert.strictEqual(fontManager.getUnusedCustomFont('restricted'), 'restricted2');
    assert.strictEqual(fontManager.getUnusedCustomFont(' restricted'), ' restricted');

    fontManager.restrictFont('Restricted2');
    assert.strictEqual(fontManager.getUnusedCustomFont('Restricted'), 'Restricted3');
    assert.strictEqual(fontManager.getUnusedCustomFont('restricted'), 'restricted3');

    fontManager.addSystemFont('Restricted3');
    assert.strictEqual(fontManager.getUnusedCustomFont('Restricted'), 'Restricted4');
    assert.strictEqual(fontManager.getUnusedCustomFont('restricted'), 'restricted4');
});

test('system font', () => {
    const mockRenderer = {
        setLayerGroupOrdering: () => {},
        setCustomFonts: () => {
            assert.fail('Should not call renderer.setCustomFonts()');
        }
    };

    const rt = new Runtime();
    rt.attachRenderer(mockRenderer);
    const {fontManager} = rt;

    let changed = false;
    fontManager.on('change', () => {
        changed = true;
    });

    fontManager.addSystemFont('Noto Sans Mono', 'monospace');
    assert.ok(changed, 'addSystemFont() emits change');
    assert.ok(fontManager.hasFont('Noto Sans Mono'), 'updated hasFont()');
    assert.ok(fontManager.hasFont('noto sans mono'), 'updated hasFont() case insensitively');
    assert.deepEqual(fontManager.getFonts(), [
        {
            system: true,
            name: 'Noto Sans Mono',
            family: '"Noto Sans Mono", monospace',
            data: null,
            format: null
        }
    ]);
    assert.deepEqual(fontManager.serializeJSON(), [
        {
            system: true,
            family: 'Noto Sans Mono',
            fallback: 'monospace'
        }
    ]);
    assert.deepEqual(fontManager.serializeAssets(), []);

    changed = false;
    fontManager.addSystemFont('Lobster', 'fantasy, sans-serif');
    assert.ok(changed, 'addSystemFont() emits change');
    assert.ok(fontManager.hasFont('Lobster'), 'updated hasFont()');
    assert.deepEqual(fontManager.getFonts(), [
        {
            system: true,
            name: 'Noto Sans Mono',
            family: '"Noto Sans Mono", monospace',
            data: null,
            format: null
        },
        {
            system: true,
            name: 'Lobster',
            family: '"Lobster", fantasy, sans-serif',
            data: null,
            format: null
        }
    ]);
    assert.deepEqual(fontManager.serializeJSON(), [
        {
            system: true,
            family: 'Noto Sans Mono',
            fallback: 'monospace'
        },
        {
            system: true,
            family: 'Lobster',
            fallback: 'fantasy, sans-serif'
        }
    ]);
    assert.deepEqual(fontManager.serializeAssets(), []);
});

test('system font validation', () => {
    const {fontManager} = new Runtime();
    fontManager.restrictFont('Restricted');
    assert.throws(() => {
        fontManager.addCustomFont(';', 'monospace');
    });
    assert.throws(() => {
        fontManager.addCustomFont('Restricted', 'monospace');
    });
});

test('clear', () => {
    const setCustomFontsCalls = [];
    const mockRenderer = {
        setLayerGroupOrdering: () => {},
        setCustomFonts: fonts => {
            setCustomFontsCalls.push(fonts);
        }
    };

    const rt = new Runtime();
    rt.attachStorage(makeTestStorage());
    rt.attachRenderer(mockRenderer);
    const {fontManager, storage} = rt;

    fontManager.addSystemFont('Arial', 'sans-serif');
    assert.strictEqual(fontManager.getFonts().length, 1);

    let changed = false;
    fontManager.on('change', () => {
        changed = true;
    });
    fontManager.clear();
    assert.ok(changed, 'clear() emits change');
    assert.strictEqual(fontManager.getFonts().length, 0, 'removed font');
    assert.deepEqual(setCustomFontsCalls, [], 'clear() does not call setCustomFonts() if only system fonts');

    fontManager.addCustomFont('Wingdings', 'monospace', storage.createAsset(
        storage.AssetType.Font,
        'ttf',
        new Uint8Array([11, 12, 13]),
        null,
        true
    ));
    changed = false;
    setCustomFontsCalls.length = 0;
    fontManager.clear();
    assert.ok(changed, 'clear() emits change');
    assert.deepEqual(setCustomFontsCalls, [{}], 'clear() clears setCustomFonts()');
});

test('custom fonts', () => {
    const setCustomFontsCalls = [];
    const mockRenderer = {
        setLayerGroupOrdering: () => {},
        setCustomFonts: customFonts => {
            setCustomFontsCalls.push(customFonts);
        }
    };

    const rt = new Runtime();
    rt.attachRenderer(mockRenderer);
    rt.attachStorage(makeTestStorage());
    const {fontManager, storage} = rt;

    let changed = false;
    fontManager.on('change', () => {
        changed = true;
    });

    fontManager.addCustomFont('Arial', 'sans-serif', storage.createAsset(
        storage.AssetType.Font,
        storage.DataFormat.TTF,
        new Uint8Array([1, 2, 3]),
        null,
        true
    ));
    assert.ok(changed, 'addCustomFont() emits change');
    assert.ok(fontManager.hasFont('Arial'), 'updated hasFont()');
    assert.deepEqual(fontManager.getFonts(), [
        {
            system: false,
            name: 'Arial',
            family: '"Arial", sans-serif',
            data: new Uint8Array([1, 2, 3]),
            format: 'ttf'
        }
    ]);
    assert.deepEqual(fontManager.serializeJSON(), [
        {
            system: false,
            family: 'Arial',
            fallback: 'sans-serif',
            md5ext: '5289df737df57326fcdd22597afb1fac.ttf'
        }
    ]);
    assert.deepEqual(setCustomFontsCalls, [
        {
            // eslint-disable-next-line max-len
            '"Arial", sans-serif': '@font-face { font-family: "Arial"; src: url("data:font/ttf;base64,AQID"); }'
        }
    ]);

    const assets = fontManager.serializeAssets();
    assert.strictEqual(assets.length, 1);
    assert.deepEqual(assets[0].data, new Uint8Array([1, 2, 3]));

    changed = false;
    setCustomFontsCalls.length = 0;
    const asset = storage.createAsset(
        storage.AssetType.Font,
        'woff2',
        new Uint8Array([4, 5, 6]),
        null,
        true
    );
    fontManager.addCustomFont('Comic Sans MS', 'serif', asset);
    assert.ok(changed, 'addCustomFont() emits change');
    assert.ok(fontManager.hasFont('Comic Sans MS'), 'updated hasFont()');
    assert.deepEqual(fontManager.getFonts(), [
        {
            system: false,
            name: 'Arial',
            family: '"Arial", sans-serif',
            data: new Uint8Array([1, 2, 3]),
            format: 'ttf'
        },
        {
            system: false,
            name: 'Comic Sans MS',
            family: '"Comic Sans MS", serif',
            data: new Uint8Array([4, 5, 6]),
            format: 'woff2'
        }
    ]);
    assert.deepEqual(fontManager.serializeJSON(), [
        {
            system: false,
            family: 'Arial',
            fallback: 'sans-serif',
            md5ext: '5289df737df57326fcdd22597afb1fac.ttf'
        },
        {
            system: false,
            family: 'Comic Sans MS',
            fallback: 'serif',
            md5ext: 'b4a3ba90641372b4e4eaa841a5a400ec.woff2'
        }
    ]);
    assert.deepEqual(setCustomFontsCalls, [
        {
            // eslint-disable-next-line max-len
            '"Arial", sans-serif': '@font-face { font-family: "Arial"; src: url("data:font/ttf;base64,AQID"); }',
            // eslint-disable-next-line max-len
            '"Comic Sans MS", serif': '@font-face { font-family: "Comic Sans MS"; src: url("data:font/ttf;base64,BAUG"); }'
        }
    ]);

    const assets2 = fontManager.serializeAssets();
    assert.strictEqual(assets2.length, 2);
    assert.strictEqual(assets2[0], assets[0]);
    assert.strictEqual(assets2[1], asset);
});

test('custom font validation', () => {
    const rt = new Runtime();
    rt.attachStorage(makeTestStorage());
    const {fontManager, storage} = rt;

    assert.throws(() => {
        fontManager.addCustomFont('family;', 'sans-serif', storage.createAsset(
            storage.DataFormat.Font,
            storage.DataFormat.TTF,
            new Uint8Array([1]),
            null,
            true
        ));
    });
});

test('deleteFont', () => {
    const rt = new Runtime();
    rt.attachStorage(makeTestStorage());
    const {fontManager, storage} = rt;

    fontManager.addSystemFont('Liberation Mono', 'monospace');
    fontManager.addCustomFont('Noto Sans Mono', 'monospace', storage.createAsset(
        storage.AssetType.Font,
        storage.DataFormat.TTF,
        new Uint8Array([17, 18, 19]),
        null,
        true
    ));

    assert.ok(fontManager.hasFont('Liberation Mono'), 'has font initially');
    assert.ok(fontManager.hasFont('Noto Sans Mono'), 'has font initially');

    let changed = false;
    fontManager.on('change', () => {
        changed = true;
    });

    const setCustomFontsCalls = [];
    const mockRenderer = {
        setLayerGroupOrdering: () => {},
        setCustomFonts: customFonts => {
            setCustomFontsCalls.push(customFonts);
        }
    };
    rt.attachRenderer(mockRenderer);

    fontManager.deleteFont(1);
    assert.ok(changed, 'deleteFont() emits change');
    assert.ok(fontManager.hasFont('Liberation Mono'), 'kept font');
    assert.ok(!fontManager.hasFont('Noto Sans Mono'), 'deleted font');
    assert.deepEqual(setCustomFontsCalls, [{}], 'called setCustomFonts() after deleting non-system font');
    assert.deepEqual(fontManager.getFonts(), [
        {
            system: true,
            name: 'Liberation Mono',
            family: '"Liberation Mono", monospace',
            data: null,
            format: null
        }
    ], 'updated getFonts() after deleting');

    changed = false;
    fontManager.deleteFont(0);
    assert.ok(changed, 'deleteFont() emits change');
    assert.deepEqual(setCustomFontsCalls, [{}], 'did not call setCustomFonts() again after deleting system font');
    assert.deepEqual(fontManager.getFonts(), [], 'updated getFonts() after deleting');
});

test('fonts are serialized by VM', () => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());
    const {storage, fontManager} = vm.runtime;

    fontManager.addSystemFont('DejaVu Sans', 'sans-serif');
    const fontAsset = storage.createAsset(
        storage.AssetType.Font,
        storage.DataFormat.TTF,
        new Uint8Array([10, 11, 12]),
        null,
        true
    );
    fontManager.addCustomFont('Noto Color Emoji', 'emoji', fontAsset);

    const assets = vm.assets;
    assert.deepEqual(assets, [fontAsset], 'font is in vm.assets');

    const serializedAssets = vm.serializeAssets();
    assert.deepEqual(serializedAssets, [
        {
            fileName: '94263e4d553bcec128704e354b659526.ttf',
            fileContent: new Uint8Array([10, 11, 12])
        }
    ], 'font is in vm.serializeAssets()');

    const notZippedProject = vm.saveProjectSb3DontZip();
    assert.strictEqual(
        notZippedProject['94263e4d553bcec128704e354b659526.ttf'],
        fontAsset.data,
        'font is in saveProjectSb3DontZip()'
    );

    const projectJSON = JSON.parse(vm.toJSON());
    assert.deepEqual(projectJSON.customFonts, [
        {
            system: true,
            family: 'DejaVu Sans',
            fallback: 'sans-serif'
        },
        {
            system: false,
            family: 'Noto Color Emoji',
            fallback: 'emoji',
            md5ext: '94263e4d553bcec128704e354b659526.ttf'
        }
    ], 'font is in vm.toJSON()');
});

test('does not serialize fonts if there are none', () => {
    const vm = new VirtualMachine();
    const json = JSON.parse(vm.toJSON());
    assert.ok(!('customFonts' in json));
});

test('serialization and deserialization roundtrip - project', async () => {
    const originalVM = new VirtualMachine();
    originalVM.attachStorage(makeTestStorage());
    const {storage, fontManager} = originalVM.runtime;

    await originalVM.loadProject(fs.readFileSync(emptyProjectFixture));
    // Add our custom fonts here
    fontManager.addSystemFont('Ubuntu Mono', 'monospace');
    const fontAsset = storage.createAsset(
        storage.AssetType.Font,
        storage.DataFormat.TTF,
        new Uint8Array([20, 21, 22, 23, 24]),
        null,
        true
    );
    fontManager.addCustomFont('Inter', 'sans-serif', fontAsset);

    const projectSb3 = await originalVM.saveProjectSb3('arraybuffer');
    const newVM = new VirtualMachine();
    newVM.attachStorage(makeTestStorage());

    const newFontManager = newVM.runtime.fontManager;
    newFontManager.addSystemFont('ShouldBeRemoved', 'sans-serif');

    let changed = false;
    newFontManager.on('change', () => {
        changed = true;
    });

    await newVM.loadProject(projectSb3);
    assert.ok(changed, 'loadProject() emits change');

    assert.deepEqual(newFontManager.getFonts(), [
        {
            system: true,
            name: 'Ubuntu Mono',
            family: '"Ubuntu Mono", monospace',
            data: null,
            format: null
        },
        {
            system: false,
            name: 'Inter',
            family: '"Inter", sans-serif',
            data: new Uint8Array([20, 21, 22, 23, 24]),
            format: 'ttf'
        }
    ], 'preserved in getFonts()');
    assert.deepEqual(newFontManager.serializeJSON(), [
        {
            system: true,
            family: 'Ubuntu Mono',
            fallback: 'monospace'
        },
        {
            system: false,
            family: 'Inter',
            fallback: 'sans-serif',
            md5ext: '316f84429ec778137b2f5c6f893c7e41.ttf'
        }
    ], 'preserved in serializeJSON()');
    const assets = newFontManager.serializeAssets();
    assert.strictEqual(assets.length, 1);
    assert.deepEqual(
        assets[0].data,
        new Uint8Array([20, 21, 22, 23, 24]),
        'preserved in serializeAssets()'
    );
});

test('serialization and deserialization roundtrip - target', async () => {
    const originalVM = new VirtualMachine();
    originalVM.attachStorage(makeTestStorage());
    const {fontManager, storage} = originalVM.runtime;

    await originalVM.loadProject(fs.readFileSync(emptyProjectFixture));
    // The fixture we use only contains a stage. We'll convert it to a sprite so we can
    // addSprite() it later.
    const sprite = originalVM.runtime.targets[0];
    sprite.isStage = false;

    const noFontsJSON = JSON.parse(originalVM.toJSON(sprite.id));
    assert.ok(!('customFonts' in noFontsJSON), 'does not serialize fonts in target if no fonts');

    fontManager.addCustomFont('Noto Sans Traditional Chinese', 'sans-serif', storage.createAsset(
        storage.AssetType.Font,
        storage.DataFormat.TTF,
        new Uint8Array([97, 98, 99]),
        null,
        true
    ));
    fontManager.addSystemFont('FreeSans', 'sans-serif');

    const spriteJSON = JSON.parse(originalVM.toJSON(sprite.id));
    assert.deepEqual(spriteJSON.customFonts, [
        {
            system: false,
            family: 'Noto Sans Traditional Chinese',
            fallback: 'sans-serif',
            md5ext: '900150983cd24fb0d6963f7d28e17f72.ttf'
        },
        {
            system: true,
            family: 'FreeSans',
            fallback: 'sans-serif'
        }
    ], 'serializes custom fonts to target');

    const exportedSprite = await originalVM.exportSprite(sprite.id, 'uint8array');
    const newVM = new VirtualMachine();
    newVM.attachStorage(makeTestStorage());
    const newFontManager = newVM.runtime.fontManager;

    await newVM.loadProject(fs.readFileSync(emptyProjectFixture));
    // The existing fonts should not be removed or overwritten
    newFontManager.addSystemFont('Liberation Sans', 'sans-serif');
    newFontManager.addSystemFont('FreeSans', 'monospace');

    let changed = false;
    newFontManager.on('change', () => {
        changed = true;
    });

    await newVM.addSprite(exportedSprite);
    assert.ok(changed, 'addSprite() emits change');

    assert.deepEqual(newFontManager.getFonts(), [
        // Importing a sprite should not overwrite old fonts.
        {
            system: true,
            name: 'Liberation Sans',
            family: '"Liberation Sans", sans-serif',
            data: null,
            format: null
        },
        {
            system: true,
            name: 'FreeSans',
            family: '"FreeSans", monospace',
            data: null,
            format: null
        },
        {
            system: false,
            name: 'Noto Sans Traditional Chinese',
            family: '"Noto Sans Traditional Chinese", sans-serif',
            data: new Uint8Array([97, 98, 99]),
            format: 'ttf'
        }
    ], 'imported fonts from sprite');
});

test('deserializes ignores invalid fonts', async () => {
    const {fontManager} = new Runtime();
    await fontManager.deserialize([
        {
            system: true,
            family: ';} body { display: none; }',
            fallback: 'sans-serif'
        },
        {
            system: true,
            family: 'Source Code Pro',
            fallback: 'monospace'
        }
    ], null, false);
    assert.strictEqual(fontManager.getFonts().length, 1);
    assert.strictEqual(fontManager.getFonts()[0].name, 'Source Code Pro');
});

test('restrict throws on invalid input', () => {
    const {fontManager} = new Runtime();
    assert.throws(() => {
        fontManager.restrictFont('(#@*$');
    }, {
        message: 'Invalid font'
    });
});

test('restrict removes existing fonts', () => {
    let setCustomFontsCalls = 0;
    const mockRenderer = {
        setLayerGroupOrdering: () => {},
        setCustomFonts: () => {
            setCustomFontsCalls++;
        }
    };

    const rt = new Runtime();
    rt.attachRenderer(mockRenderer);
    rt.attachStorage(makeTestStorage());
    const {fontManager, storage} = rt;

    let changeEvents = 0;
    fontManager.on('change', () => {
        changeEvents++;
    });

    fontManager.addSystemFont('System Font', 'sans-serif');
    fontManager.addCustomFont('Important Font', 'sans-serif', storage.createAsset(
        storage.AssetType.Font,
        'ttf',
        new Uint8Array([11, 12, 13]),
        null,
        true
    ));
    fontManager.addCustomFont('Not Important Font', 'sans-serif', storage.createAsset(
        storage.AssetType.Font,
        'ttf',
        new Uint8Array([11, 12, 13]),
        null,
        true
    ));

    assert.strictEqual(changeEvents, 3, 'sanity check');
    assert.strictEqual(setCustomFontsCalls, 2, 'sanity check');

    fontManager.restrictFont('Not Used');
    assert.strictEqual(changeEvents, 3, 'does not emit change when unused font restricted');
    assert.strictEqual(setCustomFontsCalls, 2, 'does not emit change when unused font restricted');

    fontManager.restrictFont('System Font');
    assert.strictEqual(changeEvents, 3, 'does not emit change when system font restricted');
    assert.strictEqual(setCustomFontsCalls, 2, 'does not emit change when system font restricted');

    fontManager.restrictFont('important font');
    assert.strictEqual(changeEvents, 4, 'emits change when custom font restricted');
    assert.strictEqual(setCustomFontsCalls, 3, 'emits change when custom font restricted');
    assert.deepEqual(fontManager.getFonts().map(i => i.name), [
        'System Font',
        'Not Important Font'
    ]);

    fontManager.restrictFont('Important Font');
    assert.strictEqual(changeEvents, 4, 'does not emit change when restricted font restricted again');
    assert.strictEqual(setCustomFontsCalls, 3, 'does not emit change when restricted font restricted again');
});

test('overriding existing fonts', () => {
    let setCustomFontsCalls = 0;
    const mockRenderer = {
        setLayerGroupOrdering: () => {},
        setCustomFonts: () => {
            setCustomFontsCalls++;
        }
    };

    const rt = new Runtime();
    rt.attachRenderer(mockRenderer);
    rt.attachStorage(makeTestStorage());
    const {fontManager, storage} = rt;

    let changeEvents = 0;
    fontManager.on('change', () => {
        changeEvents++;
    });

    const asset = storage.createAsset(
        storage.AssetType.Font,
        'ttf',
        new Uint8Array([11, 12, 13]),
        null,
        true
    );

    fontManager.addCustomFont('TestFont', 'sans-serif', asset);
    assert.strictEqual(changeEvents, 1);
    assert.strictEqual(setCustomFontsCalls, 1);
    assert.deepEqual(fontManager.getFonts().map(i => i.name), ['TestFont']);

    fontManager.addSystemFont('TestFonT', 'sans-serif');
    assert.strictEqual(changeEvents, 2);
    assert.strictEqual(setCustomFontsCalls, 2);
    assert.deepEqual(fontManager.getFonts().map(i => i.name), ['TestFonT']);

    fontManager.addSystemFont('TestFONT', 'sans-serif');
    assert.strictEqual(changeEvents, 3);
    assert.strictEqual(setCustomFontsCalls, 2);
    assert.deepEqual(fontManager.getFonts().map(i => i.name), ['TestFONT']);

    fontManager.addCustomFont('TESTFONT', 'sans-serif', asset);
    assert.strictEqual(changeEvents, 4);
    assert.strictEqual(setCustomFontsCalls, 3);
    assert.deepEqual(fontManager.getFonts().map(i => i.name), ['TESTFONT']);
});
