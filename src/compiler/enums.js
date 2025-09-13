// @ts-check

/**
 * @fileoverview Common enums shared amongst parts of the compiler.
 */


/**
 * Enum for the type of the value that is returned by reporter blocks and stored in constants.
 *
 * At compile time, often we don't know exactly type a value will be but we can tell it must be one of a
 * set of types. For this reason, the number value of each type represents a possibility space, where set
 * bits indicate that their corropoding type *could* be encountered at runtime.
 * For example, a type of InputType.NUMBER | InputType.STRING means the value will be either a number or
 * a string at runtime, the compiler can't tell which, but we do know that it's not a boolean or NaN as
 * those bits are not set.
 *
 * @readonly
 * @enum {number}
 */
const InputType = {
    /** The value Infinity */
    NUMBER_POS_INF: 0x001,
    /** Any natural number */
    NUMBER_POS_INT: 0x002,
    /** Any positive fractional number, excluding integers. */
    NUMBER_POS_FRACT: 0x004,
    /** Any positive number excluding 0 and Infinity. Equal to NUMBER_POS_INT | NUMBER_POS_FRACT */
    NUMBER_POS_REAL: 0x006,
    /** The value 0 */
    NUMBER_ZERO: 0x008,
    /** The value -0 */
    NUMBER_NEG_ZERO: 0x010,
    /** Any negitive integer excluding -0 */
    NUMBER_NEG_INT: 0x020,
    /** Any negitive fractional number, excluding integers. */
    NUMBER_NEG_FRACT: 0x040,
    /** Any negitive number excluding -0 and -Infinity. Equal to NUMBER_NEG_INT | NUMBER_NEG_FRACT */
    NUMBER_NEG_REAL: 0x060,
    /** The value -Infinity */
    NUMBER_NEG_INF: 0x080,

    /** The value NaN */
    NUMBER_NAN: 0x100,

    /** Either 0 or -0. Equal to NUMBER_ZERO | NUMBER_NEG_ZERO */
    NUMBER_ANY_ZERO: 0x018,
    /** Either Infinity or -Infinity. Equal to NUMBER_POS_INF | NUMBER_NEG_INF */
    NUMBER_INF: 0x081,
    /** Any positive number, excluding 0. Equal to NUMBER_POS_REAL | NUMBER_POS_INF */
    NUMBER_POS: 0x007,
    /** Any negitive number, excluding -0. Equal to NUMBER_NEG_REAL | NUMBER_NEG_INF */
    NUMBER_NEG: 0x0E0,
    /** Any whole number. Equal to NUMBER_POS_INT | NUMBER_ZERO */
    NUMBER_WHOLE: 0x00A,
    /** Any integer. Equal to NUMBER_POS_INT | NUMBER_ANY_ZERO | NUMBER_NEG_INT */
    NUMBER_INT: 0x03A,
    /** Any number that works as an array index. Equal to NUMBER_INT | NUMBER_INF | NUMBER_NAN */
    NUMBER_INDEX: 0x1BB,
    /** Any fractional non-integer numbers. Equal to NUMBER_POS_FRACT | NUMBER_NEG_FRACT */
    NUMBER_FRACT: 0x44,
    /** Any real number. Equal to NUMBER_POS_REAL | NUMBER_ANY_ZERO | NUMBER_NEG_REAL */
    NUMBER_REAL: 0x07E,

    /** Any number, excluding NaN. Equal to NUMBER_REAL | NUMBER_INF */
    NUMBER: 0x0FF,
    /** Any number, including NaN. Equal to NUMBER | NUMBER_NAN */
    NUMBER_OR_NAN: 0x1FF,
    /** Anything that can be interperated as a number. Equal to NUMBER | STRING_NUM | BOOLEAN */
    NUMBER_INTERPRETABLE: 0x12FF,

    /** Any string which as a non-NaN neumeric interpretation, excluding ''.  */
    STRING_NUM: 0x200,
    /** Any string which has no non-NaN neumeric interpretation, including ''. */
    STRING_NAN: 0x400,
    /** Either of the strings 'true' or 'false'. */
    STRING_BOOLEAN: 0x800,

    /** Any string. Equal to STRING_NUM | STRING_NAN | STRING_BOOLEAN */
    STRING: 0xE00,

    /** Any boolean. */
    BOOLEAN: 0x1000,
    /** Any input that can be interperated as a boolean. Equal to BOOLEAN | STRING_BOOLEAN */
    BOOLEAN_INTERPRETABLE: 0x1800,

    /** Any value type (a type a scratch variable can hold). Equal to NUMBER_OR_NAN | STRING | BOOLEAN */
    ANY: 0x1FFF,

    /** An array of values in the form [R, G, B] */
    COLOR: 0x2000
};

/**
 * Enum for the opcodes of the stackable blocks used in the IR AST.
 * @readonly
 * @enum {string}
 */
