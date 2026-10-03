// @ts-check

const {StackOpcode, InputOpcode, InputType} = require('./enums.js');
const log = require('../util/log');

// These imports are used by jsdoc comments but eslint doesn't know that
/* eslint-disable no-unused-vars */
const {
    IntermediateStack,
    IntermediateInput,
    IntermediateScript,
    IntermediateRepresentation,
    IntermediateStackBlock
} = require('./intermediate');
/* eslint-enable no-unused-vars */

class TypeState {
    constructor () {
        /** @type {Object.<string, InputType | 0>}*/
        this.variables = Object.create(null);
    }

    /**
     * @returns {boolean}
     */
    clear () {
        let modified = false;
        for (const varId in this.variables) {
            if (this.variables[varId] !== InputType.ANY) {
                modified = true;
                break;
            }
        }
        this.variables = Object.create(null);
        return modified;
    }


    /**
     * @returns {TypeState}
     */
    clone () {
        const clone = new TypeState();
        for (const varId in this.variables) {
            clone.variables[varId] = this.variables[varId];
        }
        return clone;
    }

    /**
     * @param {TypeState} other
     * @param {(varId: string) => InputType | 0} stateMutator
     * @returns {boolean}
     * @private
     */
    mutate (other, stateMutator) {
        let modified = false;
        for (const varId in other.variables) {
            const newValue = stateMutator(varId);
            if (newValue !== this.variables[varId]) {
                this.variables[varId] = newValue;
                modified = modified || true;
            }
        }

        for (const varId in this.variables) {
            if (!other.variables[varId]) {
                const newValue = stateMutator(varId);
                if (newValue !== this.variables[varId]) {
                    this.variables[varId] = newValue;
                    modified = modified || true;
                }
            }
        }
        return modified;
    }

    /**
     * @param {TypeState} other
     * @returns {boolean}
     */
    or (other) {
        return this.mutate(other, varId => {
            const thisType = this.variables[varId] ?? InputType.ANY;
            const otherType = other.variables[varId] ?? InputType.ANY;
            return thisType | otherType;
        });
    }

    /**
     * @param {TypeState} other
     * @returns {boolean}
     */
    after (other) {
        return this.mutate(other, varId => {
            const otherType = other.variables[varId];
            if (otherType) return otherType;
            return this.variables[varId] ?? InputType.ANY;
        });
    }

    /**
     * @param {TypeState} other
     * @returns {boolean}
     */
    overwrite (other) {
        return this.mutate(other, varId => other.variables[varId] ?? InputType.ANY);
    }

    /**
     * @param {*} variable A variable codegen object.
     * @param {InputType} type The type to set this variable to
     * @returns {boolean}
     */
    setVariableType (variable, type) {
        if (this.variables[variable.id] === type) return false;
        this.variables[variable.id] = type;
        return true;
    }

    /**
     *
     * @param {*} variable A variable codegen object.
     * @returns {InputType}
     */
    getVariableType (variable) {
        return this.variables[variable.id] ?? InputType.ANY;
    }
}

class IROptimizer {

    /**
     * @param {IntermediateRepresentation} ir
     */
    constructor (ir) {
        /** @type {IntermediateRepresentation} */
        this.ir = ir;
        /** @type {boolean} Used for testing */
        this.ignoreYields = false;

        /** @private @type {TypeState | null} The state the analyzed script could exit in */
        this.exitState = null;
    }

