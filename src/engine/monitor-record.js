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
const defined = obj => typeof obj !== 'undefined' && obj !== null;

/**
 * For compatibility, converts an immutable.js delta to a plain JS delta.
 * @param {Delta} obj
 * @returns {JSDelta}
 */
const toJSDelta = obj => {
    if (typeof obj?.toJS === 'function') {
        return obj.toJS();
    }
    return obj;
};

/**
 * @typedef JSDelta Delta object using regular properties.
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
 * @typedef ImmutableJSDelta Delta object that is an immutable.js Map/OrderedMap.
 * @property {() => Delta} toJS
 */

/**
 * @typedef {JSDelta|ImmutableJSDelta} Delta
 */

/**
 * @implements {JSDelta}
 */
class MonitorRecord {
    /**
     * @param {Delta} delta
     */
    constructor (delta) {
        delta = toJSDelta(delta);

        /**
         * Block ID
         */
        this.id = delta.id ?? null;
        /**
         * Present only if the monitor is sprite-specific, such as x position
         */
        this.spriteName = delta.spriteName ?? null;
        /**
         * Present only if the monitor is sprite-specific, such as x position
         */
        this.targetId = delta.targetId ?? null;
        this.opcode = delta.opcode ?? null;
        this.value = delta.value ?? null;
        this.params = delta.params ?? null;
        this.mode = delta.mode ?? 'default';
        this.sliderMin = delta.sliderMin ?? 0;
        this.sliderMax = delta.sliderMax ?? 100;
        this.isDiscrete = delta.isDiscrete ?? true;
        /**
         * (x: null, y: null) Indicates that the monitor should be auto-positioned
         */
        this.x = delta.x ?? null;
        /**
         * (x: null, y: null) Indicates that the monitor should be auto-positioned
         */
        this.y = delta.y ?? null;
        this.width = delta.width ?? 0;
        this.height = delta.height ?? 0;
        this.visible = delta.visible ?? true;
    }

    /**
     * Exists for compatibility with code expecting an immutable.js Map
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
     * @param {Delta} delta
     * @returns {boolean} true if modified
     */
    merge (delta) {
        delta = toJSDelta(delta);
        let didChange = false;

        if (defined(delta.id) && !equal(this.id, delta.id)) {
            this.id = delta.id;
            didChange = true;
        }

        if (defined(delta.spriteName) && !equal(this.spriteName, delta.spriteName)) {
            this.spriteName = delta.spriteName;
            didChange = true;
        }

        if (defined(delta.targetId) && !equal(this.targetId, delta.targetId)) {
            this.targetId = delta.targetId;
            didChange = true;
        }

        if (defined(delta.opcode) && !equal(this.opcode, delta.opcode)) {
            this.opcode = delta.opcode;
            didChange = true;
        }

        if (defined(delta.value) && !equal(this.value, delta.value)) {
            this.value = delta.value;
            didChange = true;
        }

        if (defined(delta.params) && !equal(this.params, delta.params)) {
            this.params = delta.params;
            didChange = true;
        }

        if (defined(delta.mode) && !equal(this.mode, delta.mode)) {
            this.mode = delta.mode;
            didChange = true;
        }

        if (defined(delta.sliderMin) && !equal(this.sliderMin, delta.sliderMin)) {
            this.sliderMin = delta.sliderMin;
            didChange = true;
        }

        if (defined(delta.sliderMax) && !equal(this.sliderMax, delta.sliderMax)) {
            this.sliderMax = delta.sliderMax;
            didChange = true;
        }

        if (defined(delta.isDiscrete) && !equal(this.isDiscrete, delta.isDiscrete)) {
            this.isDiscrete = delta.isDiscrete;
            didChange = true;
        }

        if (defined(delta.x) && !equal(this.x, delta.x)) {
            this.x = delta.x;
            didChange = true;
        }

        if (defined(delta.y) && !equal(this.y, delta.y)) {
            this.y = delta.y;
            didChange = true;
        }

        if (defined(delta.width) && !equal(this.width, delta.width)) {
            this.width = delta.width;
            didChange = true;
        }

        if (defined(delta.height) && !equal(this.height, delta.height)) {
            this.height = delta.height;
            didChange = true;
        }

        if (defined(delta.visible) && !equal(this.visible, delta.visible)) {
            this.visible = delta.visible;
            didChange = true;
        }

        return didChange;
    }
}

module.exports = MonitorRecord;
