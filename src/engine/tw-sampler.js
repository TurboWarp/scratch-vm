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
    // Reserved values get the first location IDs.
    // Blocks get everything from FIRST_BLOCK onwards.
    static IDLE = 0;
    static RUNTIME = 1;
    static RENDERER = 2;
    static WARP_TIMER = 3;
    static UNPROFILED = 4;
    static GUI_UPDATES = 5;
    static FIRST_BLOCK = 6;

    static LEVEL_BASIC = 1;
    static LEVEL_COMMANDS = 2;
    static LEVEL_COUNTS = 3;

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
         * Per-command execution counting. Implies commands.
         */
        this.enableCounts = false;

        /**
         * Maps location ID to what it represents. Reserved locations are null.
         * @type {Array<{blockId: string; spriteId: string;}|null>}
         */
        this.locations = [];

        /**
         * Maps sprite ID -> block ID -> location ID.
         * @type {Map<string, Map<string, number>>}
         */
        this.blockLocations = new Map();

        /**
         * Maps location ID to how many times it was entered. Only updated when enableCounts is set.
         * @type {number[]}
         */
        this.counts = [];

        for (let i = 0; i < Sampler.FIRST_BLOCK; i++) {
            this.locations.push(null);
            this.counts.push(0);
        }
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
        this.enableCounts = level >= Sampler.LEVEL_COUNTS;

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
            this.counts.push(0);
            location = this.locations.length - 1;
            spriteLocations.set(blockId, location);
        }
        return location;
    }

    /**
     * Mark that a reserved location is now running.
     * @param {number} location One of the reserved location constants.
     */
    enterReserved (location) {
        if (this.enableBasic) {
            this.pc[0] = location;
        }
    }

    /**
     * Mark that a reserved location is now running and count it.
     * @param {number} location One of the reserved location constants.
     */
    incrementReserved (location) {
        if (this.enableBasic) {
            this.pc[0] = location;
        }
        if (this.enableCounts) {
            this.counts[location]++;
        }
    }

    /**
     * Set all execution counts back to zero.
     */
    resetCounts () {
        this.counts.fill(0);
    }

    /**
     * @param {number} location
     * @returns {{blockId: string; spriteId: string;}}
     */
    locationToBlock (location) {
        if (location < Sampler.FIRST_BLOCK) {
            throw new Error(`Tried to get block from a reserved location ID`);
        }
        return this.locations[location];
    }
}

module.exports = Sampler;