    /**
     * @param {IntermediateInput} inputBlock
     * @param {TypeState} state
     * @returns {InputType}
     */
    getInputType (inputBlock, state) {
        const inputs = inputBlock.inputs;

        switch (inputBlock.opcode) {
        case InputOpcode.VAR_GET:
            return state.getVariableType(inputs.variable);

        case InputOpcode.ADDON_CALL:
            break;

        case InputOpcode.CAST_BOOLEAN: {
            const innerType = inputs.target.type;
            if (innerType & InputType.BOOLEAN) return innerType;
            return InputType.BOOLEAN;
        }

        case InputOpcode.CAST_NUMBER: {
            const innerType = inputs.target.type;
            if (innerType & InputType.NUMBER) return innerType;
            return InputType.NUMBER;
        }

        case InputOpcode.CAST_NUMBER_INDEX: {
            const innerType = inputs.target.type;
            if (innerType & InputType.NUMBER_INDEX) return innerType;
            return InputType.NUMBER_INDEX;
        }

        case InputOpcode.CAST_NUMBER_OR_NAN: {
            const innerType = inputs.target.type;
            if (innerType & InputType.NUMBER_OR_NAN) return innerType;
            return InputType.NUMBER_OR_NAN;
        }

        case InputOpcode.CAST_STRING: {
            const innerType = inputs.target.type;
            if (innerType & InputType.STRING) return innerType;
            return InputType.STRING;
        }

        case InputOpcode.OP_ADD: {
            const leftType = inputs.left.type;
            const rightType = inputs.right.type;

            let resultType = 0;

            const canBeNaN = function () {
                // Infinity + (-Infinity) = NaN
                if ((leftType & InputType.NUMBER_POS_INF) && (rightType & InputType.NUMBER_NEG_INF)) return true;
                // (-Infinity) + Infinity = NaN
                if ((leftType & InputType.NUMBER_NEG_INF) && (rightType & InputType.NUMBER_POS_INF)) return true;
            };
            if (canBeNaN()) resultType |= InputType.NUMBER_NAN;

            const canBeFractional = function () {
                // For the plus operation to return a non-whole number one of it's
                //  inputs has to be a non-whole number
                if (leftType & InputType.NUMBER_FRACT) return true;
                if (rightType & InputType.NUMBER_FRACT) return true;
            };
            const canBeFract = canBeFractional();

            const canBePos = function () {
                if (leftType & InputType.NUMBER_POS) return true; // POS + ANY ~= POS
                if (rightType & InputType.NUMBER_POS) return true; // ANY + POS ~= POS
            };
            if (canBePos()) {
                resultType |= InputType.NUMBER_POS_INT | InputType.NUMBER_POS_INF;
                if (canBeFract) resultType |= InputType.NUMBER_POS_FRACT;
            }

            const canBeNeg = function () {
                if (leftType & InputType.NUMBER_NEG) return true; // NEG + ANY ~= NEG
                if (rightType & InputType.NUMBER_NEG) return true; // ANY + NEG ~= NEG
            };
            if (canBeNeg()) {
                resultType |= InputType.NUMBER_NEG_INT | InputType.NUMBER_NEG_INF;
                if (canBeFract) resultType |= InputType.NUMBER_NEG_FRACT;
            }

            const canBeZero = function () {
                // POS_REAL + NEG_REAL ~= 0
                if ((leftType & InputType.NUMBER_POS_REAL) && (rightType & InputType.NUMBER_NEG_REAL)) return true;
                // NEG_REAL + POS_REAL ~= 0
                if ((leftType & InputType.NUMBER_NEG_REAL) && (rightType & InputType.NUMBER_POS_REAL)) return true;
                // 0 + 0 = 0
                if ((leftType & InputType.NUMBER_ZERO) && (rightType & InputType.NUMBER_ZERO)) return true;
                // 0 + -0 = 0
                if ((leftType & InputType.NUMBER_ZERO) && (rightType & InputType.NUMBER_NEG_ZERO)) return true;
                // -0 + 0 = 0
                if ((leftType & InputType.NUMBER_NEG_ZERO) && (rightType & InputType.NUMBER_ZERO)) return true;
            };
            if (canBeZero()) resultType |= InputType.NUMBER_ZERO;

            const canBeNegZero = function () {
                // -0 + -0 = -0
                if ((leftType & InputType.NUMBER_NEG_ZERO) && (rightType & InputType.NUMBER_NEG_ZERO)) return true;
            };
            if (canBeNegZero()) resultType |= InputType.NUMBER_NEG_ZERO;

            return resultType;
        }

        case InputOpcode.OP_SUBTRACT: {
            const leftType = inputs.left.type;
            const rightType = inputs.right.type;

            let resultType = 0;

            const canBeNaN = function () {
                // Infinity - Infinity = NaN
                if ((leftType & InputType.NUMBER_POS_INF) && (rightType & InputType.NUMBER_POS_INF)) return true;
                // (-Infinity) - (-Infinity) = NaN
                if ((leftType & InputType.NUMBER_NEG_INF) && (rightType & InputType.NUMBER_NEG_INF)) return true;
            };
            if (canBeNaN()) resultType |= InputType.NUMBER_NAN;

            const canBeFractional = function () {
                // For the subtract operation to return a non-whole number one of it's
                //  inputs has to be a non-whole number
                if (leftType & InputType.NUMBER_FRACT) return true;
                if (rightType & InputType.NUMBER_FRACT) return true;
            };
            const canBeFract = canBeFractional();

            const canBePos = function () {
                if (leftType & InputType.NUMBER_POS) return true; // POS - ANY ~= POS
                if (rightType & InputType.NUMBER_NEG) return true; // ANY - NEG ~= POS
            };
            if (canBePos()) {
                resultType |= InputType.NUMBER_POS_INT | InputType.NUMBER_POS_INF;
                if (canBeFract) resultType |= InputType.NUMBER_POS_FRACT;
            }

            const canBeNeg = function () {
                if (leftType & InputType.NUMBER_NEG) return true; // NEG - ANY ~= NEG
                if (rightType & InputType.NUMBER_POS) return true; // ANY - POS ~= NEG
            };
            if (canBeNeg()) {
                resultType |= InputType.NUMBER_NEG_INT | InputType.NUMBER_NEG_INF;
                if (canBeFract) resultType |= InputType.NUMBER_NEG_FRACT;
            }

            const canBeZero = function () {
                // POS_REAL - POS_REAL ~= 0
                if ((leftType & InputType.NUMBER_POS_REAL) && (rightType & InputType.NUMBER_POS_REAL)) return true;
                // NEG_REAL - NEG_REAL ~= 0
                if ((leftType & InputType.NUMBER_NEG_REAL) && (rightType & InputType.NUMBER_NEG_REAL)) return true;
                // 0 - 0 = 0
                if ((leftType & InputType.NUMBER_ZERO) && (rightType & InputType.NUMBER_ZERO)) return true;
                // 0 - (-0) = 0
                if ((leftType & InputType.NUMBER_ZERO) && (rightType & InputType.NUMBER_NEG_ZERO)) return true;
                // (-0) - (-0) = 0
                if ((leftType & InputType.NUMBER_NEG_ZERO) && (rightType & InputType.NUMBER_NEG_ZERO)) return true;
            };
            if (canBeZero()) resultType |= InputType.NUMBER_ZERO;

            const canBeNegZero = function () {
                // (-0) - 0 = -0
                if ((leftType & InputType.NUMBER_NEG_ZERO) && (rightType & InputType.NUMBER_ZERO)) return true;
            };
            if (canBeNegZero()) resultType |= InputType.NUMBER_NEG_ZERO;

            return resultType;
        }

        case InputOpcode.OP_MULTIPLY: {
            const leftType = inputs.left.type;
            const rightType = inputs.right.type;

            let resultType = 0;

            const canBeNaN = function () {
                // (-)Infinity * 0 = NaN
                if ((leftType & InputType.NUMBER_INF) && (rightType & InputType.NUMBER_ANY_ZERO)) return true;
                // 0 * (-)Infinity = NaN
                if ((leftType & InputType.NUMBER_ANY_ZERO) && (rightType & InputType.NUMBER_INF)) return true;
            };
            if (canBeNaN()) resultType |= InputType.NUMBER_NAN;

            const canBeFractional = function () {
                // For the subtract operation to return a non-whole number one of it's
                //  inputs has to be a non-whole number
                if (leftType & InputType.NUMBER_FRACT) return true;
                if (rightType & InputType.NUMBER_FRACT) return true;
            };
            const canBeFract = canBeFractional();

            const canBePos = function () {
                // POS * POS = POS
                if ((leftType & InputType.NUMBER_POS) && (rightType & InputType.NUMBER_POS)) return true;
                // NEG * NEG = POS
                if ((leftType & InputType.NUMBER_NEG) && (rightType & InputType.NUMBER_NEG)) return true;
            };
            if (canBePos()) {
                resultType |= InputType.NUMBER_POS_INT | InputType.NUMBER_POS_INF;
                if (canBeFract) resultType |= InputType.NUMBER_POS_FRACT;
            }

            const canBeNeg = function () {
                // POS * NEG = NEG
                if ((leftType & InputType.NUMBER_POS) && (rightType & InputType.NUMBER_NEG)) return true;
                // NEG * POS = NEG
                if ((leftType & InputType.NUMBER_NEG) && (rightType & InputType.NUMBER_POS)) return true;
            };
            if (canBeNeg()) {
                resultType |= InputType.NUMBER_NEG_INT | InputType.NUMBER_NEG_INF;
                if (canBeFract) resultType |= InputType.NUMBER_NEG_FRACT;
            }

            const canBeZero = function () {
                // 0 * 0 = 0
                if ((leftType & InputType.NUMBER_ZERO) && (rightType & InputType.NUMBER_ZERO)) return true;
                // -0 * -0 = 0
                if ((leftType & InputType.NUMBER_NEG_ZERO) && (rightType & InputType.NUMBER_NEG_ZERO)) return true;
                // 0 * POS_REAL = 0
                if ((leftType & InputType.NUMBER_ZERO) && (rightType & InputType.NUMBER_POS_REAL)) return true;
                // -0 * NEG_REAL = 0
                if ((leftType & InputType.NUMBER_NEG_ZERO) && (rightType & InputType.NUMBER_NEG_REAL)) return true;
                // POS_REAL * 0 = 0
                if ((leftType & InputType.NUMBER_POS_REAL) && (rightType & InputType.NUMBER_ZERO)) return true;
                // NEG_REAL * -0 = 0
                if ((leftType & InputType.NUMBER_NEG_REAL) && (rightType & InputType.NUMBER_NEG_ZERO)) return true;
                // Rounding errors like 1e-323 * 0.1 = 0
                if ((leftType & InputType.NUMBER_FRACT) && (rightType & InputType.NUMBER_FRACT)) return true;
            };
            if (canBeZero()) resultType |= InputType.NUMBER_ZERO;

            const canBeNegZero = function () {
                // 0 * -0 = 0
                if ((leftType & InputType.NUMBER_ZERO) && (rightType & InputType.NUMBER_NEG_ZERO)) return true;
                // -0 * 0 = 0
                if ((leftType & InputType.NUMBER_NEG_ZERO) && (rightType & InputType.NUMBER_ZERO)) return true;
                // -0 * POS_REAL = -0
                if ((leftType & InputType.NUMBER_NEG_ZERO) && (rightType & InputType.NUMBER_POS_REAL)) return true;
                // 0 * NEG_REAL = -0
                if ((leftType & InputType.NUMBER_ZERO) && (rightType & InputType.NUMBER_NEG_REAL)) return true;
                // POS_REAL * -0 = -0
                if ((leftType & InputType.NUMBER_POS_REAL) && (rightType & InputType.NUMBER_NEG_ZERO)) return true;
                // NEG_REAL * 0 = -0
                if ((leftType & InputType.NUMBER_NEG_REAL) && (rightType & InputType.NUMBER_ZERO)) return true;
                // Rounding errors like -1e-323 / 10 = -0
                if ((leftType & InputType.NUMBER_NEG_REAL) && (rightType & InputType.NUMBER_POS_REAL)) return true;
                // Rounding errors like 1e-323 / -10 = -0
                if ((leftType & InputType.NUMBER_POS_REAL) && (rightType & InputType.NUMBER_NEG_REAL)) return true;
            };
            if (canBeNegZero()) resultType |= InputType.NUMBER_NEG_ZERO;

            return resultType;
        }

        case InputOpcode.OP_DIVIDE: {
            const leftType = inputs.left.type;
            const rightType = inputs.right.type;

            let resultType = 0;

            const canBeNaN = function () {
                // (-)0 / (-)0 = NaN
                if ((leftType & InputType.NUMBER_ANY_ZERO) && (rightType & InputType.NUMBER_ANY_ZERO)) return true;
                // (-)Infinity / (-)Infinity = NaN
                if ((leftType & InputType.NUMBER_INF) && (rightType & InputType.NUMBER_INF)) return true;
                // (-)0 / NaN = NaN
                if ((leftType & InputType.NUMBER_ANY_ZERO) && (rightType & InputType.NUMBER_NAN)) return true;
            };
            if (canBeNaN()) resultType |= InputType.NUMBER_NAN;

            const canBePos = function () {
                // POS / POS = POS
                if ((leftType & InputType.NUMBER_POS) && (rightType & InputType.NUMBER_POS)) return true;
                // NEG / NEG = POS
                if ((leftType & InputType.NUMBER_NEG) && (rightType & InputType.NUMBER_NEG)) return true;
            };
            if (canBePos()) resultType |= InputType.NUMBER_POS;

            const canBeNegInfinity = function () {
                // NEG / 0 = -Infinity
                if ((leftType & InputType.NUMBER_NEG) && (rightType & InputType.NUMBER_ZERO)) return true;
                // POS / -0 = -Infinity
                if ((leftType & InputType.NUMBER_POS) && (rightType & InputType.NUMBER_NEG_ZERO)) return true;
                // NEG_REAL / POS_REAL ~= -Infinity
                if ((leftType & InputType.NUMBER_NEG_REAL) && (rightType & InputType.NUMBER_POS_REAL)) return true;
                // POS_REAL / NEG_REAL ~= -Infinity
                if ((leftType & InputType.NUMBER_POS_REAL) && (rightType & InputType.NUMBER_NEG_REAL)) return true;
            };
            if (canBeNegInfinity()) resultType |= InputType.NUMBER_NEG_INF;

            const canBeInfinity = function () {
                // POS / 0 = Infinity
                if ((leftType & InputType.NUMBER_POS) && (rightType & InputType.NUMBER_ZERO)) return true;
                // NEG / -0 = Infinity
                if ((leftType & InputType.NUMBER_NEG) && (rightType & InputType.NUMBER_NEG_ZERO)) return true;
                // POS_REAL / POS_REAL ~= Infinity
                if ((leftType & InputType.NUMBER_POS_REAL) && (rightType & InputType.NUMBER_POS_REAL)) return true;
                // NEG_REAL / NEG_REAL ~= Infinity
                if ((leftType & InputType.NUMBER_NEG_REAL) && (rightType & InputType.NUMBER_NEG_REAL)) return true;
            };
            if (canBeInfinity()) resultType |= InputType.NUMBER_POS_INF;

            const canBeNeg = function () {
                // POS / NEG = NEG
                if ((leftType & InputType.NUMBER_POS) && (rightType & InputType.NUMBER_NEG)) return true;
                // NEG / POS = NEG
                if ((leftType & InputType.NUMBER_NEG) && (rightType & InputType.NUMBER_POS)) return true;
            };
            if (canBeNeg()) resultType |= InputType.NUMBER_NEG;

            const canBeZero = function () {
                // 0 / POS = 0
                if ((leftType & InputType.NUMBER_ZERO) && (rightType & InputType.NUMBER_POS)) return true;
                // -0 / NEG = 0
                if ((leftType & InputType.NUMBER_NEG_ZERO) && (rightType & InputType.NUMBER_NEG)) return true;
                // Rounding errors like 1e-323 / 10 = 0
                if ((leftType & InputType.NUMBER_POS_REAL) && (rightType & InputType.NUMBER_POS_REAL)) return true;
                // Rounding errors like -1e-323 / -10 = 0
                if ((leftType & InputType.NUMBER_NEG_REAL) && (rightType & InputType.NUMBER_NEG_REAL)) return true;
                // NUMBER_POS / Infinity = 0
                if ((leftType & InputType.NUMBER_POS) && (rightType & InputType.NUMBER_POS_INF)) return true;
                // NUMBER_NEG / -Infinity = 0
                if ((leftType & InputType.NUMBER_NEG) && (rightType & InputType.NUMBER_NEG_INF)) return true;
            };
            if (canBeZero()) resultType |= InputType.NUMBER_ZERO;

            const canBeNegZero = function () {
                // -0 / POS = -0
                if ((leftType & InputType.NUMBER_NEG_ZERO) && (rightType & InputType.NUMBER_POS)) return true;
                // 0 / NEG = -0
                if ((leftType & InputType.NUMBER_ZERO) && (rightType & InputType.NUMBER_NEG)) return true;
                // Rounding errors like -1e-323 / 10 = -0
                if ((leftType & InputType.NUMBER_NEG_REAL) && (rightType & InputType.NUMBER_POS_REAL)) return true;
                // Rounding errors like 1e-323 / -10 = -0
                if ((leftType & InputType.NUMBER_POS_REAL) && (rightType & InputType.NUMBER_NEG_REAL)) return true;
                // NUMBER_POS / -Infinity = -0
                if ((leftType & InputType.NUMBER_POS) && (rightType & InputType.NUMBER_NEG_INF)) return true;
                // NUMBER_NEG / Infinity = -0
                if ((leftType & InputType.NUMBER_NEG) && (rightType & InputType.NUMBER_POS_INF)) return true;
            };
            if (canBeNegZero()) resultType |= InputType.NUMBER_NEG_ZERO;

            return resultType;
        }
        }
        return inputBlock.type;
    }

