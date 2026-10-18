const fs = require('fs');
const path = require('path');
const {test} = require('node:test');
const VirtualMachine = require('../../src/virtual-machine');
const Scratch = require('../../src/extension-support/tw-extension-api-common');

// Based on https://github.com/TurboWarp/scratch-vm/pull/141
class TestExtensionUsingReturn {
    getInfo () {
        return {
            id: 'loopsAndThings',
            name: 'Loops and things test - return',
            blocks: [
                {
                    opcode: 'conditional',
                    blockType: Scratch.BlockType.CONDITIONAL,
                    text: 'run branch [BRANCH] of',
                    arguments: {
                        BRANCH: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    branchCount: 3
                },
                {
                    opcode: 'loop',
                    blockType: Scratch.BlockType.LOOP,
                    text: 'my repeat [TIMES]',
                    arguments: {
                        TIMES: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    }
                },
                '---',
                {
                    opcode: 'testPromise',
                    blockType: Scratch.BlockType.REPORTER,
                    text: 'return [VALUE] in a Promise',
                    arguments: {
                        VALUE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: ''
                        }
                    }
                }
            ]
        };
    }

    conditional ({BRANCH}) {
        return Scratch.Cast.toNumber(BRANCH);
    }

    loop ({TIMES}, util) {
        const times = Math.round(Scratch.Cast.toNumber(TIMES));
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = times;
        }
        util.stackFrame.loopCounter--;
        if (util.stackFrame.loopCounter >= 0) {
            return true;
        }
    }

    testPromise ({VALUE}) {
        return Promise.resolve(VALUE);
    }
}

class TestExtensionUsingStartBranch {
    getInfo () {
        return {
            id: 'loopsAndThings',
            name: 'Loops and things test - startBranch',
            blocks: [
                {
                    opcode: 'conditional',
                    blockType: Scratch.BlockType.CONDITIONAL,
                    text: 'run branch [BRANCH] of',
                    arguments: {
                        BRANCH: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    branchCount: 3
                },
                {
                    opcode: 'loop',
                    blockType: Scratch.BlockType.LOOP,
                    text: 'my repeat [TIMES]',
                    arguments: {
                        TIMES: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    }
                },
                '---',
                {
                    opcode: 'testPromise',
                    blockType: Scratch.BlockType.REPORTER,
                    text: 'return [VALUE] in a Promise',
                    arguments: {
                        VALUE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: ''
                        }
                    }
                }
            ]
        };
    }

    conditional ({BRANCH}, util) {
        util.startBranch(Scratch.Cast.toNumber(BRANCH), false);
    }

    loop ({TIMES}, util) {
        const times = Math.round(Scratch.Cast.toNumber(TIMES));
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = times;
        }
        util.stackFrame.loopCounter--;
        if (util.stackFrame.loopCounter >= 0) {
            util.startBranch(1, true);
        }
    }

    testPromise ({VALUE}) {
        return Promise.resolve(VALUE);
    }
}

/* eslint-disable no-loop-func */

for (const Extension of [TestExtensionUsingReturn, TestExtensionUsingStartBranch]) {
    for (const compilerEnabled of [false, true]) {
        test(`CONDITIONAL - ${Extension.name} - ${compilerEnabled ? 'compiled' : 'interpreted'}`, (t, done) => {
            t.plan(1);

            const vm = new VirtualMachine();
            vm.setCompilerOptions({
                enabled: compilerEnabled
            });
            vm.extensionManager.addBuiltinExtension('loopsAndThings', Extension);
            vm.runtime.on('COMPILE_ERROR', () => {
                t.assert.fail('Compile error');
            });

            vm.loadProject(fs.readFileSync(path.join(__dirname, '../fixtures/tw-conditional.sb3'))).then(() => {
                let okayCount = 0;
                vm.runtime.on('SAY', (target, type, text) => {
                    if (text === 'OK!') {
                        okayCount++;
                    } else if (text === 'end') {
                        vm.quit();
                        t.assert.strictEqual(okayCount, 5);
                        done();
                    } else {
                        t.assert.fail(`Unexpected text: ${text}`);
                    }
                });

                vm.greenFlag();
                vm.start();
            });
        });

        test(`LOOP - ${Extension.name} - ${compilerEnabled ? 'compiled' : 'interpreted'}`, (t, done) => {
            t.plan(1);

            const vm = new VirtualMachine();
            vm.setCompilerOptions({
                enabled: compilerEnabled
            });
            vm.extensionManager.addBuiltinExtension('loopsAndThings', Extension);
            vm.runtime.on('COMPILE_ERROR', () => {
                t.assert.fail('Compile error');
            });

            vm.loadProject(fs.readFileSync(path.join(__dirname, '../fixtures/tw-loop.sb3'))).then(() => {
                vm.runtime.on('SAY', (target, type, text) => {
                    vm.quit();
                    t.assert.strictEqual(text, 'a 3 b 12 c 48 frames 64');
                    done();
                });

                vm.greenFlag();
                vm.start();
            });
        });

        test(`beyond branchCount - ${Extension.name} - ${compilerEnabled ? 'compiled' : 'interpreted'}`, (t, done) => {
            t.plan(1);

            const vm = new VirtualMachine();
            vm.setCompilerOptions({
                enabled: compilerEnabled
            });
            vm.extensionManager.addBuiltinExtension('loopsAndThings', Extension);
            vm.runtime.on('COMPILE_ERROR', () => {
                t.assert.fail('Compile error');
            });

            vm.loadProject(fs.readFileSync(path.join(__dirname, '../fixtures/tw-beyond-branchCount.sb3'))).then(() => {
                vm.runtime.on('SAY', (target, type, text) => {
                    if (text === 'BeyondBranchCount') {
                        t.assert.ok(true, 'BeyondBranchCount');
                    } else if (text === 'end') {
                        vm.quit();
                        done();
                    }
                });

                vm.greenFlag();
                vm.start();
            });
        });
    }
}
