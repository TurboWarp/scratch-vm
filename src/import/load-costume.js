const StringUtil = require('../util/string-util');
const log = require('../util/log');
const AsyncLimiter = require('../util/async-limiter');
const {loadSvgString, serializeSvgToString} = require('@turbowarp/scratch-svg-renderer');
const {parseVectorMetadata} = require('../serialization/tw-costume-import-export');

const loadVector_ = function (costume, runtime, rotationCenter, optVersion) {
    return new Promise(resolve => {
        let svgString = costume.asset.decodeText();

        // TW: We allow SVGs to specify their rotation center using a special comment.
        if (typeof rotationCenter === 'undefined') {
            const parsedRotationCenter = parseVectorMetadata(svgString);
            if (parsedRotationCenter) {
                rotationCenter = parsedRotationCenter;
                costume.rotationCenterX = rotationCenter[0];
                costume.rotationCenterY = rotationCenter[1];
            }
        }
    
        // SVG Renderer load fixes "quirks" associated with Scratch 2 projects
        if (optVersion && optVersion === 2) {
            // scratch-svg-renderer fixes syntax that causes loading issues,
            // and if optVersion is 2, fixes "quirks" associated with Scratch 2 SVGs,
            const fixedSvgString = serializeSvgToString(loadSvgString(svgString, true /* fromVersion2 */));

            // If the string changed, put back into storage
            if (svgString !== fixedSvgString) {
                svgString = fixedSvgString;
                const storage = runtime.storage;
                costume.asset.encodeTextData(fixedSvgString, storage.DataFormat.SVG, true);
                costume.assetId = costume.asset.assetId;
                costume.md5 = `${costume.assetId}.${costume.dataFormat}`;
            }
        }

        // createSVGSkin does the right thing if rotationCenter isn't provided, so it's okay if it's
        // undefined here
        costume.skinId = runtime.renderer.createSVGSkin(svgString, rotationCenter);
        costume.size = runtime.renderer.getSkinSize(costume.skinId);
        // Now we should have a rotationCenter even if we didn't before
        if (!rotationCenter) {
            rotationCenter = runtime.renderer.getSkinRotationCenter(costume.skinId);
            costume.rotationCenterX = rotationCenter[0];
            costume.rotationCenterY = rotationCenter[1];
            costume.bitmapResolution = 1;
        }

        if (runtime.isPackaged) {
            costume.asset = null;
        }

        resolve(costume);
    });
};

const canvasPool = (function () {
    /**
     * A pool of canvas objects that can be reused to reduce memory
     * allocations. And time spent in those allocations and the later garbage
     * collection.
     */
    class CanvasPool {
        constructor () {
            this.pool = [];
            this.clearSoon = null;
        }

        /**
         * After a short wait period clear the pool to let the VM collect
         * garbage.
         */
        clear () {
            if (!this.clearSoon) {
                this.clearSoon = new Promise(resolve => setTimeout(resolve, 1000))
                    .then(() => {
                        this.pool.length = 0;
                        this.clearSoon = null;
                    });
            }
        }

        /**
         * Return a canvas. Create the canvas if the pool is empty.
         * @returns {HTMLCanvasElement} A canvas element.
         */
        create () {
            return this.pool.pop() || document.createElement('canvas');
        }

        /**
         * Release the canvas to be reused.
         * @param {HTMLCanvasElement} canvas A canvas element.
         */
        release (canvas) {
            this.clear();
            this.pool.push(canvas);
        }
    }

    return new CanvasPool();
}());

/**
 * @param {string} src URL of image
 * @returns {Promise<HTMLImageElement>}
 */
const readAsImageElement = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = function () {
        resolve(image);
        image.onload = null;
        image.onerror = null;
    };
    image.onerror = function () {
        reject(new Error('Costume load failed. Asset could not be read.'));
        image.onload = null;
        image.onerror = null;
    };
    image.src = src;
});

/**
 * @param {Asset} asset scratch-storage asset
 * @returns {Promise<HTMLImageElement|ImageBitmap>}
 */
const _persistentReadImage = async asset => {
    // Sometimes, when a lot of images are loaded at once, especially in Chrome, reading an image
    // can throw an error even on valid images. To mitigate this, we'll retry image reading a few
    // time with delays.
    let firstError;
    for (let i = 0; i < 3; i++) {
        try {
            if (typeof createImageBitmap === 'function') {
                const imageBitmap = await createImageBitmap(
                    new Blob([asset.data.buffer], {type: asset.assetType.contentType})
                );
                // If we do too many createImageBitmap at the same time, some browsers (Chrome) will
                // sometimes resolve with undefined. We limit concurrency so this shouldn't ever
                // happen, but if it somehow does, throw an error so it can be retried or so that it
                // falls back to scratch's broken costume handling.
                if (!imageBitmap) {
                    throw new Error(`createImageBitmap resolved with ${imageBitmap}`);
                }
                return imageBitmap;
            }
            return await readAsImageElement(asset.encodeDataURI());
        } catch (e) {
            if (!firstError) {
                firstError = e;
            }
            log.warn(e);
            await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
        }
    }
    throw firstError;
};

