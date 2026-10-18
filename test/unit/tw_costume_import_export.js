const {
    parseVectorMetadata,
    exportCostume
} = require('../../src/serialization/tw-costume-import-export');
const {test} = require('node:test');
const assert = require('node:assert');

test('parseVectorMetadata', () => {
    /* eslint-disable max-len */
    assert.deepEqual(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:0:0-->'),
        [0, 0]
    );
    assert.deepEqual(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:-0.0:-0.0-->'),
        [0, 0]
    );
    assert.deepEqual(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:-1:3-->'),
        [-1, 3]
    );
    assert.deepEqual(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:106.62300344745225:-11.822572945859918-->'),
        [106.62300344745225, -11.822572945859918]
    );
    assert.deepEqual(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:a:b-->'),
        null
    );
    assert.deepEqual(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:-1:-->'),
        null
    );
    assert.deepEqual(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>'),
        null
    );
    /* eslint-enable max-len */
});

test('exportCostume', () => {
    // PNG and JPG costumes are exported as-is
    assert.deepEqual(exportCostume({
        dataFormat: 'png',
        asset: {
            data: new Uint8Array([10, 20, 30])
        }
    }), new Uint8Array([10, 20, 30]));
    assert.deepEqual(exportCostume({
        dataFormat: 'jpg',
        asset: {
            data: new Uint8Array([40, 50, 60])
        }
    }), new Uint8Array([40, 50, 60]));

    assert.deepEqual(exportCostume({
        dataFormat: 'svg',
        asset: {
            data: new TextEncoder().encode('<svg></svg>')
        },
        rotationCenterX: 89.339393,
        rotationCenterY: -3.7373
    }), new TextEncoder().encode('<svg></svg><!--rotationCenter:89.339393:-3.7373-->'));

    assert.deepEqual(exportCostume({
        dataFormat: 'svg',
        asset: {
            data: new TextEncoder().encode('<svg></svg><!--rotationCenter:78.23:-9-->')
        },
        rotationCenterX: 89.339393,
        rotationCenterY: -3.7373
    }), new TextEncoder().encode('<svg></svg><!--rotationCenter:89.339393:-3.7373-->'));
});
