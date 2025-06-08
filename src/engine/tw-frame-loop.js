// Due to the existence of features such as interpolation and "0 FPS" being treated as "screen refresh rate",
// The VM loop logic has become much more complex

/**
 * Numeric ID for RenderWebGL.draw in Profiler instances.
 * @type {number}
 */
let rendererDrawProfilerId = -1;

// Use setTimeout to polyfill requestAnimationFrame in Node.js environments
const _requestAnimationFrame =
    typeof requestAnimationFrame === 'function' ?
        requestAnimationFrame :
        f => setTimeout(f, 1000 / 60);
const _cancelAnimationFrame =
    typeof requestAnimationFrame === 'function' ?
        cancelAnimationFrame :
        clearTimeout;

const taskWrapper = (callback, requestFn, cancelFn, manualInterval) => {
    let id;
    let cancelled = false;
    const handle = () => {
        if (manualInterval) id = requestFn(handle);
        callback();
    };
    const cancel = () => {
        if (!cancelled) cancelFn(id);
        cancelled = true;
    };
    id = requestFn(handle);
    return {
        cancel
    };
};

class FrameLoop {
    constructor (runtime) {
        this.runtime = runtime;
        this.running = false;
        this.setFramerate(30);
        this.setInterpolation(false);
        this._lastRenderTime = 0;
        this._lastStepTime = 0;

        this._stepInterval = null;
        this._renderInterval = null;
    }

    now () {
        return (performance || Date).now();
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
        this._lastStepTime = this.now();
    }

    stepImmediateCallback () {
        if (this.now() - this._lastStepTime >= this.runtime.currentStepTime) {
            this.runtime._step();
            this._lastStepTime = this.now();
        }
    }

    renderCallback () {
        if (this.runtime.renderer) {
            const renderTime = this.now();
            if (this.interpolation && this.framerate !== 0) {
                if (!document.hidden) {
                    this.runtime._renderInterpolatedPositions();
                }
                this.runtime.screenRefreshTime = renderTime - this._lastRenderTime; // Screen refresh time (from rate)
                this._lastRenderTime = renderTime;
            } else if (
                this.framerate === 0 ||
                renderTime - this._lastRenderTime >=
                this.runtime.currentStepTime
            ) {
                // @todo: Only render when this.redrawRequested or clones rendered.
                if (this.runtime.profiler !== null) {
                    if (rendererDrawProfilerId === -1) {
                        rendererDrawProfilerId =
                            this.runtime.profiler.idByName('RenderWebGL.draw');
                    }
                    this.runtime.profiler.start(rendererDrawProfilerId);
                }
                // tw: do not draw if document is hidden or a rAF loop is running
                // Checking for the animation frame loop is more reliable than using
                // interpolationEnabled in some edge cases
                if (!document.hidden) {
                    this.runtime.renderer.draw();
                }
                if (this.runtime.profiler !== null) {
                    this.runtime.profiler.stop();
                }
                this.runtime.screenRefreshTime = renderTime - this._lastRenderTime; // Screen refresh time (from rate)
                this._lastRenderTime = renderTime;
                if (this.framerate === 0) {
                    this.runtime.currentStepTime = this.runtime.screenRefreshTime;
                }
            }
        }
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
            this._stepInterval = this._renderInterval = taskWrapper(
                (() => {
                    this.stepCallback();
                    this.renderCallback();
                }),
                _requestAnimationFrame,
                _cancelAnimationFrame,
                true
            );
            this.runtime.currentStepTime = 0;
        } else {
            // Interpolation should never be enabled when framerate === 0 as that's just redundant
            this._renderInterval = taskWrapper(
                this.renderCallback.bind(this),
                _requestAnimationFrame,
                _cancelAnimationFrame,
                true
            );
            if (this.framerate > 250 && global.setImmediate && global.clearImmediate) {
                // High precision implementation via setImmediate (polyfilled)
                // bug: very unfriendly to DevTools
                this._stepInterval = taskWrapper(
                    this.stepImmediateCallback.bind(this),
                    global.setImmediate,
                    global.clearImmediate,
                    true
                );
            } else {
                this._stepInterval = taskWrapper(
                    this.stepCallback.bind(this),
                    fn => setInterval(fn, 1000 / this.framerate),
                    clearInterval,
                    false
                );
            }
            this.runtime.currentStepTime = 1000 / this.framerate;
        }
    }

    stop () {
        this.running = false;
        this._renderInterval.cancel();
        this._stepInterval.cancel();
    }
}

module.exports = FrameLoop;
