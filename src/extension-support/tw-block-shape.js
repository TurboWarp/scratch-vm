// Use the constants instead of manually redefining them again
const ScratchBlocksConstants = require('../engine/scratch-blocks-constants');

/**
 * Types of block shapes
 * @enum {number}
 */
const BlockShape = {
    /**
     * Output shape: hexagonal (booleans/predicates).
     */
    HEXAGONAL: ScratchBlocksConstants.OUTPUT_SHAPE_HEXAGONAL,

    /**
     * Output shape: rounded (numbers).
     */
    ROUND: ScratchBlocksConstants.OUTPUT_SHAPE_ROUND,

    /**
     * Output shape: squared (any/all values; strings).
     */
    SQUARE: ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE
};

module.exports = BlockShape;