const StackOpcode = {
    NOP: 'noop',

    ADDON_CALL: 'addons.call',
    DEBUGGER: 'tw.debugger',
    VISUAL_REPORT: 'visualReport',
    COMPATIBILITY_LAYER: 'compat',
    OLD_COMPILER_COMPATIBILITY_LAYER: 'oldCompiler',

    HAT_EDGE: 'hat.edge',
    HAT_PREDICATE: 'hat.predicate',

    CONTROL_IF_ELSE: 'control.if',
    CONTROL_CLONE_CREATE: 'control.createClone',
    CONTROL_CLONE_DELETE: 'control.deleteClone',
    CONTROL_WHILE: 'control.while',
    CONTROL_FOR: 'control.for',
    CONTROL_REPEAT: 'control.repeat',
    CONTROL_STOP_ALL: 'control.stopAll',
    CONTROL_STOP_OTHERS: 'control.stopOthers',
    CONTROL_STOP_SCRIPT: 'control.stopScript',
    CONTROL_WAIT: 'control.wait',
    CONTROL_WAIT_UNTIL: 'control.waitUntil',
    CONTROL_CLEAR_COUNTER: 'control.counterClear',
    CONTORL_INCR_COUNTER: 'control.counterIncr',

    LIST_ADD: 'list.add',
    LIST_INSERT: 'list.instert',
    LIST_REPLACE: 'list.replace',
    LIST_DELETE_ALL: 'list.deleteAll',
    LIST_DELETE: 'list.delete',
    LIST_SHOW: 'list.show',
    LIST_HIDE: 'list.hide',

    VAR_SET: 'var.set',
    VAR_SHOW: 'var.show',
    VAR_HIDE: 'var.hide',

    EVENT_BROADCAST: 'event.broadcast',
    EVENT_BROADCAST_AND_WAIT: 'event.broadcastAndWait',

    LOOKS_EFFECT_SET: 'looks.setEffect',
    LOOKS_EFFECT_CHANGE: 'looks.changeEffect',
    LOOKS_EFFECT_CLEAR: 'looks.clearEffects',
    LOOKS_SIZE_CHANGE: 'looks.changeSize',
    LOOKS_SIZE_SET: 'looks.setSize',
    LOOKS_LAYER_FORWARD: 'looks.forwardLayers',
    LOOKS_LAYER_BACKWARD: 'looks.backwardLayers',
    LOOKS_LAYER_FRONT: 'looks.goToFront',
    LOOKS_LAYER_BACK: 'looks.goToBack',
    LOOKS_HIDE: 'looks.hide',
    LOOKS_SHOW: 'looks.show',
    LOOKS_BACKDROP_NEXT: 'looks.nextBackdrop',
    LOOKS_BACKDROP_SET: 'looks.switchBackdrop',
    LOOKS_COSTUME_NEXT: 'looks.nextCostume',
    LOOKS_COSTUME_SET: 'looks.switchCostume',

    MOTION_X_SET: 'motion.setX',
    MOTION_X_CHANGE: 'motion.changeX',
    MOTION_Y_SET: 'motion.setY',
    MOTION_Y_CHANGE: 'motion.changeY',
    MOTION_XY_SET: 'motion.setXY',
    MOTION_IF_ON_EDGE_BOUNCE: 'motion.ifOnEdgeBounce',
    MOTION_STEP: 'motion.step',
    MOTION_ROTATION_STYLE_SET: 'motion.setRotationStyle',
    MOTION_DIRECTION_SET: 'motion.setDirection',

    PEN_UP: 'pen.up',
    PEN_DOWN: 'pen.down',
    PEN_CLEAR: 'pen.clear',
    PEN_COLOR_PARAM_SET: 'pen.setParam',
    PEN_COLOR_PARAM_CHANGE: 'pen.changeParam',
    PEN_COLOR_HUE_CHANGE_LEGACY: 'pen.legacyChangeHue',
    PEN_COLOR_HUE_SET_LEGACY: 'pen_setPenHueToNumber',
    PEN_COLOR_SHADE_CHANGE_LEGACY: 'pen.legacyChangeShade',
    PEN_COLOR_SHADE_SET_LEGACY: 'pen.legacySetShade',
    PEN_COLOR_SET: 'pen.setColor',
    PEN_SIZE_SET: 'pen.setSize',
    PEN_SIZE_CHANGE: 'pen.changeSize',
    PEN_STAMP: 'pen.stamp',

    SENSING_TIMER_RESET: 'timer.reset',

    PROCEDURE_RETURN: 'procedures.return',
    PROCEDURE_CALL: 'procedures.call'
};

/**
 * Enum for the opcodes of the reporter blocks used in the IR AST.
 * @readonly
 * @enum {string}
 */
