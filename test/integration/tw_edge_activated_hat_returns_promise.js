const VM = require('../../src/virtual-machine');
const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const compilerAndInterpreter = (name, callback) => {
    test(`${name} - interpreted`, () => callback({
        enabled: false
    }));
    test(`${name} - compiled`, () => callback({
        enabled: true
    }));
};

compilerAndInterpreter('edge activated hats returning promises work properly', async co => {
    const vm = new VM();
    vm.setCompilerOptions(co);

    // Modify event_whengreaterthan to return a Promise (like a custom extension would) and allow us
    // to replace the value. This is a bit of a hack.
    let hatValue = false;
    vm.runtime._primitives.event_whengreaterthan = () => Promise.resolve(hatValue);

    // Track how many times the script was executed.
    let sayCounter = 0;
    vm.runtime.on('SAY', () => {
        sayCounter++;
    });

    const projectPath = path.join(__dirname, '..', 'fixtures', 'tw-edge-activated-hat-returns-promise.sb3');
    await vm.loadProject(fs.readFileSync(projectPath));

    const step = async (count = 1) => {
        for (let i = 0; i < count; i++) {
            vm.runtime._step();
            // Give promises returned by blocks a chance to resolve.
            await Promise.resolve();
        }
    };

    hatValue = false;
    await step(10);
    assert.strictEqual(sayCounter, 0);

    hatValue = true;
    await step();
    // promise can't resolve in this tick, so block shouldn't run yet
    assert.strictEqual(sayCounter, 0);
    await step();
    assert.strictEqual(sayCounter, 1);
    await step(10);
    assert.strictEqual(sayCounter, 1);

    hatValue = false;
    await step(10);
    assert.strictEqual(sayCounter, 1);

    hatValue = true;
    await step();
    assert.strictEqual(sayCounter, 1);
    await step();
    assert.strictEqual(sayCounter, 2);
    await step(10);
    assert.strictEqual(sayCounter, 2);
});
