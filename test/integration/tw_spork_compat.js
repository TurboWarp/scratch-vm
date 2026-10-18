const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const VM = require('../../src/virtual-machine');

test('spork compat: procedure prototype and argument reporters load as shadows', async () => {
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-spork-custom-block-definition.sb3'));
    await vm.loadProject(fixture);
    let prototypeCount = 0;
    let argumentReporterCount = 0;

    for (const target of vm.runtime.targets) {
        for (const block of Object.values(target.blocks._blocks)) {
            if (block.opcode === 'procedures_prototype') {
                prototypeCount++;
                assert.strictEqual(block.shadow, true);
            } else if (block.opcode.startsWith('argument_reporter_')) {
                argumentReporterCount++;
                assert.strictEqual(block.shadow, true);
            }
        }
    }

    assert.strictEqual(prototypeCount, 1);
    assert.strictEqual(argumentReporterCount, 2);
});

test('spork compat: control_stop blocks get a mutation derived from STOP_OPTION', async () => {
    const vm = new VM();
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/tw-spork-stop-other-scripts.sb3'));
    await vm.loadProject(fixture);
    let otherScriptsInSprite = 0;
    let all = 0;
    let thisScript = 0;

    for (const target of vm.runtime.targets) {
        for (const block of Object.values(target.blocks._blocks)) {
            if (block.opcode !== 'control_stop') {
                continue;
            }
            const stopOption = block.fields.STOP_OPTION.value;
            if (stopOption === 'other scripts in sprite') {
                otherScriptsInSprite++;
                assert.deepEqual(block.mutation, {tagName: 'mutation', hasnext: 'true', children: []});
            } else if (stopOption === 'all') {
                all++;
                assert.deepEqual(block.mutation, {tagName: 'mutation', hasnext: 'false', children: []});
            } else if (stopOption === 'this script') {
                thisScript++;
                assert.deepEqual(block.mutation, {tagName: 'mutation', hasnext: 'false', children: []});
            } else {
                assert.fail(`unexpected STOP_OPTION value: ${stopOption}`);
            }
        }
    }

    assert.strictEqual(otherScriptsInSprite, 2);
    assert.strictEqual(all, 1);
    assert.strictEqual(thisScript, 1);
});
