/**
 * @typedef {import('./monitor-record')} MonitorRecord
 */

const MonitorRecord = require('./monitor-record');

class MonitorState {
    constructor () {
        /**
         * @type {Map<string, MonitorRecord>}
         */
        this._map = new Map();

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
        return this._map.get(id);
    }

    /**
     * @param {string} id
     * @returns {boolean}
     */
    has (id) {
        return this._map.has(id);
    }

    /**
     * Create or update.
     * @param {string} id
     * @param {MonitorRecord.PartialRecord} partial
     */
    set (id, partial) {
        if (this._map.has(id)) {
            const oldRecord = this._map.get(id);
            const newRecord = new MonitorRecord(this._map.get(id));
            newRecord.merge(partial);
            if (!newRecord.equals(oldRecord)) {
                this._map.set(id, newRecord);
                this.dirty = true;
            }
        } else {
            this._map.set(id, partial instanceof MonitorRecord ? partial : new MonitorRecord(partial));
            this.dirty = true;
        }
    }

    /**
     * @param {string} id
     */
    delete (id) {
        if (this._map.has(id)) {
            this._map.delete(id);
            this.dirty = true;
        }
    }

    /**
     * @param {(record: MonitorRecord) => boolean} callback Returns true to keep.
     */
    filter (callback) {
        for (const id of Array.from(this._map.keys())) {
            const record = this._map.get(id);
            if (!callback(record)) {
                this._map.delete(id);
                this.dirty = true;
            }
        }
    }

    /**
     * @returns {boolean} true if no monitors
     */
    empty () {
        return this._map.size === 0;
    }

    /**
     * @returns {number}
     */
    get size () {
        return this._map.size;
    }

    /**
     * @returns {Iterable<MonitorRecord>}
     */
    values () {
        return this._map.values();
    }

    /**
     * @param {MonitorState} otherMonitorState Another MonitorState
     * @returns {boolean}
     */
    equals (otherMonitorState) {
        if (this._map.size !== otherMonitorState._map.size) {
            return false;
        }

        for (const id of this._map.keys()) {
            const otherRecord = otherMonitorState._map.get(id);
            if (!otherRecord) {
                return false;
            }

            const myRecord = this._map.get(id);
            if (!myRecord.equals(otherRecord)) {
                return false;
            }
        }

        return true;
    }
}

module.exports = MonitorState;
