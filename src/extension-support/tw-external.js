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

const dependency = {};

/**
 * @param {string} url
 * @template T
 * @returns {Promise<T>}
 */
dependency.import = url => {
    checkURL(url);
    // Need to specify webpackIgnore so that webpack compiles this directly to a call to import()
    // instead of trying making it try to use the webpack import system.
    return import(/* webpackIgnore: true */ url);
};

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
dependency.fetch = url => {
    checkURL(url);
    return fetch(url);
};

/**
 * @param {string} url
 * @param {string} returnExpression
 * @template T
 * @returns {Promise<T>}
 */
dependency.evalAndReturn = async (url, returnExpression) => {
    checkURL(url);

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
    }

    const text = await res.text();
    const js = `${text};return ${returnExpression}`;
    const fn = new Function(js);
    return fn();
};

module.exports = dependency;
