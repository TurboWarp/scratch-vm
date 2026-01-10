/**
 * Check equality in the following way:
 *  - NaN is considered equal to NaN
 *  - 0 is considered not equal to -0
 *  - Otherwise, uses ===
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean} true if a is considered equal to b
 */
const equal = (a, b) => {
    if (a === b) {
        if (a === 0) {
            return Object.is(a, b);
        }
        return true;
    }
    return Number.isNaN(a) && Number.isNaN(b);
};

/**
 * @param {unknown} obj
 * @returns {boolean}
 */
const shouldMerge = obj => typeof obj !== 'undefined' && obj !== null;

/**
 * @typedef PartialRecord
 * @property {string|null} [id]
 * @property {string|null} [spriteName]
 * @property {string|null} [targetId]
 * @property {string|null} [opcode]
 * @property {unknown} [value]
 * @property {unknown} [params]
 * @property {string|null} [mode]
 * @property {number|null} [sliderMin]
 * @property {number|null} [sliderMax]
 * @property {boolean|null} [isDiscrete]
 * @property {number|null} [x]
 * @property {number|null} [y]
 * @property {number|null} [width]
 * @property {number|null} [height]
 * @property {boolean|null} [visible]
 */

/**
 * @implements {PartialRecord}
 */
class MonitorRecord {
    /**
     * @param {PartialRecord} partial
     */
    constructor (partial) {
        /**
         * Block ID
         */
        this.id = partial.id ?? null;
        /**
         * Present only if the monitor is sprite-specific, such as x position
         */
        this.spriteName = partial.spriteName ?? null;
        /**
         * Present only if the monitor is sprite-specific, such as x position
         */
        this.targetId = partial.targetId ?? null;
        this.opcode = partial.opcode ?? null;
        this.value = partial.value ?? null;
        this.params = partial.params ?? null;
        this.mode = partial.mode ?? 'default';
        this.sliderMin = partial.sliderMin ?? 0;
        this.sliderMax = partial.sliderMax ?? 100;
        this.isDiscrete = partial.isDiscrete ?? true;
        /**
         * (x: null, y: null) Indicates that the monitor should be auto-positioned
         */
        this.x = partial.x ?? null;
        /**
         * (x: null, y: null) Indicates that the monitor should be auto-positioned
         */
        this.y = partial.y ?? null;
        this.width = partial.width ?? 0;
        this.height = partial.height ?? 0;
        this.visible = partial.visible ?? true;
    }

    /**
     * @param {string} property
     */
    get (property) {
        switch (property) {
        case 'id': return this.id;
        case 'spriteName': return this.spriteName;
        case 'targetId': return this.targetId;
        case 'opcode': return this.opcode;
        case 'value': return this.value;
        case 'params': return this.params;
        case 'mode': return this.mode;
        case 'sliderMin': return this.sliderMin;
        case 'sliderMax': return this.sliderMax;
        case 'isDiscrete': return this.isDiscrete;
        case 'x': return this.x;
        case 'y': return this.y;
        case 'width': return this.width;
        case 'height': return this.height;
        case 'visible': return this.visible;
        }
        return null;
    }

    /**
     * @param {MonitorRecord} otherRecord A different MonitorRecord
     * @returns {boolean}
     */
    equals (otherRecord) {
        return (
            equal(this.id, otherRecord.id) &&
            equal(this.spriteName, otherRecord.spriteName) &&
            equal(this.targetId, otherRecord.targetId) &&
            equal(this.opcode, otherRecord.opcode) &&
            equal(this.value, otherRecord.value) &&
            equal(this.params, otherRecord.params) &&
            equal(this.mode, otherRecord.mode) &&
            equal(this.sliderMin, otherRecord.sliderMin) &&
            equal(this.sliderMax, otherRecord.sliderMax) &&
            equal(this.isDiscrete, otherRecord.isDiscrete) &&
            equal(this.x, otherRecord.x) &&
            equal(this.y, otherRecord.y) &&
            equal(this.width, otherRecord.width) &&
            equal(this.height, otherRecord.height) &&
            equal(this.visible, otherRecord.visible)
        );
    }

    /**
     * @param {PartialRecord} partial
     * @returns {MonitorRecord}
     */
    merge (partial) {
        if (shouldMerge(partial.id)) {
            this.id = partial.id;
        }
        if (shouldMerge(partial.spriteName)) {
            this.spriteName = partial.spriteName;
        }
        if (shouldMerge(partial.targetId)) {
            this.targetId = partial.targetId;
        }
        if (shouldMerge(partial.opcode)) {
            this.opcode = partial.opcode;
        }
        if (shouldMerge(partial.value)) {
            this.value = partial.value;
        }
        if (shouldMerge(partial.params)) {
            this.params = partial.params;
        }
        if (shouldMerge(partial.mode)) {
            this.mode = partial.mode;
        }
        if (shouldMerge(partial.sliderMin)) {
            this.sliderMin = partial.sliderMin;
        }
        if (shouldMerge(partial.sliderMax)) {
            this.sliderMax = partial.sliderMax;
        }
        if (shouldMerge(partial.isDiscrete)) {
            this.isDiscrete = partial.isDiscrete;
        }
        if (shouldMerge(partial.x)) {
            this.x = partial.x;
        }
        if (shouldMerge(partial.y)) {
            this.y = partial.y;
        }
        if (shouldMerge(partial.width)) {
            this.width = partial.width;
        }
        if (shouldMerge(partial.height)) {
            this.height = partial.height;
        }
        if (shouldMerge(partial.visible)) {
            this.visible = partial.visible;
        }
    }
}

module.exports = MonitorRecord;
