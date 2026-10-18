const Runtime = require('../../src/engine/runtime');
const sb2 = require('../../src/serialization/sb2');
const {test} = require('node:test');
const assert = require('node:assert');

test('importing ScratchX/.sbx project', async () => {
    const rt = new Runtime();

    const deserialized = await sb2.deserialize(
        {
            objName: 'Stage',
            scripts: [
                [0, 0, [['Text to Speech.speak_text', 'Hello!']]],
                [788, 33, [['Spotify\u001feveryBar']]],
                [100, 10, [['Weather extension\u001fgetWeather', 'temperature', 'Cambridge, MA']]],
                [60, 40, [['Synth Extension.setEffect', 'glide', 10]]]
            ],
            sounds: [],
            costumes: [],
            children: [],
            info: {
                savedExtensions: [
                    {
                        menus: {
                            // not important for this test
                        },
                        extensionName: 'Spotify',
                        javascriptURL: 'https://ericrosenbaum.github.io/spotify-extension/extension.js',
                        blockSpecs: [
                            // not important for this test
                        ]
                    },
                    {
                        extensionName: 'Weather extension',
                        javascriptURL: 'http://khanning.github.io/scratch-weather-extension/weather_extension.js'
                    }
                ]
            }
        },
        rt
    );

    const extensionIDs = deserialized.extensions.extensionIDs;
    assert.strictEqual(extensionIDs.size, 4);
    assert.ok(extensionIDs.has('sbxtexttospeech'));
    assert.ok(extensionIDs.has('sbxspotify'));
    assert.ok(extensionIDs.has('sbxweatherextension'));
    assert.ok(extensionIDs.has('sbxsynthextension'));

    const extensionURLs = deserialized.extensions.extensionURLs;
    assert.strictEqual(extensionURLs.size, 2);
    assert.strictEqual(extensionURLs.get('sbxspotify'), 'https://ericrosenbaum.github.io/spotify-extension/extension.js');
    assert.strictEqual(extensionURLs.get('sbxweatherextension'), 'http://khanning.github.io/scratch-weather-extension/weather_extension.js');

    const stage = deserialized.targets[0];
    const blocks = Object.values(stage.blocks._blocks);

    const textToSpeech = blocks.find(i => i.opcode === 'sbxtexttospeech_speak_text');
    assert.strictEqual(typeof textToSpeech, 'object');
    assert.strictEqual(typeof textToSpeech.inputs['0'], 'object');
    assert.strictEqual(typeof textToSpeech.inputs['1'], 'undefined');

    const spotify = blocks.find(i => i.opcode === 'sbxspotify_everyBar');
    assert.strictEqual(typeof spotify, 'object');
    assert.strictEqual(typeof spotify.inputs['0'], 'undefined');

    const weather = blocks.find(i => i.opcode === 'sbxweatherextension_getWeather');
    assert.strictEqual(typeof weather, 'object');
    assert.strictEqual(typeof weather.inputs['0'], 'object');
    assert.strictEqual(typeof weather.inputs['1'], 'object');
    assert.strictEqual(typeof weather.inputs['2'], 'undefined');

    const synth = blocks.find(i => i.opcode === 'sbxsynthextension_setEffect');
    assert.strictEqual(typeof synth, 'object');
    assert.strictEqual(typeof synth.inputs['0'], 'object');
    assert.strictEqual(typeof synth.inputs['1'], 'object');
    assert.strictEqual(typeof synth.inputs['2'], 'undefined');
});
