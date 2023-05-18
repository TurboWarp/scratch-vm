/* eslint-env worker */

const ScratchCommon = require('./tw-extension-api-common');
const dispatch = require('../dispatch/worker-dispatch');
const log = require('../util/log');
const {isWorker} = require('./tw-extension-worker-context');
const createTranslate = require('./tw-l10n');

const translate = createTranslate(null);

const loadScripts = url => {
    if (isWorker) {
        importScripts(url);
    } else {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.onload = () => resolve();
            script.onerror = () => {
                reject(new Error(`Error in sandboxed script: ${url}. Check the console for more information.`));
            };
            script.src = url;
            document.body.appendChild(script);
        });
    }
};

class ExtensionWorker {
    constructor () {
        this.nextExtensionId = 0;

        this.initialRegistrations = [];

        this.firstRegistrationPromise = new Promise(resolve => {
            this.firstRegistrationCallback = resolve;
        });

        dispatch.waitForConnection.then(() => {
            dispatch.call('extensions', 'allocateWorker').then(async x => {
                const [id, extension] = x;
                this.workerId = id;

                try {
                    await loadScripts(extension);
                    await this.firstRegistrationPromise;

                    const initialRegistrations = this.initialRegistrations;
                    this.initialRegistrations = null;

                    Promise.all(initialRegistrations).then(() => dispatch.call('extensions', 'onWorkerInit', id));
                } catch (e) {
                    log.error(e);
                    dispatch.call('extensions', 'onWorkerInit', id, `${e}`);
                }
            });
        });

        this.extensions = [];
    }

    register (extensionObject) {
        const extensionId = this.nextExtensionId++;
        this.extensions.push(extensionObject);
        const serviceName = `extension.${this.workerId}.${extensionId}`;
        const promise = dispatch.setService(serviceName, extensionObject)
            .then(() => dispatch.call('extensions', 'registerExtensionService', serviceName));
        if (this.initialRegistrations) {
            this.firstRegistrationCallback();
            this.initialRegistrations.push(promise);
        }
        return promise;
    }
}

global.Scratch = global.Scratch || {};
Object.assign(global.Scratch, ScratchCommon, {
    canFetch: () => Promise.resolve(true),
    fetch: (url, options) => fetch(url, options),
    canOpenWindow: () => Promise.resolve(false),
    openWindow: () => Promise.reject(new Error('Scratch.openWindow not supported in sandboxed extensions')),
    canRedirect: () => Promise.resolve(false),
    redirect: () => Promise.reject(new Error('Scratch.redirect not supported in sandboxed extensions')),
    translate
});

/**
 * Expose only specific parts of the worker to extensions.
 */
const extensionWorker = new ExtensionWorker();
global.Scratch.extensions = {
    register: extensionWorker.register.bind(extensionWorker)
};

global.ScratchExtensions = require('./tw-scratchx-compatibility-layer');
