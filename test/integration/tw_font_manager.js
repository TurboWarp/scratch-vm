const fs = require('fs');
const path = require('path');
const {test} = require('tap');
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

test('isValidSystemFont', t => {
    const {fontManager} = new Runtime();
    t.ok(fontManager.isValidSystemFont('Roboto'));
    t.ok(fontManager.isValidSystemFont('sans-serif'));
    t.ok(fontManager.isValidSystemFont('helvetica neue'));
    t.notOk(fontManager.isValidSystemFont('Roboto;Bold'));
    t.notOk(fontManager.isValidSystemFont('Arial, sans-serif'));

    fontManager.restrictFont('Roboto');
    t.ok(fontManager.isValidSystemFont('Roboto'));

    t.end();
});

test('isValidCustomFont', t => {
    const {fontManager} = new Runtime();
    t.ok(fontManager.isValidCustomFont('Roboto'));
    t.ok(fontManager.isValidCustomFont('sans-serif'));
    t.ok(fontManager.isValidCustomFont('helvetica neue'));
    t.notOk(fontManager.isValidCustomFont('Roboto;Bold'));
    t.notOk(fontManager.isValidCustomFont('Arial, sans-serif'));

    fontManager.restrictFont('Roboto');
    t.notOk(fontManager.isValidCustomFont('Roboto'));
    t.notOk(fontManager.isValidCustomFont('roboto'));
    t.notOk(fontManager.isValidCustomFont('ROBOTO'));
    t.ok(fontManager.isValidCustomFont('Roboto '));
    t.ok(fontManager.isValidCustomFont('Roboto2'));
    t.ok(fontManager.isValidCustomFont('sans-serif'));
    t.ok(fontManager.isValidCustomFont('helvetica neue'));
    t.notOk(fontManager.isValidCustomFont('Roboto;Bold'));
    t.notOk(fontManager.isValidCustomFont('Arial, sans-serif'));

    t.end();
});

test('getSafeSystemFont', t => {
    const {fontManager} = new Runtime();
    t.equal(fontManager.getUnusedSystemFont('Arial'), 'Arial');
    fontManager.addSystemFont('Arial', 'sans-serif');
    t.equal(fontManager.getUnusedSystemFont('Arial'), 'Arial2');
    t.equal(fontManager.getUnusedSystemFont('Weird123!@"<>?'), 'Weird123');

    fontManager.restrictFont('Restricted');
    t.equal(fontManager.getUnusedSystemFont('Restricted'), 'Restricted');

    t.end();
});

test('getSafeCustomFont', t => {
    const {fontManager} = new Runtime();
    t.equal(fontManager.getUnusedCustomFont('Arial'), 'Arial');
    fontManager.addSystemFont('Arial', 'sans-serif');
    t.equal(fontManager.getUnusedCustomFont('Arial'), 'Arial2');
    t.equal(fontManager.getUnusedCustomFont('Weird123!@"<>?'), 'Weird123');

    fontManager.restrictFont('Restricted');
    t.equal(fontManager.getUnusedCustomFont('Restricted'), 'Restricted2');
    t.equal(fontManager.getUnusedCustomFont('restricted'), 'restricted2');
    t.equal(fontManager.getUnusedCustomFont(' restricted'), ' restricted');

    fontManager.restrictFont('Restricted2');
    t.equal(fontManager.getUnusedCustomFont('Restricted'), 'Restricted3');
    t.equal(fontManager.getUnusedCustomFont('restricted'), 'restricted3');

    fontManager.addSystemFont('Restricted3');
    t.equal(fontManager.getUnusedCustomFont('Restricted'), 'Restricted4');
    t.equal(fontManager.getUnusedCustomFont('restricted'), 'restricted4');

    t.end();
});

