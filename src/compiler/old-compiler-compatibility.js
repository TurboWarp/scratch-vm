/**
 * @fileoverview
 * Reimplements a subset of the old (pre-September 2025) compiler
 * to maintain compatibility with extensions patching the old compiler.
 *
 * Safety and compatibility is more important than performance. There may be
 * unnecessary type casts and scripts may be marked as yielding even when they
 * don't actually yield. Additionally, anything running in this compatibility layer
 * is not expected to receive the performance benefits of the new compiler.
 *
 * These assumptions are made about extensions using this compatibility layer:
 *  - Extensions do not try to combine this compatibility layer with any APIs
 *    provided by the new compiler.
 *  - Extensions treat IR nodes received from descendSubstack and similar as
 *    opaque objects.
 *  - Extensions need to implement the JS generators for all AST node kinds
 *    they use. Can not rely on the default JS generator.
 */

const {InputOpcode, InputType} = require('./enums');
// eslint-disable-next-line no-unused-vars
const {IntermediateInput, IntermediateStackBlock, IntermediateStack} = require('./intermediate');

class IRGeneratorStub {
    // Doesn't seem like extensions override anything, though the class may
    // still need to exist to avoid type errors.
}

class ScriptTreeGeneratorStub {
    /**
     * @param {import("./irgen").ScriptTreeGenerator} real
     */
    constructor (real) {
        /**
         * @type {import("./irgen").ScriptTreeGenerator}
         */
        this.real = real;

        this.fakeThis = {
            thread: real.thread,
            target: real.target,
            blocks: real.blocks,
            runtime: real.runtime,
            stage: real.stage,
            script: real.script,

            /**
             * @param parentBlock Parent VM block.
             * @param {string} inputName Name of input.
             * @returns opaque object
             */
            descendInputOfBlock (parentBlock, inputName) {
                const node = real.descendInputOfBlock(parentBlock, inputName, true);
                return node;
            },

            /**
             * @param {*} parentBlock Parent VM block.
             * @param {*} substackName Name of substack.
             * @returns opaque object
             */
            descendSubstack (parentBlock, substackName) {
                const substack = real.descendSubstack(parentBlock, substackName);
                return substack;
            },

            analyzeLoop () {
                // TODO: not always necessary
                real.script.yields = true;
            }
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
     * @param block VM block
     * @returns {IntermediateInput|null}
     */
    descendInputFromNewCompiler (block) {
        const node = this.descendInput.call(this.fakeThis, block);
        if (node) {
            return new IntermediateInput(InputOpcode.OLD_COMPILER_COMPATIBILITY_LAYER, InputType.ANY, {
                oldNode: node
            }, true);
        }
        return null;
    }

    /**
     * @param block VM block
     * @returns {IntermediateStackBlock|null}
     */
    descendStackedBlockFromNewCompiler (block) {
        const node = this.descendStackedBlock.call(this.fakeThis, block);
        if (node) {
            return new IntermediateStackBlock(InputOpcode.OLD_COMPILER_COMPATIBILITY_LAYER, {
                oldNode: node
            }, true);
        }
        return null;
    }
}

// These are part of the old compiler's API.
const TYPE_NUMBER = 1;
const TYPE_STRING = 2;
const TYPE_BOOLEAN = 3;
const TYPE_UNKNOWN = 4;
const TYPE_NUMBER_NAN = 5;

/**
 * Part of the old compiler's API.
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
            // Path used by the compatibility layer itself

            /**
             * @type {IntermediateInput}
             */
            this.intermediate = typeOrIntermediate;

            /**
             * @type {number} See TYPE_* constants above
             */
            this.type = TYPE_UNKNOWN;
        } else {
            // Path used by extensions
            this.intermediate = null;
            this.type = typeOrIntermediate;
        }
    }

    asNumber () {
        return `(+${this.source} || 0)`;
    }

    asNumberOrNaN () {
        return `(+${this.source})`;
    }

    asString () {
        return `("" + ${this.source})`;
    }

    asBoolean () {
        return `toBoolean(${this.source})`;
    }

    asColor () {
        return this.asUnknown();
    }

    asUnknown () {
        return this.source;
    }

    asSafe () {
        return this.asUnknown();
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

/**
 * Part of the old compiler's API.
 */
class VariablePool {
    constructor (prefix) {
        this.prefix = prefix;
        this.count = 0;
    }

    next () {
        return `${this.prefix}${this.count++}`;
    }
}

/**
 * Part of the old compiler's API.
 */
class Frame {
    constructor (isLoop) {
        this.isLoop = isLoop;
        this.isLastBlock = false;
    }
}

class JSGeneratorStub {
    /**
     * @param {import("./jsgen")} real
     */
    constructor (real) {
        /**
         * @type {import("./jsgen")}
         */
        this.real = real;

        this.fakeThis = {
            script: real.script,
            ir: real.ir,
            target: real.target,

            get frames () {
                return real.frames;
            },
            get currentFrame () {
                return real.currentFrame;
            },

            get source () {
                return real.source;
            },
            set source (newSource) {
                real.source = newSource;
            },

            localVariables: new VariablePool('oldCompilerLocal'),

            /**
             * @param {IntermediateInput} intermediate
             * @returns {void} output is concatenated in this.source
             */
            descendInput (intermediate) {
                const js = real.descendInput(intermediate);
                return new TypedInput(js, intermediate);
            },

            /**
             * @param {IntermediateStack} stack Stack of blocks.
             * @param {Frame} frame New frame
             */
            descendStack (stack, frame) {
                real.descendStack(stack, frame);
            },

            yieldLoop: () => real.yieldLoop(),
            yieldNotWarp: () => real.yieldNotWarp(),
            yieldStuckOrNotWarp: () => real.yieldStuckOrNotWarp(),
            yielded: () => real.yielded(),
            requestRedraw: () => real.requestRedraw()
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
     * Intended for extensions to override.
     * Always call from `fakeThis` context.
     * @param {{kind: string}} node Old compiler AST node.
     */
    descendStackedBlock (node) {
        throw new Error(`Unknown stacked block: ${node.kind}`);
    }

    /**
     * @param {IntermediateInput} intermediate
     * @returns {string} JavaScript
     */
    descendInputFromNewCompiler (intermediate) {
        const oldNode = intermediate.inputs.oldNode;
        const typedInput = this.descendInput.call(this.fakeThis, oldNode);
        return typedInput.asSafe();
    }

    /**
     * @param {IntermediateStackBlock} intermediate
     * @returns {void} source property on real JSGenerator is modified directly
     */
    descendStackedBlockFromNewCompiler (intermediate) {
        const oldNode = intermediate.inputs.oldNode;
        this.descendStackedBlock.call(this.fakeThis, oldNode);
    }
}

/**
 * Part of old compiler's API.
 */
JSGeneratorStub.unstable_exports = {
    TYPE_NUMBER,
    TYPE_STRING,
    TYPE_BOOLEAN,
    TYPE_UNKNOWN,
    TYPE_NUMBER_NAN,
    VariablePool,
    TypedInput,
    Frame
};

const oldCompilerCompatibility = {
    enabled: false,
    IRGeneratorStub,
    ScriptTreeGeneratorStub,
    TypedInput,
    JSGeneratorStub
};

module.exports = oldCompilerCompatibility;
