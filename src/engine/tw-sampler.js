/* global SharedArrayBuffer */

/**
 * @fileoverview
 *
 * Sampler is the more accurate performance profiling tool. It's more meaningful than the legacy Profiler.
 *
 * It also revolved around one SharedArrayBuffer that stores a single integer. That integer represents the block being
 * executed and can be converted back to block ID / sprite ID via simple lookup later. This approach keeps the
 * performance impact of profiling extremely minimal and avoids structurally changing the generated JS enough that the
 * benchmark data becomes meaningless.
 *
 * To measure performance, a worker is running a high frequency loop checking the latest value from the
 * SharedArrayBuffer and counting how often it sees each number. Workers can use Atomics instead of setInterval/Timeout
 * to make a high frequency timer.
 *
 * Previous approaches tried to do a `performance.now()` between every block. The end result of that was all you were
 * measuring was "how often does this block run" because the overhead of getting the time was orders of magnitude
 * larger than even slow lines in the typical projec.t
 *
 * This class only implements the tracking part. Implementors that want to collect data are responsible for spinning
 * up their worker with an appropriate frequency.
 *
 * To use SharedArrayBuffer, browsers force the web page to set some headers. The least invasive way to do that is
 * by setting Document-Isolation-Policy: isolate-and-credentialless. COOP/COEP are too invasive for most websites to
 * try opting into, unfortunately, but this new header has minimal downsides for us since we generally won't have any
 * third-party credentials to be sending anyway.
 */

class Sampler {
    // Reserved values get negative location IDs.
    // Blocks get everything else.
    static IDLE = -1;
    static RUNTIME = -2;
    static RENDERER = -3;
    static WARP_TIMER = -4;

    static LEVEL_BASIC = 1;
    static LEVEL_COMMANDS = 2;

    constructor (runtime) {
        this.runtime = runtime;

        /**
         * The shared array buffer that store the current block. Stores 1 integer. Created lazily.
         * @type {Int32Array|null}
         * @public
         */
        this.pc = null;

        /**
         * General "runtime" vs "renderer" sampling.
         */
        this.enableBasic = false;

        /**
         * Per-command sampling. Implies basic.
         */
        this.enableCommands = false;

        /**
         * Maps location ID to what it represents.
         * @type {Array<{blockId: string; spriteId: string;}>}
         */
        this.locations = [];

        /**
         * Maps sprite ID -> block ID -> location ID.
         * @type {Map<string, Map<string, number>>}
         */
        this.blockLocations = new Map();
    }

    /**
     * Only checks sampling-time requirements. It doesn't check that a Worker will have required high-precision
     * wait APIs for doing a reasonable timer, or that performance.now() will be precise enough.
     * @returns {boolean}
     */
    isAvailable () {
        return typeof SharedArrayBuffer === 'function';
    }

    /**
     * Change enableness for newly-started scripts.
     * Do not call during a VM step. It must be called between.
     * @param {number} level See LEVEL_* constants.
     */
    setEnabled (level) {
        if (level > 0 && !this.isAvailable()) {
            throw new Error('Sampler is not available');
        }

        if (this.pc === null && level > 0) {
            this.pc = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
        }

        this.enableBasic = level >= Sampler.LEVEL_BASIC;
        this.enableCommands = level >= Sampler.LEVEL_COMMANDS;

        this.runtime.resetAllCaches();
    }

    /**
     * @param {string} spriteId ID of the original target (not a clone) that owns the block.
     * @param {string} blockId
     * @returns {number} Location ID. Same block always gets the same ID.
     */
    blockToLocation (spriteId, blockId) {
        let spriteLocations = this.blockLocations.get(spriteId);
        if (!spriteLocations) {
            spriteLocations = new Map();
            this.blockLocations.set(spriteId, spriteLocations);
        }

        let location = spriteLocations.get(blockId);
        if (typeof location === 'undefined') {
            this.locations.push({
                blockId,
                spriteId
            });
            location = this.locations.length - 1;
            spriteLocations.set(blockId, location);
        }
        return location;
    }

    /**
     * @param {number} location
     * @returns {{blockId: string; spriteId: string;}}
     */
    locationToBlock (location) {
        if (location < 0) {
            throw new Error(`Tried to get block from a reserved location ID`);
        }
        return this.locations[location];
    }
}

module.exports = Sampler;
