/**
 * @fileoverview
 * Object representing a Scratch variable.
 */

const uid = require('../util/uid');
const xmlEscape = require('../util/xml-escape');

class Variable {
    /**
     * Do not new() this class directly - use Variable.create instead.
     * @param {string | null} id Id of the variable.
     * @param {string} name Name of the variable.
     * @param {string} type Type of the variable, one of '' or 'list'
     * @param {boolean} isCloud Whether the variable is stored in the cloud.
     * @constructor
     */
    constructor (id, name, type, isCloud) {
        /** @type {string} */
        this.id = id || uid();
        this.name = name;
        this.type = type;
        this.isCloud = isCloud;
        switch (this.type) {
        case Variable.SCALAR_TYPE:
            this.value = 0;
            break;
        case Variable.LIST_TYPE:
            this.value = [];
            break;
        case Variable.BROADCAST_MESSAGE_TYPE:
            this.value = this.name;
            break;
        default:
            throw new Error(`Invalid variable type: ${this.type}`);
        }
    }

    /**
     * Create a new variable.
     * @param {string | null} id Id of the variable.
     * @param {string} name Name of the variable.
     * @param {string} type Type of the variable, one of '' or 'list'
     * @param {boolean} isCloud Whether the variable is stored in the cloud.
     * @returns {Variable} The new variable.
     */
    static create (id, name, type, isCloud) {
        // This looks silly, but all the JavaScript engines handle this by making a new hidden class for this variable.
        // That means that the browser engine can specialize compiled JS to take advantage of "this variable is always
        // a small integer" instead of having to use the much slower generic paths that one shared hidden class forces.
        // This is most relevant for V8/Chrome.

        if (type === Variable.LIST_TYPE) {
            // For lists, there is no benefit to using specialized-per-variable hidden class.
            // Reusing one is the same speed but avoids wasting some memory on those extra classes.
            // eslint-disable-next-line no-use-before-define
            return new ListSpecializedVariable(id, name, type, isCloud);
        }

        const SpecializedVariable = class extends Variable {};
        return new SpecializedVariable(id, name, type, isCloud);
    }

    /**
     * Create a clone of a variable to give to a clone of a sprite.
     * @param {Variable} original The variable whose class to reuse.
     * @param {string | null} id Id of the variable.
     * @param {string} name Name of the variable.
     * @param {string} type Type of the variable, one of '' or 'list'
     * @param {boolean} isCloud Whether the variable is stored in the cloud.
     * @returns {Variable} The new variable.
     */
    static createSibling (original, id, name, type, isCloud) {
        // Use the same hidden class. We reuse compiled JS across clones, so swapping out to a new hidden class would
        // force that code to take slower routes instead of the specialization we want.
        const SpecializedVariable = original.constructor;
        return new SpecializedVariable(id, name, type, isCloud);
    }

    toXML (isLocal) {
        isLocal = (isLocal === true);
        return `<variable type="${this.type}" id="${this.id}" islocal="${isLocal
        }" iscloud="${this.isCloud}">${xmlEscape(this.name)}</variable>`;
    }

    /**
     * Type representation for scalar variables.
     * This is currently represented as ''
     * for compatibility with blockly.
     * @const {string}
     */
    static get SCALAR_TYPE () {
        return ''; // used by compiler
    }

    /**
     * Type representation for list variables.
     * @const {string}
     */
    static get LIST_TYPE () {
        return 'list'; // used by compiler
    }

    /**
     * Type representation for list variables.
     * @const {string}
     */
    static get BROADCAST_MESSAGE_TYPE () {
        return 'broadcast_msg';
    }
}

/**
 * See Variable.create()
 */
class ListSpecializedVariable extends Variable {}

module.exports = Variable;
