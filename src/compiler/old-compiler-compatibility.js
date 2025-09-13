const {InputOpcode, InputType} = require('./enums');
const {IntermediateInput} = require('./intermediate');

class IRGeneratorStub {
}

class ScriptTreeGeneratorStub {
    constructor (real) {
        /**
         * The real script generator.
         * @type {import("./irgen").ScriptTreeGenerator}
         */
        this.real = real;

        this.fakeThis = {
            descendInputOfBlock: this.descendInputOfBlockFromOldCompiler.bind(this)
        };
    }

    /**
     * Intended for extensions to override.
     * Always call from `fakeThis` context.
     * @param {{opcode: string}} block VM block
     * @returns {{kind: string}} Node object from old compiler.
     */
    descendInput (block) { // eslint-disable-line no-unused-vars
        return null;
    }

    /**
     * Intended for extensions to override.
     * Always call from `fakeThis` context.
     * @param {{opcode: string}} block VM block
     * @returns {{kind: string}} Node object from old compiler.
     */
    descendStackedBlock (block) { // eslint-disable-line no-unused-vars
        return null;
    }

    /**
     * Part of old compiler's public API.
     * @param parentBlock Parent VM block.
     * @param {string} inputName Name of input.
     */
    descendInputOfBlockFromOldCompiler (parentBlock, inputName) {
        const node = this.real.descendInputOfBlock(parentBlock, inputName, true);
        return node;
    }

    /**
     * For internal use by new compiler only.
     * @param block VM block
     * @returns {IntermediateInput|null}
     */
    descendInputFromNewCompiler (block) {
        const node = this.descendInput.call(this.fakeThis, block);
        if (node) {
            return new IntermediateInput(InputOpcode.OLD_COMPILER_COMPATIBILITY_LAYER, InputType.ANY, {
                block: block,
                oldNode: node
            }, true);
        }
        return null;
    }
}

const TYPE_NUMBER = 1;
const TYPE_STRING = 2;
const TYPE_BOOLEAN = 3;
const TYPE_UNKNOWN = 4;
const TYPE_NUMBER_NAN = 5;

/**
 * Part of the old compiler's public API.
 */
class TypedInput {
    /**
     * @param {string} source JavaScript
     * @param {number|IntermediateInput} typeOrIntermediate
     */
    constructor (source, typeOrIntermediate) {
        /**
         * JavaScript.
         * @type {string}
         */
        this.source = source;

        if (typeOrIntermediate instanceof IntermediateInput) {
            /**
             * @type {IntermediateInput}
             */
            this.intermediate = typeOrIntermediate;
        } else {
            this.intermediate = null;
            this.type = typeOrIntermediate;
        }
    }

    asNumber () {
        throw new Error('TODO asNumber');
    }

    asNumberOrNaN () {
        throw new Error('TODO asNumberOrNaN');
    }

    asString () {
        throw new Error('TODO asString');
    }

    asBoolean () {
        throw new Error('TODO asBoolean');
    }

    asColor () {
        throw new Error('TODO asColor');
    }

    asUnknown () {
        return this.source;
    }

    asSafe () {
        return this.source;
    }

    isAlwaysNumber () {
        // TODO
        return false;
    }

    isAlwaysNumberOrNaN () {
        // TODO
        return false;
    }

    isNeverNumber () {
        // TODO
        return false;
    }
}

class JSGeneratorStub {
    constructor (real) {
        /**
         * For internal use by new compiler only.
         * @type {import("./jsgen")}
         */
        this.real = real;

        this._fakeThis = {
            descendInput: this.descendInputFromOldCompiler.bind(this)
        };
    }

    /**
     * Intended for extensions to override.
     * Always call from `fakeThis` context.
     * @param {{kind: string}} node Old compiler AST node.
     * @returns {TypedInput} Old compiler TypedInput.
     */
    descendInput (node) {
        throw new Error(`Unknown input: ${node.kind}`);
    }

    /**
     * Part of old compiler's public API.
     * @param {IntermediateInput} intermediate
     * @returns {TypedInput}
     */
    descendInputFromOldCompiler (intermediate) {
        const js = this.real.descendInput(intermediate);
        return new TypedInput(js, intermediate);
    }

    /**
     * @param {IntermediateInput} intermediate
     * @returns {string} JavaScript
     */
    descendInputFromNewCompiler (intermediate) {
        const oldNode = intermediate.inputs.oldNode;
        const typedInput = this.descendInput.call(this._fakeThis, oldNode);
        return typedInput.asSafe();
    }
}

/**
 * Part of old compiler's public API.
 */
JSGeneratorStub.unstable_exports = {
    TYPE_NUMBER,
    TYPE_STRING,
    TYPE_BOOLEAN,
    TYPE_UNKNOWN,
    TYPE_NUMBER_NAN,
    // factoryNameVariablePool,
    // functionNameVariablePool,
    // generatorNameVariablePool,
    // VariablePool,
    // PEN_EXT,
    // PEN_STATE,
    TypedInput
    // ConstantInput,
    // VariableInput,
    // Frame,
    // sanitize
};

const oldCompilerCompatibility = {
    enabled: false,
    IRGeneratorStub,
    ScriptTreeGeneratorStub,
    TypedInput,
    JSGeneratorStub
};

module.exports = oldCompilerCompatibility;
