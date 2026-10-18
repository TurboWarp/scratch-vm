const fs = require('fs');
const path = require('path');

const {test} = require('node:test');

const makeTestStorage = require('../fixtures/make-test-storage');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/index');

/**
 * @fileoverview Transform each sb2 in fixtures/execute into a test.
 *
 * Test execution of a group of scratch blocks by SAYing if a test did "pass",
 * or did "fail". Four keywords can be set at the beginning of a SAY messaage
 * to indicate a test primitive.
 *
 * - "pass MESSAGE" will pass an assertion with MESSAGE.
 * - "fail MESSAGE" will fail the test with MESSAGE once the project finishes.
 * - "plan NUMBER_OF_TESTS" will t.plan(Number(NUMBER_OF_TESTS)).
 * - "end" marks the test as having reached its end.
 *
 * A good strategy to follow is to SAY "plan NUMBER_OF_TESTS" first. Then
 * "pass" and "fail" depending on expected scratch results in conditions, event
 * scripts, or what is best for testing the target block or group of blocks.
 * When its done you must SAY "end" so the test knows that the end has
 * been reached.
 */

const whenThreadsComplete = (t, vm, uri, timeLimit = 5000) =>
    // When the number of threads reaches 0 the test is expected to be complete.
    new Promise((resolve, reject) => {
        const intervalId = setInterval(() => {
            let active = 0;
            const threads = vm.runtime.threads;
            for (let i = 0; i < threads.length; i++) {
                if (!threads[i].updateMonitor) {
                    active += 1;
                }
            }
            if (active === 0) {
                resolve();
            }
        }, 50);

        const timeoutId = setTimeout(() => {
            // Attempt to stop the lingering VM from interfering with other tests.
            vm.quit();

            reject(new Error(`Timeout waiting for threads to complete: ${uri}`));
        }, timeLimit);

        // Clear the interval to allow the process to exit
        // naturally.
        t.after(() => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        });
    });

const executeDir = path.resolve(__dirname, '../fixtures/execute');

// Find files which end in ".sb", ".sb2", or ".sb3"
const fileFilter = /\.sb[23]?$/i;

fs.readdirSync(executeDir)
    .filter(uri => fileFilter.test(uri))
    .forEach(uri => {
        const run = async (t, enableCompiler) => {
            const vm = new VirtualMachine();
            // Stop a VM left running by a failed test from leaking into later tests.
            t.after(() => vm.quit());

            // Map string messages to test reporting methods. This will be used
            // with events from scratch's runtime emitted on block instructions.
            let didPlan;
            let didEnd;
            const failures = [];
            const reporters = {
                comment (message) {
                    t.diagnostic(message);
                },
                pass (reason) {
                    t.assert.ok(true, reason);
                },
                fail (reason) {
                    failures.push(reason);
                },
                plan (count) {
                    didPlan = true;
                    t.plan(Number(count));
                },
                end () {
                    didEnd = true;
                    vm.quit();
                }
            };
            const reportVmResult = text => {
                const command = text.split(/\s+/, 1)[0].toLowerCase();
                if (reporters[command]) {
                    return reporters[command](text.substring(command.length).trim());
                }

                // Default to a comment with the full text if we didn't match
                // any command prefix
                return reporters.comment(text);
            };

            vm.attachStorage(makeTestStorage());

            // Start the VM and initialize some vm properties.
            // complete.
            vm.start();
            vm.clear();
            vm.setCompatibilityMode(false);
            vm.setTurboMode(false);
            vm.setCompilerOptions({enabled: enableCompiler});

            // TW: Script compilation errors should fail.
            if (enableCompiler) {
                vm.on('COMPILE_ERROR', (target, error) => {
                    throw new Error(`Could not compile script in ${target.getName()}: ${error}`);
                });
            }

            // Report the text of SAY events as testing instructions.
            vm.runtime.on('SAY', (target, type, text) => reportVmResult(text));

            const project = readFileToBuffer(path.resolve(executeDir, uri));

            // Load the project and once all threads are complete ensure that
            // the scratch project sent us a "end" message.
            await vm.loadProject(project);
            await vm.greenFlag();
            await whenThreadsComplete(t, vm, uri);
            // Setting a plan is not required but is a good idea.
            if (!didPlan) {
                t.diagnostic('did not say "plan NUMBER_OF_TESTS"');
            }

            // If the test has an SAY "end" block but that block did not
            // execute, this explicit failure will raise that issue so
            // it can be resolved.
            if (!didEnd) {
                vm.quit();
                failures.push('did not say "end"');
            }

            // Not an assertion, as it would count towards the project's plan.
            if (failures.length) {
                throw new Error(failures.join('\n'));
            }
        };
        test(`${uri} (interpreted)`, t => run(t, false));
        test(`${uri} (compiled)`, t => run(t, true));
    });
