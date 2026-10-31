const {test} = require('node:test');
const assert = require('node:assert');
const Snapshots = require('../snapshot/lib');

for (const testCase of Snapshots.tests) {
    // eslint-disable-next-line no-loop-func
    test(testCase.id, async () => {
        const expected = Snapshots.getExpectedSnapshot(testCase);
        const actual = await Snapshots.generateActualSnapshot(testCase);
        const result = Snapshots.compareSnapshots(expected, actual);
        if (result === 'INPUT_MODIFIED') {
            assert.fail('input project changed; run: node test/snapshot --update');
        } else if (result === 'MISSING_SNAPSHOT') {
            assert.fail('snapshot is missing; run: node test/snapshot --update');
        } else if (result !== 'VALID') {
            // This assertion will always fail, but it will print out the snapshots
            // for easier comparison.
            assert.strictEqual(actual, expected, 'did not match; you may have to run: node test/snapshot --update');
        }
    });
}
