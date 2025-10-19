/**
 * @param {string} url
 * @returns {void} if URL is supported
 * @throws if URL is unsupported
 */
const checkURL = url => {
    // URL might be a very long data: URL, so try to avoid fully parsing it if we can.
    // The notable requirement here is that the URL must be an absolute URL, not something
    // relative to where the extension is loaded from or where the extension is running.
    // This ensures that the same extension file will always load resources from the same
    // place, regardless of how it is running or packaged or whatever else.
    if (
        !url.startsWith('http:') &&
        !url.startsWith('https:') &&
        !url.startsWith('data:') &&
        !url.startsWith('blob:')
    ) {
        throw new Error(`Unsupported URL: ${url}`);
    }
};

const external = {};

/**
 * @param {string} url
 * @template T
 * @returns {Promise<T>}
 */
external.importModule = url => {
    checkURL(url);
    // Need to specify webpackIgnore so that webpack compiles this directly to a call to import()
    // instead of trying making it try to use the webpack import system.
    return import(/* webpackIgnore: true */ url);
};

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
external.fetch = async url => {
    checkURL(url);
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    return res;
};

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
external.dataURL = async url => {
    const res = await external.fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
    });
};

/**
 * @param {string} url
 * @returns {Promise<Blob>}
 */
external.blob = async url => {
    const res = await external.fetch(url);
    return res.blob();
};

/**
 * @param {string} url
 * @param {string} returnExpression
 * @template T
 * @returns {Promise<T>}
 */
external.evalAndReturn = async (url, returnExpression) => {
    const res = await external.fetch(url);
    const text = await res.text();
    const js = `${text};return ${returnExpression}`;
    const fn = new Function(js);
    return fn();
};

module.exports = external;