    /**
     * @param {IntermediateInput} inputBlock
     * @param {TypeState} state
     * @returns {boolean}
     * @private
     */
    analyzeInputBlock (inputBlock, state) {
        const inputs = inputBlock.inputs;

        let modified = this.analyzeInputs(inputs, state);
        const newType = this.getInputType(inputBlock, state);

        modified = modified || newType !== inputBlock.type;
        inputBlock.type = newType;

        switch (inputBlock.opcode) {
        case InputOpcode.ADDON_CALL:
            modified = state.clear() || modified;
            break;
        case InputOpcode.PROCEDURE_CALL: {
            modified = this.analyzeInputs(inputs.inputs, state) || modified;
            const script = this.ir.procedures[inputs.variant];

            if (!script || !script.cachedAnalysisEndState) {
                modified = state.clear() || modified;
            } else if (script.yields) {
                modified = state.overwrite(script.cachedAnalysisEndState) || modified;
            } else {
                modified = state.after(script.cachedAnalysisEndState) || modified;
            }
            break;
        }
        }

        return modified;
    }

    /**
     * @param {Object<any, any>} inputs
     * @param {TypeState} state
     * @returns {boolean} modified
     */
    analyzeInputs (inputs, state) {
        let modified = false;
        for (const inputName in inputs) {
            const input = inputs[inputName];
            if (input instanceof IntermediateInput) {
                modified = this.analyzeInputBlock(input, state) || modified;
            }
        }
        return modified;
    }

