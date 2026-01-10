/**
 * @param {unknown} obj
 * @returns {boolean}
 */
const defined = obj => typeof obj !== 'undefined' && obj !== null;

/**
 * @typedef JSDelta Delta object using regular JS object.
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
 * @property {() => JSDelta} toJS
 */

/**
 * @typedef {JSDelta|ImmutableJSDelta} ExternalDelta Delta object that might be JS or immutable.js.
 */

/**
 * @implements {JSDelta}
 */
class MonitorRecord {
    /**
     * @param {JSDelta} delta
     */
    constructor (delta) {
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
     * @param {JSDelta} delta
     * @returns {boolean} true if modified
     */
    merge (delta) {
        let didChange = false;

        if (defined(delta.id) && !Object.is(this.id, delta.id)) {
            this.id = delta.id;
            didChange = true;
        }

        if (defined(delta.spriteName) && !Object.is(this.spriteName, delta.spriteName)) {
            this.spriteName = delta.spriteName;
            didChange = true;
        }

        if (defined(delta.targetId) && !Object.is(this.targetId, delta.targetId)) {
            this.targetId = delta.targetId;
            didChange = true;
        }

        if (defined(delta.opcode) && !Object.is(this.opcode, delta.opcode)) {
            this.opcode = delta.opcode;
            didChange = true;
        }

        if (defined(delta.value) && !Object.is(this.value, delta.value)) {
            this.value = delta.value;
            didChange = true;
        }

        if (defined(delta.params) && !Object.is(this.params, delta.params)) {
            this.params = delta.params;
            didChange = true;
        }

        if (defined(delta.mode) && !Object.is(this.mode, delta.mode)) {
            this.mode = delta.mode;
            didChange = true;
        }

        if (defined(delta.sliderMin) && !Object.is(this.sliderMin, delta.sliderMin)) {
            this.sliderMin = delta.sliderMin;
            didChange = true;
        }

        if (defined(delta.sliderMax) && !Object.is(this.sliderMax, delta.sliderMax)) {
            this.sliderMax = delta.sliderMax;
            didChange = true;
        }

        if (defined(delta.isDiscrete) && !Object.is(this.isDiscrete, delta.isDiscrete)) {
            this.isDiscrete = delta.isDiscrete;
            didChange = true;
        }

        if (defined(delta.x) && !Object.is(this.x, delta.x)) {
            this.x = delta.x;
            didChange = true;
        }

        if (defined(delta.y) && !Object.is(this.y, delta.y)) {
            this.y = delta.y;
            didChange = true;
        }

        if (defined(delta.width) && !Object.is(this.width, delta.width)) {
            this.width = delta.width;
            didChange = true;
        }

        if (defined(delta.height) && !Object.is(this.height, delta.height)) {
            this.height = delta.height;
            didChange = true;
        }

        if (defined(delta.visible) && !Object.is(this.visible, delta.visible)) {
            this.visible = delta.visible;
            didChange = true;
        }

        return didChange;
    }
}

/**
 * For compatibility, converts an immutable.js delta received from consumer to a plain JS delta for internal use.
 * @param {ExternalDelta} obj
 * @returns {JSDelta}
 */
MonitorRecord.externalDeltaToJS = obj => {
    if (typeof obj.toJS === 'function') {
        return obj.toJS();
    }
    return obj;
};

module.exports = MonitorRecord;