const InputOpcode = {
    NOP: 'noop',

    ADDON_CALL: 'addons.call',
    CONSTANT: 'constant',

    CAST_NUMBER: 'cast.toNumber',
    CAST_NUMBER_INDEX: 'cast.toInteger',
    CAST_NUMBER_OR_NAN: 'cast.toNumberOrNaN',
    CAST_STRING: 'cast.toString',
    CAST_BOOLEAN: 'cast.toBoolean',
    CAST_COLOR: 'cast.toColor',

    COMPATIBILITY_LAYER: 'compat',
    OLD_COMPILER_COMPATIBILITY_LAYER: 'oldCompiler',

    LOOKS_BACKDROP_NUMBER: 'looks.backdropNumber',
    LOOKS_BACKDROP_NAME: 'looks.backdropName',
    LOOKS_COSTUME_NUMBER: 'looks.costumeNumber',
    LOOKS_COSTUME_NAME: 'looks.costumeName',
    LOOKS_SIZE_GET: 'looks.size',

    VAR_GET: 'var.get',

    LIST_GET: 'list.get',
    LIST_LENGTH: 'list.length',
    LIST_CONTAINS: 'list.contains',
    LIST_INDEX_OF: 'list.indexOf',
    LIST_CONTENTS: 'list.contents',

    MOTION_X_GET: 'motion.x',
    MOTION_Y_GET: 'motion.y',
    MOTION_DIRECTION_GET: 'motion.direction',

    OP_ADD: 'op.add',
    OP_AND: 'op.and',
    OP_CONTAINS: 'op.contains',
    OP_DIVIDE: 'op.divide',
    OP_EQUALS: 'op.equals',
    OP_GREATER: 'op.greater',
    OP_LESS: 'op.less',
    OP_JOIN: 'op.join',
    OP_LENGTH: 'op.length',
    OP_LETTER_OF: 'op.letterOf',
    OP_ABS: 'op.abs',
    OP_FLOOR: 'op.floor',
    OP_CEILING: 'op.ceiling',
    OP_SQRT: 'op.sqrt',
    OP_SIN: 'op.sin',
    OP_COS: 'op.cos',
    OP_TAN: 'op.tan',
    OP_ASIN: 'op.asin',
    OP_ACOS: 'op.acos',
    OP_ATAN: 'op.atan',
    OP_LOG_E: 'op.ln',
    OP_LOG_10: 'op.log',
    OP_POW_E: 'op.e^',
    OP_POW_10: 'op.10^',
    OP_MOD: 'op.mod',
    OP_MULTIPLY: 'op.multiply',
    OP_NOT: 'op.not',
    OP_OR: 'op.or',
    OP_RANDOM: 'op.random',
    OP_ROUND: 'op.round',
    OP_SUBTRACT: 'op.subtract',

    SENSING_ANSWER: 'sensing.answer',
    SENSING_COLOR_TOUCHING_COLOR: 'sensing.colorTouchingColor',
    SENSING_TIME_YEAR: 'sensing.year',
    SENSING_TIME_MONTH: 'sensing.month',
    SENSING_TIME_DATE: 'sensing.date',
    SENSING_TIME_WEEKDAY: 'sensing.dayofweek',
    SENSING_TIME_HOUR: 'sensing.hour',
    SENSING_TIME_MINUTE: 'sensing.minute',
    SENSING_TIME_SECOND: 'sensing.second',
    SENSING_TIME_DAYS_SINCE_2000: 'sensing.daysSince2000',
    SENSING_DISTANCE: 'sensing.distance',
    SENSING_KEY_DOWN: 'keyboard.pressed',
    SENSING_MOUSE_DOWN: 'mouse.down',
    SENSING_MOUSE_X: 'mouse.x',
    SENSING_MOUSE_Y: 'mouse.y',
    SENSING_OF: 'sensing.of',
    SENSING_OF_BACKDROP_NAME: 'sensing.of.backdropName',
    SENSING_OF_BACKDROP_NUMBER: 'sensing.of.backdropNumber',
    SENSING_OF_COSTUME_NAME: 'sensing.of.costumeName',
    SENSING_OF_COSTUME_NUMBER: 'sensing.of.costumeNumber',
    SENSING_OF_VOLUME: 'sensing.of.volume',
    SENSING_OF_POS_X: 'sensing.of.x',
    SENSING_OF_POS_Y: 'sensing.of.y',
    SENSING_OF_DIRECTION: 'sensing.of.direction',
    SENSING_OF_SIZE: 'sensing.of.size',
    SENSING_OF_VAR: 'sensing.of.var',
    SENSING_TIMER_GET: 'timer.get',
    SENSING_TOUCHING_COLOR: 'sensing.touchingColor',
    SENSING_TOUCHING_OBJECT: 'sensing.touching',
    SENSING_USERNAME: 'sensing.username',

    PROCEDURE_CALL: 'procedures.call',
    PROCEDURE_ARGUMENT: 'procedures.argument',

    CONTROL_COUNTER: 'control.counter',

    TW_KEY_LAST_PRESSED: 'tw.lastKeyPressed'
};

module.exports = {
    StackOpcode,
    InputOpcode,
    InputType
};