    /**
     * @param {TypeState} state
     */
    addPossibleExitState (state) {
        if (this.exitState === null) {
            this.exitState = state.clone();
            return;
        }

        this.exitState.or(state);
    }

    /**
     * @param {IntermediateStackBlock} stackBlock
     * @param {TypeState} state
     * @returns {boolean}
     * @private
     */
    analyzeStackBlock (stackBlock, state) {
        const inputs = stackBlock.inputs;
        let modified = false;

        if (stackBlock.ignoreState) {
            state = state.clone();
        }

        switch (stackBlock.opcode) {
        case StackOpcode.VAR_SET:
            modified = this.analyzeInputs(inputs, state) || modified;
            modified = state.setVariableType(inputs.variable, inputs.value.type) || modified;
            break;
        case StackOpcode.CONTROL_WHILE:
        case StackOpcode.CONTROL_FOR:
            modified = this.analyzeInputs(inputs, state) || modified;
            modified = this.analyzeLoopedStack(inputs.do, state, stackBlock, true) || modified;
            break;
        case StackOpcode.CONTROL_REPEAT:
            modified = this.analyzeInputs(inputs, state) || modified;
            modified = this.analyzeLoopedStack(inputs.do, state, stackBlock, false) || modified;
            break;
        case StackOpcode.CONTROL_IF_ELSE: {
            modified = this.analyzeInputs(inputs, state) || modified;
            const trueState = state.clone();
            modified = this.analyzeStack(inputs.whenTrue, trueState) || modified;
            modified = this.analyzeStack(inputs.whenFalse, state) || modified;
            modified = state.or(trueState) || modified;
            break;
        }
        case StackOpcode.CONTROL_STOP_SCRIPT:
        case StackOpcode.PROCEDURE_RETURN: {
            modified = this.analyzeInputs(inputs, state) || modified;
            this.addPossibleExitState(state);
            break;
        }
        case StackOpcode.CONTROL_WAIT_UNTIL: {
            modified = state.clear() || modified;
            modified = this.analyzeInputs(inputs, state) || modified;
            break;
        }
        case StackOpcode.PROCEDURE_CALL: {
            modified = this.analyzeInputs(inputs, state) || modified;
            modified = this.analyzeInputs(inputs.inputs, state) || modified;
            const script = this.ir.procedures[inputs.variant];

            if (!script || !script.cachedAnalysisEndState) {
                modified = state.clear() || modified;
            } else if (script.yields) {
                modified = state.overwrite(script.cachedAnalysisEndState) || modified;
            } else {
                modified = state.after(script.cachedAnalysisEndState) || modified;
            }
            break;
        }
        case StackOpcode.COMPATIBILITY_LAYER: {
            modified = this.analyzeInputs(inputs, state) || modified;
            this.analyzeInputs(inputs.inputs, state);
            for (const substackName in inputs.substacks) {
                const newState = state.clone();
                modified = this.analyzeStack(inputs.substacks[substackName], newState) || modified;
                modified = state.or(newState) || modified;
            }
            break;
        }
        default:
            modified = this.analyzeInputs(inputs, state) || modified;
            break;
        }

        return modified;
    }

