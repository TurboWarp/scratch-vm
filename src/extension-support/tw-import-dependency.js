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

const importDependency = {};

/**
 * @param {string} url
 * @template T
 * @returns {Promise<T>}
 */
importDependency.asModule = url => {
    checkURL(url);
    // Need to specify webpackIgnore so that webpack compiles this directly to a call to import()
    // instead of trying making it try to use the webpack dependency system.
    return import(/* webpackIgnore: true */ url);
};

/**
 * @param {string} url
 * @returns {Promise<Response>|Response}
 */
importDependency.asFetch = url => {
    checkURL(url);
    return fetch(url);
};

/**
 * @param {string} url
 * @returns {Promise<string>|string}
 */
importDependency.asDataURL = async url => {
    checkURL(url);
    const res = await fetch(url);
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
 * @returns {Promise<void>}
 */
importDependency.asScriptTag = url => {
    checkURL(url);
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Script error'));
        script.src = url;
        return script;
    });
};

/**
 * @param {string} url
 * @param {string} returnExpression
 * @template T
 * @returns {Promise<T>|T}
 */
importDependency.asEval = async (url, returnExpression) => {
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

module.exports = importDependency;
