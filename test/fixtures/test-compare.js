const assert = require('node:assert');

const testCompare = (lhs, op, rhs, message) => {
    const details = `${message}. Expected: ${lhs} ${op} ${rhs}`;
    switch (op) {
    case '<': return assert.ok(lhs < rhs, details);
    case '<=': return assert.ok(lhs <= rhs, details);
    case '===': return assert.ok(lhs === rhs, details);
    case '!==': return assert.ok(lhs !== rhs, details);
    case '>=': return assert.ok(lhs >= rhs, details);
    case '>': return assert.ok(lhs > rhs, details);
    default: return assert.fail(`Unrecognized op: ${op}`);
    }
};

module.exports = testCompare;
