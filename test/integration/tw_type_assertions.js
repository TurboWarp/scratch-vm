const fs = require('fs');
const path = require('path');
const {test} = require('tap');
const VM = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');
const ArgumentType = require('../../src/extension-support/argument-type');
const {IRGenerator} = require('../../src/compiler/irgen');
const {IROptimizer} = require('../../src/compiler/iroptimizer');
const {StackOpcode, InputType, InputOpcode} = require('../../src/compiler/enums');
const {IntermediateStack} = require('../../src/compiler/intermediate');

const fixture = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'tw-type-assertions.sb3'));

test('type assertions', async t => {
    const vm = new VM();
    vm.setCompilerOptions({enabled: true, warpTimer: false});

    class TestExtension {
        getInfo () {
            return {
                id: 'typeassert',
                name: 'Type Assertions',
                blocks: [
                    {
                        opcode: 'assert',
                        blockType: BlockType.COMMAND,
                        text: 'assert [VALUE] is [ADVERB] [NOUN]',
                        arguments: {
                            VALUE: {
                                type: ArgumentType.STRING
                            },
                            ADVERB: {
                                type: ArgumentType.STRING,
                                menu: 'ADVERB_MENU'
                            },
                            NOUN: {
                                type: ArgumentType.STRING,
                                menu: 'NOUN_MENU'
                            }
                        }
                    },
                    {
                        opcode: 'region',
                        blockType: BlockType.CONDITIONAL,
                        text: 'region [NAME]',
                        arguments: {
                            NAME: {
                                type: ArgumentType.STRING
                            }
                        }
                    }
                ],
                menus: {
                    ADVERB_MENU: {
                        acceptReporters: false,
                        items: ['never', 'always', 'sometimes', 'exactly']
                    },
                    NOUN_MENU: {
                        acceptReporters: false,
                        items: ['zero', 'infinity', 'NaN', 'a number', 'a string', 'number interpretable', 'anything']
                    }
                }
            };
        }
        assert () { }
        region () {
            return true;
        }
    }

    vm.extensionManager.addBuiltinExtension('typeassert', TestExtension);

    vm.on('COMPILE_ERROR', () => {
        t.fail('Compile error');
    });

    await vm.loadProject(fixture);

    const thread = vm.runtime.startHats('event_whenflagclicked')[0];

    const enumerateAssertions = function* (blocks, region) {
        for (const block of blocks) {
            if (block.opcode === StackOpcode.COMPATIBILITY_LAYER) {
                switch (block.inputs.opcode) {
                case 'typeassert_assert':
                    yield {block, region};
                    break;
                case 'typeassert_region': {
                    const newRegionNameInput = block.inputs.inputs.NAME;
                    if (newRegionNameInput.opcode !== InputOpcode.CONSTANT) {
                        throw new Error('Region block inputs must be a constant.');
                    }
                    yield* enumerateAssertions(
                        block.inputs.substacks['1'].blocks,
                        (region ? `${region}, ` : '') + newRegionNameInput.inputs.value
                    );
                    break;
                }
                }
            } else {
                for (const inputName in block.inputs) {
                    const input = block.inputs[inputName];
                    if (input instanceof IntermediateStack) {
                        yield* enumerateAssertions(input.blocks, region);
                    }
                }
            }
        }
    };

    const irGenerator = new IRGenerator(thread);
    const ir = irGenerator.generate();

    const runTests = function (proccode, ignoreYields) {

        const assertions = [...enumerateAssertions(ir.getProcedure(proccode).stack.blocks)];

        for (const {block} of assertions) {
            block.ignoreState = true;
        }

        const irOptimizer = new IROptimizer(ir, thread.target);
        irOptimizer.ignoreYields = ignoreYields;
        irOptimizer.optimize();

        for (const {block, region} of assertions) {
            const valueInput = block.inputs.inputs.VALUE;
            const adverb = block.inputs.fields.ADVERB;
            const noun = block.inputs.fields.NOUN;

            let nounType;

            switch (noun) {
            case 'zero':
                nounType = InputType.NUMBER_ZERO;
                break;
            case 'infinity':
                nounType = InputType.NUMBER_POS_INF;
                break;
            case 'NaN':
                nounType = InputType.NUMBER_NAN;
                break;
            case 'a number':
                nounType = InputType.NUMBER;
                break;
            case 'a string':
                nounType = InputType.STRING;
                break;
            case 'number interpretable':
                nounType = InputType.NUMBER_INTERPRETABLE;
                break;
            case 'anything':
                nounType = InputType.ANY;
                break;
            default: throw new Error(`$Invalid noun menu option ${noun}`);
            }

            let message;

            if (valueInput.opcode === InputOpcode.VAR_GET) {
                message = `(${region}) assert variable '${valueInput.inputs.variable.name}' ` +
                `(type ${valueInput.type}) is ${adverb} ${noun}`;
            } else {
                message = `(${region}) assert ${valueInput.opcode} (type ${valueInput.type}) is ${adverb} ${noun}`;
            }

            switch (adverb) {
            case 'never':
                t.ok(!valueInput.isSometimesType(nounType), message);
                break;
            case 'always':
                t.ok(valueInput.isAlwaysType(nounType), message);
                break;
            case 'sometimes':
                t.ok(valueInput.isSometimesType(nounType), message);
                break;
            case 'exactly':
                t.equal(valueInput.type, nounType, message);
                break;
            default: throw new Error(`$Invalid adverb menu option ${adverb}`);
            }
        }
    };

    runTests('run tests with yields', false);
    runTests('run tests without yields', true);

    t.end();
});