    /**
     * @param {IntermediateStack?} stack
     * @param {TypeState} state
     * @returns {boolean}
     * @private
     */
    analyzeStack (stack, state) {
        if (!stack) return false;
        let modified = false;
        for (const stackBlock of stack.blocks) {
            let stateChanged = this.analyzeStackBlock(stackBlock, state);

            if (!stackBlock.ignoreState) {
                if (stackBlock.yields && !this.ignoreYields) stateChanged = state.clear() || stateChanged;

                if (stateChanged) {
                    if (stackBlock.exitState) stackBlock.exitState.or(state);
                    else stackBlock.exitState = state.clone();
                    modified = true;
                }
            }
        }
        return modified;
    }

    /**
     * @param {IntermediateStack} stack
     * @param {TypeState} state
     * @param {IntermediateStackBlock} block
     * @param {boolean} willReevaluateInputs
     * @returns {boolean}
     * @private
     */
    analyzeLoopedStack (stack, state, block, willReevaluateInputs) {
        let modified = false;

        if (block.yields && !this.ignoreYields) {
            modified = state.clear();
            if (willReevaluateInputs) {
                modified = this.analyzeInputs(block.inputs, state) || modified;
            }
            block.entryState = state.clone();
            block.exitState = state.clone();
            return this.analyzeStack(stack, state) || modified;
        }

        let iterations = 0;
        let keepLooping;
        do {
            // If we are stuck in an apparent infinite loop, give up and assume the worst.
            if (iterations > 10000) {
                log.error('analyzeLoopedStack stuck in likely infinite loop; quitting', block, state);
                modified = state.clear();
                block.entryState = state.clone();
                block.exitState = state.clone();
                modified = this.analyzeInputs(block.inputs, state) || modified;
                return this.analyzeStack(stack, state) || modified;
            }
            iterations++;

            const newState = state.clone();
            modified = this.analyzeStack(stack, newState) || modified;
            modified = (keepLooping = state.or(newState)) || modified;

            if (willReevaluateInputs) {
                modified = this.analyzeInputs(block.inputs, state) || modified;
            }
        } while (keepLooping);
        block.entryState = state.clone();
        return modified;
    }