// Browsers break when we do too many createImageBitmap at the same time.
const readImage = new AsyncLimiter(_persistentReadImage, 25);

/**
 * Return a promise to fetch a bitmap from storage and return it as a canvas
 * If the costume has bitmapResolution 1, it will be converted to bitmapResolution 2 here (the standard for Scratch 3)
 * If the costume has a text layer asset, which is a text part from Scratch 1.4, then this function
 * will merge the two image assets. See the issue LLK/scratch-vm#672 for more information.
 * @param {!object} costume - the Scratch costume object.
 * @param {!Runtime} runtime - Scratch runtime, used to access the v2BitmapAdapter
 * @param {?object} rotationCenter - optionally passed in coordinates for the center of rotation for the image. If
 *     none is given, the rotation center of the costume will be set to the middle of the costume later on.
 * @property {number} costume.bitmapResolution - the resolution scale for a bitmap costume.
 * @returns {?Promise} - a promise which will resolve to an object {canvas, rotationCenter, assetMatchesBase},
 *     or reject on error.
 *     assetMatchesBase is true if the asset matches the base layer; false if it required adjustment
 */
const fetchBitmapCanvas_ = function (costume, runtime, rotationCenter) {
    if (!costume || !costume.asset) { // TODO: We can probably remove this check...
        // TODO: reject with an Error (breaking API change!)
        // eslint-disable-next-line prefer-promise-reject-errors
        return Promise.reject('Costume load failed. Assets were missing.');
    }
    if (!runtime.v2BitmapAdapter) {
        // TODO: reject with an Error (breaking API change!)
        // eslint-disable-next-line prefer-promise-reject-errors
        return Promise.reject('No V2 Bitmap adapter present.');
    }

    return Promise.all([costume.asset, costume.textLayerAsset].map(asset => {
        if (!asset) {
            return null;
        }

        return readImage.do(asset);
    }))
        .then(([baseImageElement, textImageElement]) => {
            if (!baseImageElement) {
                throw new Error('Loading bitmap costume base failed.');
            }

            const scale = costume.bitmapResolution === 1 ? 2 : 1;

            let imageOrCanvas;
            let canvas;
            if (textImageElement) {
                canvas = canvasPool.create();
                canvas.width = baseImageElement.width;
                canvas.height = baseImageElement.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(baseImageElement, 0, 0);
                ctx.drawImage(textImageElement, 0, 0);
                imageOrCanvas = canvas;
            } else {
                imageOrCanvas = baseImageElement;
            }
            if (scale !== 1) {
                // resize() returns a new canvas.
                imageOrCanvas = runtime.v2BitmapAdapter.resize(
                    imageOrCanvas,
                    imageOrCanvas.width * scale,
                    imageOrCanvas.height * scale
                );
                // Old canvas is no longer used.
                if (canvas) {
                    canvasPool.release(canvas);
                }
            }

            // This informs TurboWarp/scratch-render that this canvas won't be reused by the canvas pool,
            // which helps it optimize memory use.
            imageOrCanvas.reusable = false;

            // By scaling, we've converted it to bitmap resolution 2
            if (rotationCenter) {
                rotationCenter[0] = rotationCenter[0] * scale;
                rotationCenter[1] = rotationCenter[1] * scale;
                costume.rotationCenterX = rotationCenter[0];
                costume.rotationCenterY = rotationCenter[1];
            }
            costume.bitmapResolution = 2;

            // Clean up the costume object
            delete costume.textLayerMD5;
            delete costume.textLayerAsset;

            return {
                image: imageOrCanvas,
                rotationCenter,
                // True if the asset matches the base layer; false if it required adjustment
                assetMatchesBase: scale === 1 && !textImageElement
            };
        })
        .finally(() => {
            // Clean up the text layer properties if it fails to load
            delete costume.textLayerMD5;
            delete costume.textLayerAsset;
        });
};

const toDataURL = imageOrCanvas => {
    if (imageOrCanvas instanceof HTMLCanvasElement) {
        return imageOrCanvas.toDataURL();
    }
    const canvas = canvasPool.create();
    canvas.width = imageOrCanvas.width;
    canvas.height = imageOrCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageOrCanvas, 0, 0);
    const url = canvas.toDataURL();
    canvasPool.release(canvas);
    return url;
};

