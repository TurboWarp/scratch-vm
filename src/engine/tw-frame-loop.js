// Due to the existence of features such as interpolation and "0 FPS" being treated as "screen refresh rate",
// The VM loop logic has become much more complex

// Use setTimeout to polyfill requestAnimationFrame in Node.js environments
const _requestAnimationFrame = typeof requestAnimationFrame === 'function' ?
    requestAnimationFrame :
    (f => setTimeout(f, 1000 / 60));
const _cancelAnimationFrame = typeof requestAnimationFrame === 'function' ?
    cancelAnimationFrame :
    clearTimeout;

/**
 * @typedef Loop
 * @property {() => void} cancel
 */

/**
 * Wrapper around requestAnimationFrame(), easier to cancel
 * @param {() => void} callback
 * @returns {Loop}
 */
const animationFrameWrapper = callback => {
    let id;
    const handle = () => {
        id = _requestAnimationFrame(handle);
        callback();
    };
    const cancel = () => _cancelAnimationFrame(id);
    id = _requestAnimationFrame(handle);
    return {
        cancel
    };
};

/**
 * Wrapper around repeated setTimeout(), easier to cancel.
 *
 * This is NOT the same as setInterval(). If browsers implemented setInterval() as the spec says, they
 * would wait to schedule the next iteration until after the callback runs, so any large operations would
 * cause the interval to run behind. The browsers realized that websites don't want that, so they added
 * lag compensation and other things. It seems that if we schedule the next timeout ourselves and do so
 * before we run the callback, we get less randomness in frame timing.
 *
 * @param {() => void} callback
 * @param {number} period Intended milliseconds between runs
 * @returns {Loop}
 */
const setTimeoutLoopWrapper = (callback, period) => {
    let id;
    const handle = () => {
        id = setTimeout(handle, period);
        callback();
    };
    const cancel = () => clearTimeout(id);
    id = setTimeout(handle, period);
    return {
        cancel
    };
};

/**
 * We've found that having an empty requestAnimationFrame loop running in the background improves frame
 * pacing in many situations.
 *
 * Having an extra loop running increases CPU usage and battery usage even if it's not doing anything.
 * So, we only do this when the intended framerate is high enough that the user clearly wants smooth
 * motion, and only if the user is on a platform where we have evidence that this helps:
 *
 * Chrome on Windows: We think this is related to timer precision, where using rAF might be making Chrome
 * give us a more precise timer.
 * See https://github.com/TurboWarp/scratch-vm/issues/257.
 *
 * Chrome on Android. Chrome throttles frame production when it does not believe there is an animation
 * happening. setInterval does not count as an animation, but rAF does.
 * See https://github.com/TurboWarp/scratch-vm/issues/343.
 *
 * @param {number} framerate Intended framerate
 * @returns {boolean} true if no-op animation frame loop should be used
 */
const shouldUseNoopAnimationFrame = framerate =>
    framerate >= 30 && navigator.userAgent.includes('Chrome') && (
        navigator.userAgent.includes('Windows') ||
        navigator.userAgent.includes('Android')
    );

class FrameLoop {
    constructor (runtime) {
        this.runtime = runtime;
        this.running = false;
        this.setFramerate(30);
        this.setInterpolation(false);

        this.stepCallback = this.stepCallback.bind(this);
        this.interpolationCallback = this.interpolationCallback.bind(this);

        /** @type {Loop|null} */
        this.interpolationLoop = null;
        /** @type {Loop|null} */
        this.stepLoop = null;
        /** @type {Loop|null} */
        this.noopLoop = null;
    }

    setFramerate (fps) {
        this.framerate = fps;
        this._restart();
    }

    setInterpolation (interpolation) {
        this.interpolation = interpolation;
        this._restart();
    }

    stepCallback () {
        this.runtime._step();
    }

    interpolationCallback () {
        this.runtime._renderInterpolatedPositions();
    }

    noopCallback () {
        // intentional no-op, see shouldUseNoopAnimationFrame()
    }

    _restart () {
        if (this.running) {
            this.stop();
            this.start();
        }
    }

    start () {
        this.running = true;
        if (this.framerate === 0) {
            this.stepLoop = animationFrameWrapper(this.stepCallback);
            this.runtime.currentStepTime = 1000 / 60;
        } else {
            this.stepLoop = setTimeoutLoopWrapper(this.stepCallback, 1000 / this.framerate);
            // Interpolation should never be enabled when framerate === 0 as that's just redundant
            if (this.interpolation) {
                this.interpolationLoop = animationFrameWrapper(this.interpolationCallback);
            } else if (shouldUseNoopAnimationFrame(this.framerate)) {
                this.noopLoop = animationFrameWrapper(this.noopCallback);
            }
            this.runtime.currentStepTime = 1000 / this.framerate;
        }
    }

    stop () {
        this.running = false;
        if (this.stepLoop) {
            this.stepLoop.cancel();
            this.stepLoop = null;
        }
        if (this.interpolationLoop) {
            this.interpolationLoop.cancel();
            this.interpolationLoop = null;
        }
        if (this.noopLoop) {
            this.noopLoop.cancel();
            this.noopLoop = null;
        }
    }
}

module.exports = FrameLoop;