test('system font', t => {
    const mockRenderer = {
        setLayerGroupOrdering: () => {},
        setCustomFonts: () => {
            t.fail('Should not call renderer.setCustomFonts()');
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
    t.ok(changed, 'addSystemFont() emits change');
    t.ok(fontManager.hasFont('Noto Sans Mono'), 'updated hasFont()');
    t.ok(fontManager.hasFont('noto sans mono'), 'updated hasFont() case insensitively');
    t.same(fontManager.getFonts(), [
        {
            system: true,
            name: 'Noto Sans Mono',
            family: '"Noto Sans Mono", monospace',
            data: null,
            format: null
        }
    ]);
    t.same(fontManager.serializeJSON(), [
        {
            system: true,
            family: 'Noto Sans Mono',
            fallback: 'monospace'
        }
    ]);
    t.same(fontManager.serializeAssets(), []);

    changed = false;
    fontManager.addSystemFont('Lobster', 'fantasy, sans-serif');
    t.ok(changed, 'addSystemFont() emits change');
    t.ok(fontManager.hasFont('Lobster'), 'updated hasFont()');
    t.same(fontManager.getFonts(), [
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
    t.same(fontManager.serializeJSON(), [
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
    t.same(fontManager.serializeAssets(), []);

    t.end();
});

test('system font validation', t => {
    const {fontManager} = new Runtime();
    fontManager.restrictFont('Restricted');
    t.throws(() => {
        fontManager.addCustomFont(';', 'monospace');
    });
    t.throws(() => {
        fontManager.addCustomFont('Restricted', 'monospace');
    });
    t.end();
});

test('clear', t => {
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
    t.equal(fontManager.getFonts().length, 1);

    let changed = false;
    fontManager.on('change', () => {
        changed = true;
    });
    fontManager.clear();
    t.ok(changed, 'clear() emits change');
    t.equal(fontManager.getFonts().length, 0, 'removed font');
    t.same(setCustomFontsCalls, [], 'clear() does not call setCustomFonts() if only system fonts');

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
    t.ok(changed, 'clear() emits change');
    t.same(setCustomFontsCalls, [{}], 'clear() clears setCustomFonts()');

    t.end();
});

test('custom fonts', t => {
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
    t.ok(changed, 'addCustomFont() emits change');
    t.ok(fontManager.hasFont('Arial'), 'updated hasFont()');
    t.same(fontManager.getFonts(), [
        {
            system: false,
            name: 'Arial',
            family: '"Arial", sans-serif',
            data: new Uint8Array([1, 2, 3]),
            format: 'ttf'
        }
    ]);
    t.same(fontManager.serializeJSON(), [
        {
            system: false,
            family: 'Arial',
            fallback: 'sans-serif',
            md5ext: '5289df737df57326fcdd22597afb1fac.ttf'
        }
    ]);
    t.same(setCustomFontsCalls, [
        {
            // eslint-disable-next-line max-len
            '"Arial", sans-serif': '@font-face { font-family: "Arial"; src: url("data:font/ttf;base64,AQID"); }'
        }
    ]);

    const assets = fontManager.serializeAssets();
    t.equal(assets.length, 1);
    t.same(assets[0].data, new Uint8Array([1, 2, 3]));

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
    t.ok(changed, 'addCustomFont() emits change');
    t.ok(fontManager.hasFont('Comic Sans MS'), 'updated hasFont()');
    t.same(fontManager.getFonts(), [
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
    t.same(fontManager.serializeJSON(), [
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
    t.same(setCustomFontsCalls, [
        {
            // eslint-disable-next-line max-len
            '"Arial", sans-serif': '@font-face { font-family: "Arial"; src: url("data:font/ttf;base64,AQID"); }',
            // eslint-disable-next-line max-len
            '"Comic Sans MS", serif': '@font-face { font-family: "Comic Sans MS"; src: url("data:font/ttf;base64,BAUG"); }'
        }
    ]);

    const assets2 = fontManager.serializeAssets();
    t.equal(assets2.length, 2);
    t.equal(assets2[0], assets[0]);
    t.equal(assets2[1], asset);

    t.end();
});

test('custom font validation', t => {
    const rt = new Runtime();
    rt.attachStorage(makeTestStorage());
    const {fontManager, storage} = rt;

    t.throws(() => {
        fontManager.addCustomFont('family;', 'sans-serif', storage.createAsset(
            storage.DataFormat.Font,
            storage.DataFormat.TTF,
            new Uint8Array([1]),
            null,
            true
        ));
    });

    t.end();
});

test('deleteFont', t => {
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

    t.ok(fontManager.hasFont('Liberation Mono'), 'has font initially');
    t.ok(fontManager.hasFont('Noto Sans Mono'), 'has font initially');

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
    t.ok(changed, 'deleteFont() emits change');
    t.ok(fontManager.hasFont('Liberation Mono'), 'kept font');
    t.notOk(fontManager.hasFont('Noto Sans Mono'), 'deleted font');
    t.same(setCustomFontsCalls, [{}], 'called setCustomFonts() after deleting non-system font');
    t.same(fontManager.getFonts(), [
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
    t.ok(changed, 'deleteFont() emits change');
    t.same(setCustomFontsCalls, [{}], 'did not call setCustomFonts() again after deleting system font');
    t.same(fontManager.getFonts(), [], 'updated getFonts() after deleting');

    t.end();
});

test('fonts are serialized by VM', t => {
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
    t.same(assets, [fontAsset], 'font is in vm.assets');

    const serializedAssets = vm.serializeAssets();
    t.same(serializedAssets, [
        {
            fileName: '94263e4d553bcec128704e354b659526.ttf',
            fileContent: new Uint8Array([10, 11, 12])
        }
    ], 'font is in vm.serializeAssets()');

    const notZippedProject = vm.saveProjectSb3DontZip();
    t.equal(
        notZippedProject['94263e4d553bcec128704e354b659526.ttf'],
        fontAsset.data,
        'font is in saveProjectSb3DontZip()'
    );

    const projectJSON = JSON.parse(vm.toJSON());
    t.same(projectJSON.customFonts, [
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

    t.end();
});

test('does not serialize fonts if there are none', t => {
    const vm = new VirtualMachine();
    const json = JSON.parse(vm.toJSON());
    t.not('customFonts' in json);
    t.end();
});

test('serialization and deserialization roundtrip - project', t => {
    const originalVM = new VirtualMachine();
    originalVM.attachStorage(makeTestStorage());
    const {storage, fontManager} = originalVM.runtime;

    originalVM.loadProject(fs.readFileSync(emptyProjectFixture)).then(() => {
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

        originalVM.saveProjectSb3('arraybuffer').then(projectSb3 => {
            const newVM = new VirtualMachine();
            newVM.attachStorage(makeTestStorage());

            const newFontManager = newVM.runtime.fontManager;
            newFontManager.addSystemFont('ShouldBeRemoved', 'sans-serif');

            let changed = false;
            newFontManager.on('change', () => {
                changed = true;
            });

            newVM.loadProject(projectSb3).then(() => {
                t.ok(changed, 'loadProject() emits change');

                t.same(newFontManager.getFonts(), [
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
                t.same(newFontManager.serializeJSON(), [
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
                t.equal(assets.length, 1);
                t.same(assets[0].data, new Uint8Array([20, 21, 22, 23, 24]), 'preserved in serializeAssets()');

                t.end();
            });
        });
    });
});

test('serialization and deserialization roundtrip - target', t => {
    const originalVM = new VirtualMachine();
    originalVM.attachStorage(makeTestStorage());
    const {fontManager, storage} = originalVM.runtime;

    originalVM.loadProject(fs.readFileSync(emptyProjectFixture)).then(() => {
        // The fixture we use only contains a stage. We'll convert it to a sprite so we can
        // addSprite() it later.
        const sprite = originalVM.runtime.targets[0];
        sprite.isStage = false;

        const noFontsJSON = JSON.parse(originalVM.toJSON(sprite.id));
        t.notOk('customFonts' in noFontsJSON, 'does not serialize fonts in target if no fonts');

        fontManager.addCustomFont('Noto Sans Traditional Chinese', 'sans-serif', storage.createAsset(
            storage.AssetType.Font,
            storage.DataFormat.TTF,
            new Uint8Array([97, 98, 99]),
            null,
            true
        ));
        fontManager.addSystemFont('FreeSans', 'sans-serif');

        const spriteJSON = JSON.parse(originalVM.toJSON(sprite.id));
        t.same(spriteJSON.customFonts, [
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

        originalVM.exportSprite(sprite.id, 'uint8array').then(exportedSprite => {
            const newVM = new VirtualMachine();
            newVM.attachStorage(makeTestStorage());
            const newFontManager = newVM.runtime.fontManager;

            newVM.loadProject(fs.readFileSync(emptyProjectFixture)).then(() => {
                // The existing fonts should not be removed or overwritten
                newFontManager.addSystemFont('Liberation Sans', 'sans-serif');
                newFontManager.addSystemFont('FreeSans', 'monospace');

                let changed = false;
                newFontManager.on('change', () => {
                    changed = true;
                });

                newVM.addSprite(exportedSprite).then(() => {
                    t.ok(changed, 'addSprite() emits change');

                    t.same(newFontManager.getFonts(), [
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

                    t.end();
                });
            });
        });
    });
});

test('deserializes ignores invalid fonts', t => {
    const {fontManager} = new Runtime();
    fontManager.deserialize([
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
    ], null, false).then(() => {
        t.equal(fontManager.getFonts().length, 1);
        t.equal(fontManager.getFonts()[0].name, 'Source Code Pro');
        t.end();
    });
});

test('restrict throws on invalid input', t => {
    const {fontManager} = new Runtime();
    t.throws(() => {
        fontManager.restrictFont('(#@*$');
    }, 'Invalid font');
    t.end();
});

test('restrict removes existing fonts', t => {
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

    t.equal(changeEvents, 3, 'sanity check');
    t.equal(setCustomFontsCalls, 2, 'sanity check');

    fontManager.restrictFont('Not Used');
    t.equal(changeEvents, 3, 'does not emit change when unused font restricted');
    t.equal(setCustomFontsCalls, 2, 'does not emit change when unused font restricted');

    fontManager.restrictFont('System Font');
    t.equal(changeEvents, 3, 'does not emit change when system font restricted');
    t.equal(setCustomFontsCalls, 2, 'does not emit change when system font restricted');

    fontManager.restrictFont('important font');
    t.equal(changeEvents, 4, 'emits change when custom font restricted');
    t.equal(setCustomFontsCalls, 3, 'emits change when custom font restricted');
    t.same(fontManager.getFonts().map(i => i.name), [
        'System Font',
        'Not Important Font'
    ]);

    fontManager.restrictFont('Important Font');
    t.equal(changeEvents, 4, 'does not emit change when restricted font restricted again');
    t.equal(setCustomFontsCalls, 3, 'does not emit change when restricted font restricted again');

    t.end();
});

test('overriding existing fonts', t => {
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
    t.equal(changeEvents, 1);
    t.equal(setCustomFontsCalls, 1);
    t.same(fontManager.getFonts().map(i => i.name), ['TestFont']);

    fontManager.addSystemFont('TestFonT', 'sans-serif');
    t.equal(changeEvents, 2);
    t.equal(setCustomFontsCalls, 2);
    t.same(fontManager.getFonts().map(i => i.name), ['TestFonT']);

    fontManager.addSystemFont('TestFONT', 'sans-serif');
    t.equal(changeEvents, 3);
    t.equal(setCustomFontsCalls, 2);
    t.same(fontManager.getFonts().map(i => i.name), ['TestFONT']);

    fontManager.addCustomFont('TESTFONT', 'sans-serif', asset);
    t.equal(changeEvents, 4);
    t.equal(setCustomFontsCalls, 3);
    t.same(fontManager.getFonts().map(i => i.name), ['TESTFONT']);

    t.end();
});