const loadBitmap_ = function (costume, runtime, _rotationCenter) {
    return fetchBitmapCanvas_(costume, runtime, _rotationCenter)
        .then(fetched => {
            const updateCostumeAsset = function (dataURI) {
                if (!runtime.v2BitmapAdapter) {
                    // TODO: This might be a bad practice since the returned
                    // promise isn't acted on. If this is something we should be
                    // creating a rejected promise for we should also catch it
                    // somewhere and act on that error (like logging).
                    //
                    // Return a rejection to stop executing updateCostumeAsset.
                    // TODO: reject with an Error (breaking API change!)
                    // eslint-disable-next-line prefer-promise-reject-errors
                    return Promise.reject('No V2 Bitmap adapter present.');
                }

                const storage = runtime.storage;
                costume.asset = storage.createAsset(
                    storage.AssetType.ImageBitmap,
                    storage.DataFormat.PNG,
                    runtime.v2BitmapAdapter.convertDataURIToBinary(dataURI),
                    null,
                    true // generate md5
                );
                costume.dataFormat = storage.DataFormat.PNG;
                costume.assetId = costume.asset.assetId;
                costume.md5 = `${costume.assetId}.${costume.dataFormat}`;
            };

            if (!fetched.assetMatchesBase) {
                updateCostumeAsset(toDataURL(fetched.image));
            }

            return fetched;
        })
        .then(({image, rotationCenter}) => {
            // createBitmapSkin does the right thing if costume.rotationCenter is undefined.
            // That will be the case if you upload a bitmap asset or create one by taking a photo.
            let center;
            if (rotationCenter) {
                // fetchBitmapCanvas will ensure that the costume's bitmap resolution is 2 and its rotation center is
                // scaled to match, so it's okay to always divide by 2.
                center = [
                    rotationCenter[0] / 2,
                    rotationCenter[1] / 2
                ];
            }

            // TODO: costume.bitmapResolution will always be 2 at this point because of fetchBitmapCanvas_, so we don't
            // need to pass it in here.
            costume.skinId = runtime.renderer.createBitmapSkin(image, costume.bitmapResolution, center);
            const renderSize = runtime.renderer.getSkinSize(costume.skinId);
            costume.size = [renderSize[0] * 2, renderSize[1] * 2]; // Actual size, since all bitmaps are resolution 2

            if (!rotationCenter) {
                rotationCenter = runtime.renderer.getSkinRotationCenter(costume.skinId);
                // Actual rotation center, since all bitmaps are resolution 2
                costume.rotationCenterX = rotationCenter[0] * 2;
                costume.rotationCenterY = rotationCenter[1] * 2;
                costume.bitmapResolution = 2;
            }

            if (runtime.isPackaged) {
                costume.asset = null;
            }

            return costume;
        });
};

// Handle all manner of costume errors with a Gray Question Mark (default costume)
// and preserve as much of the original costume data as possible
// Returns a promise of a costume
const handleCostumeLoadError = function (costume, runtime) {
    // Keep track of the old asset information until we're done loading the default costume
    const oldAsset = costume.asset; // could be null
    const oldAssetId = costume.assetId;
    const oldRotationX = costume.rotationCenterX;
    const oldRotationY = costume.rotationCenterY;
    const oldBitmapResolution = costume.bitmapResolution;
    const oldDataFormat = costume.dataFormat;

    const AssetType = runtime.storage.AssetType;
    const isVector = costume.dataFormat === AssetType.ImageVector.runtimeFormat;

    // Use default asset if original fails to load
    costume.assetId = isVector ?
        runtime.storage.defaultAssetId.ImageVector :
        runtime.storage.defaultAssetId.ImageBitmap;
    costume.asset = runtime.storage.get(costume.assetId);
    costume.md5 = `${costume.assetId}.${costume.asset.dataFormat}`;

    const defaultCostumePromise = (isVector) ?
        loadVector_(costume, runtime) : loadBitmap_(costume, runtime);

    return defaultCostumePromise.then(loadedCostume => {
        loadedCostume.broken = {};
        loadedCostume.broken.assetId = oldAssetId;
        loadedCostume.broken.md5 = `${oldAssetId}.${oldDataFormat}`;

        // Should be null if we got here because the costume was missing
        loadedCostume.broken.asset = oldAsset;
        loadedCostume.broken.dataFormat = oldDataFormat;

        loadedCostume.broken.rotationCenterX = oldRotationX;
        loadedCostume.broken.rotationCenterY = oldRotationY;
        loadedCostume.broken.bitmapResolution = oldBitmapResolution;
        return loadedCostume;
    });
};

