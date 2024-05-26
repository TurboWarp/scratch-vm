/**
 * Types of block shapes
 * @enum {number}
 */
const BlockShape = {
    /**
     * Output shape: hexagonal (booleans/predicates).
     */
    HEXAGONAL: 1,

    /**
     * Output shape: rounded (numbers).
     */
    ROUND: 2,

    /**
     * Output shape: squared (any/all values; strings).
     */
    SQUARE: 3,
};

module.exports = BlockShape;
