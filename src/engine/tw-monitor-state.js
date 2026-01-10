/**
 * @typedef {import('./monitor-record')} MonitorRecord
 */

const MonitorRecord = require('./monitor-record');

class MonitorState {
    constructor () {
        /**
         * @type {Map<string, MonitorRecord>}
         */
        this.map = new Map();

        /**
         * True if modified.
         * @type {boolean}
         */
        this.dirty = false;
    }

    /**
     * @param {string} id
     * @returns {MonitorRecord|null}
     */
    get (id) {
        return this.map.get(id);
    }

    /**
     * @param {string} id
     * @returns {boolean}
     */
    has (id) {
        return this.map.has(id);
    }

    /**
     * Create or update.
     * @param {string} id
     * @param {MonitorRecord.JSDelta} delta
     */
    set (id, delta) {
        if (this.map.has(id)) {
            const oldRecord = this.map.get(id);
            if (oldRecord.merge(delta)) {
                this.dirty = true;
            }
        } else {
            this.map.set(id, delta instanceof MonitorRecord ? delta : new MonitorRecord(delta));
            this.dirty = true;
        }
    }

    /**
     * @param {string} id
     */
    delete (id) {
        if (this.map.has(id)) {
            this.map.delete(id);
            this.dirty = true;
        }
    }

    /**
     * Removes monitors that do not satisfy callback.
     * @param {(record: MonitorRecord) => boolean} callback Returns true to keep.
     */
    filter (callback) {
        for (const id of Array.from(this.map.keys())) {
            const record = this.map.get(id);
            if (!callback(record)) {
                this.map.delete(id);
                this.dirty = true;
            }
        }
    }

    /**
     * @returns {boolean} true if no monitors
     */
    empty () {
        return this.map.size === 0;
    }

    /**
     * @returns {number}
     */
    get size () {
        return this.map.size;
    }

    /**
     * @returns {MonitorRecord[]}
     */
    values () {
        return Array.from(this.map.values());
    }

    /**
     * For compatibility with immutable.js.
     * @returns {MonitorRecord[]}
     */
    valueSeq () {
        return this.values();
    }

    /**
     * You should not perform write operations on the clone.
     * @returns {MonitorState}
     */
    shallowClone () {
        const result = new MonitorState();
        result.map = this.map;
        return result;
    }
}

module.exports = MonitorState;