/**
 * Initialize a costume from an asset asynchronously.
 * Do not call this unless there is a renderer attached.
 * @param {!object} costume - the Scratch costume object.
 * @property {int} skinId - the ID of the costume's render skin, once installed.
 * @property {number} rotationCenterX - the X component of the costume's origin.
 * @property {number} rotationCenterY - the Y component of the costume's origin.
 * @property {number} [bitmapResolution] - the resolution scale for a bitmap costume.
 * @property {!Asset} costume.asset - the asset of the costume loaded from storage.
 * @param {!Runtime} runtime - Scratch runtime, used to access the storage module.
 * @param {?int} optVersion - Version of Scratch that the costume comes from. If this is set
 *     to 2, scratch 3 will perform an upgrade step to handle quirks in SVGs from Scratch 2.0.
 * @returns {?Promise} - a promise which will resolve after skinId is set, or null on error.
 */
const loadCostumeFromAsset = function (costume, runtime, optVersion) {
    costume.assetId = costume.asset.assetId;
    const renderer = runtime.renderer;
    if (!renderer) {
        log.warn('No rendering module present; cannot load costume: ', costume.name);
        return Promise.resolve(costume);
    }
    const AssetType = runtime.storage.AssetType;
    let rotationCenter;
    // Use provided rotation center and resolution if they are defined. Bitmap resolution
    // should only ever be 1 or 2.
    if (typeof costume.rotationCenterX === 'number' && !isNaN(costume.rotationCenterX) &&
            typeof costume.rotationCenterY === 'number' && !isNaN(costume.rotationCenterY)) {
        rotationCenter = [costume.rotationCenterX, costume.rotationCenterY];
    }
    if (costume.asset.assetType.runtimeFormat === AssetType.ImageVector.runtimeFormat) {
        return loadVector_(costume, runtime, rotationCenter, optVersion)
            .catch(error => {
                log.warn(`Error loading vector image: ${error}`);
                return handleCostumeLoadError(costume, runtime);

            });
    }
    return loadBitmap_(costume, runtime, rotationCenter, optVersion)
        .catch(error => {
            log.warn(`Error loading bitmap image: ${error}`);
            return handleCostumeLoadError(costume, runtime);
        });
};


/**
 * Load a costume's asset into memory asynchronously.
 * Do not call this unless there is a renderer attached.
 * @param {!string} md5ext - the MD5 and extension of the costume to be loaded.
 * @param {!object} costume - the Scratch costume object.
 * @property {int} skinId - the ID of the costume's render skin, once installed.
 * @property {number} rotationCenterX - the X component of the costume's origin.
 * @property {number} rotationCenterY - the Y component of the costume's origin.
 * @property {number} [bitmapResolution] - the resolution scale for a bitmap costume.
 * @param {!Runtime} runtime - Scratch runtime, used to access the storage module.
 * @param {?int} optVersion - Version of Scratch that the costume comes from. If this is set
 *     to 2, scratch 3 will perform an upgrade step to handle quirks in SVGs from Scratch 2.0.
 * @returns {?Promise} - a promise which will resolve after skinId is set, or null on error.
 */
const loadCostume = function (md5ext, costume, runtime, optVersion) {
    const idParts = StringUtil.splitFirst(md5ext, '.');
    const md5 = idParts[0];
    const ext = idParts[1].toLowerCase();
    costume.dataFormat = ext;

    if (costume.asset) {
        // Costume comes with asset. It could be coming from image upload, drag and drop, or file
        return loadCostumeFromAsset(costume, runtime, optVersion);
    }

    // Need to load the costume from storage. The server should have a reference to this md5.
    if (!runtime.storage) {
        log.warn('No storage module present; cannot load costume asset: ', md5ext);
        return Promise.resolve(costume);
    }

    if (!runtime.storage.defaultAssetId) {
        log.warn(`No default assets found`);
        return Promise.resolve(costume);
    }

    const AssetType = runtime.storage.AssetType;
    const assetType = (ext === 'svg') ? AssetType.ImageVector : AssetType.ImageBitmap;

    const costumePromise = runtime.storage.load(assetType, md5, ext);

    let textLayerPromise;
    if (costume.textLayerMD5) {
        textLayerPromise = runtime.storage.load(AssetType.ImageBitmap, costume.textLayerMD5, 'png');
    } else {
        textLayerPromise = Promise.resolve(null);
    }

    return Promise.all([costumePromise, textLayerPromise])
        .then(assetArray => {
            if (assetArray[0]) {
                costume.asset = assetArray[0];
            } else {
                return handleCostumeLoadError(costume, runtime);
            }

            if (assetArray[1]) {
                costume.textLayerAsset = assetArray[1];
            }
            return loadCostumeFromAsset(costume, runtime, optVersion);
        })
        .catch(error => {
            // Handle case where storage.load rejects with errors
            // instead of resolving null
            log.warn('Error loading costume: ', error);
            return handleCostumeLoadError(costume, runtime);
        });
};

module.exports = {
    loadCostume,
    loadCostumeFromAsset
};
