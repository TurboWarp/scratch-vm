const VM = require('../../src/virtual-machine');
const {test} = require('node:test');
const assert = require('node:assert');

// The actual logic of the costume exporting and importing is tested elsewhere.
// This is just to make sure that the VM's shims are going to the right place.

test('getExportedCostume', () => {
    const vm = new VM();
    assert.deepEqual(
        vm.getExportedCostume({
            asset: {
                data: new Uint8Array([97, 98, 99])
            },
            dataFormat: 'png'
        }),
        new Uint8Array([97, 98, 99])
    );
});

test('getExportedCostumeBase64', () => {
    // We'll just make sure that the output is being base64 encoded.
    const vm = new VM();
    assert.deepEqual(
        vm.getExportedCostumeBase64({
            asset: {
                data: new Uint8Array([97, 98, 99])
            },
            dataFormat: 'png'
        }),
        // btoa("abc")
        'YWJj'
    );
});