    /**
     * @param {IntermediateInput} input
     * @param {TypeState} state
     * @returns {IntermediateInput}
     * @private
     */
    optimizeInput (input, state) {
        for (const inputKey in input.inputs) {
            const inputInput = input.inputs[inputKey];
            if (inputInput instanceof IntermediateInput) {
                input.inputs[inputKey] = this.optimizeInput(inputInput, state);
            }
        }

        switch (input.opcode) {
        case InputOpcode.CAST_BOOLEAN: {
            const targetType = input.inputs.target.type;
            if ((targetType & InputType.BOOLEAN) === targetType) {
                return input.inputs.target;
            }
            return input;
        }

        case InputOpcode.CAST_NUMBER: {
            const targetType = input.inputs.target.type;
            if ((targetType & InputType.NUMBER) === targetType) {
                return input.inputs.target;
            }
            return input;
        }

        case InputOpcode.CAST_NUMBER_INDEX: {
            const targetType = input.inputs.target.type;
            if ((targetType & InputType.NUMBER_INDEX) === targetType) {
                return input.inputs.target;
            }
            return input;
        }

        case InputOpcode.CAST_NUMBER_OR_NAN: {
            const targetType = input.inputs.target.type;
            if ((targetType & InputType.NUMBER_OR_NAN) === targetType) {
                return input.inputs.target;
            }
            return input;
        }

        case InputOpcode.CAST_STRING: {
            const targetType = input.inputs.target.type;
            if ((targetType & InputType.STRING) === targetType) {
                return input.inputs.target;
            }
            return input;
        }
        }

        return input;
    }

