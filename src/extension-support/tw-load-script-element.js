/**
 * @param {string} url
 * @returns {string}
 */
const urlForLogs = url => {
    if (url.startsWith('data:')) {
        return 'Custom extension';
    }
    return url;
};

/**
 * Run a script by adding a <script> element to the document, with error handling.
 * @param {string} url
 * @returns {Promise<void>} Resolves or rejects when the script's synchronous execution finishes.
 */
const loadScriptElement = url => new Promise((resolve, reject) => {
    const script = document.createElement('script');

    // This will catch errors during synchronous JS execution, including syntax errors.
    const handleWindowError = event => {
        if (document.currentScript !== script) {
            // Some other script is running, not us.
            return;
        }
        if (event.error instanceof Error) {
            reject(new Error(`${urlForLogs(url)} encountered runtime error: ${event.error}`, {
                cause: event.error
            }));
        } else {
            // Browser hides details for cross-site scripts.
            reject(new Error(`${urlForLogs(url)} encountered runtime error: ${event.message}`));
        }
    };

    const removeWindowErrorHandler = () => {
        window.removeEventListener('error', handleWindowError);
    };
    window.addEventListener('error', handleWindowError);

    script.onload = () => {
        // When this fires, synchronous execution is done.
        removeWindowErrorHandler();
        resolve();
    };

    // This will catch errors before the JS can be executed at all.
    script.onerror = () => {
        removeWindowErrorHandler();
        reject(new Error(`${urlForLogs(url)} could not be loaded, usually due to a network error`));
    };

    script.src = url;
    document.body.appendChild(script);
});

module.exports = loadScriptElement;
