/**
 * @template T
 */
class CancellableMutex {
    constructor () {
        /**
         * True if the mutex is locked.
         * @type {boolean}
         * @private
         */
        this._locked = false;

        /**
         * Queued operations.
         * @type {Array<(isCancelled: () => boolean) => Promise<T>>}
         */
        this._queue = [];

        /**
         * @type {number}
         */
        this._cancels = 0;
    }

    /**
     * Perform async operation using the lock. Will wait until the lock is available.
     * @param {(isCancelled: () => boolean) => Promise<T>} callback Async function to run. May resolve or reject.
     * @returns {Promise<T>} Resolves or rejects with value or error from callback.
     */
    do (callback) {
        return new Promise((resolve, reject) => {
            const initialCancels = this._cancels;
            const isCancelled = () => initialCancels !== this._cancels;

            const startNextOperation = () => {
                if (isCancelled()) {
                    return;
                }

                if (this._queue.length) {
                    const nextCallback = this._queue.shift();
                    nextCallback();
                } else {
                    this._locked = false;
                    this._cancelCallback = null;
                }
            };

            const handleResolve = value => {
                resolve(value);
                startNextOperation();
            };

            const handleReject = error => {
                reject(error);
                startNextOperation();
            };

            const run = async () => {
                try {
                    handleResolve(await callback(isCancelled));
                } catch (error) {
                    handleReject(error);
                }
            };

            if (this._locked) {
                this._queue.push(run);
            } else {
                this._locked = true;
                run();
            }
        });
    }

    cancel () {
        this._cancels++;
        this._locked = false;
        this._queue = [];
    }
}

module.exports = CancellableMutex;