    /**
     * @param {IntermediateStack?} stack
     * @param {TypeState} state The state of the project before this stack is run.
     * @private
     */
    optimizeStack (stack, state) {
        if (!stack) return;
        for (const stackBlock of stack.blocks) {
            if (stackBlock.entryState) state = stackBlock.entryState;
            for (const inputKey in stackBlock.inputs) {
                const input = stackBlock.inputs[inputKey];
                if (input instanceof IntermediateInput) {
                    stackBlock.inputs[inputKey] = this.optimizeInput(input, state);
                } else if (input instanceof IntermediateStack) {
                    this.optimizeStack(input, state);
                }
            }
            if (stackBlock.exitState) {
                state = stackBlock.exitState;
            }
        }
    }

    /**
     * @param {IntermediateScript} script
     * @param {Set<string>} alreadyOptimized
     * @private
     */
    optimizeScript (script, alreadyOptimized) {
        if (script.isProcedure) {
            if (alreadyOptimized.has(script.procedureCode)) {
                return;
            }
            alreadyOptimized.add(script.procedureCode);
        }

        for (const procVariant of script.dependedProcedures) {
            this.optimizeScript(this.ir.procedures[procVariant], alreadyOptimized);
        }

        this.exitState = null;
        const exitState = new TypeState();
        this.analyzeStack(script.stack, exitState);

        this.addPossibleExitState(exitState);
        script.cachedAnalysisEndState = this.exitState;

        this.optimizeStack(script.stack, new TypeState());
    }

    optimize () {
        this.optimizeScript(this.ir.entry, new Set());
    }
}


module.exports = {
    IROptimizer,
    TypeState
};
