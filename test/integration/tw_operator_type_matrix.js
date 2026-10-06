const {test} = require('tap');
const VM = require('../../src/virtual-machine');
const {BlockType, ArgumentType} = require('../../src/extension-support/tw-extension-api-common');
const {IRGenerator} = require('../../src/compiler/irgen');
const {IROptimizer} = require('../../src/compiler/iroptimizer');
const {IntermediateInput, stringifyType} = require('../../src/compiler/intermediate');
const nanolog = require('@turbowarp/nanolog');

const VALUES = [
    NaN,

    -Infinity,
    -1e+308,
    -1,
    -0.5,
    -1e-324,
    -0,
    0,
    1e-324,
    0.5,
    1,
    1e+308,
    Infinity
];

const createBinaryOperator = opcode => ({
    opcode,
    inputNames: ['NUM1', 'NUM2'],
    fields: {}
});

const createMathopOperator = name => ({
    opcode: 'operator_mathop',
    inputNames: ['NUM'],
    fields: {
        OPERATOR: [
            name,
            null
        ]
    }
});

const OPERATORS = [
    createBinaryOperator('operator_add'),
    createBinaryOperator('operator_subtract'),
    createBinaryOperator('operator_divide'),
    createBinaryOperator('operator_multiply'),
    createBinaryOperator('operator_mod'),

    createMathopOperator('abs'),
    createMathopOperator('floor'),
    createMathopOperator('ceiling'),
    createMathopOperator('sqrt'),
    createMathopOperator('sin'),
    createMathopOperator('cos'),
    createMathopOperator('tan'),
    createMathopOperator('asin'),
    createMathopOperator('acos'),
    createMathopOperator('atan'),
    createMathopOperator('ln'),
    createMathopOperator('log'),
    createMathopOperator('e ^'),
    createMathopOperator('10 ^')
];

const str = number => (Object.is(number, -0) ? '-0' : number.toString());

test('operator type matrix', async t => {

    const vm = new VM();
    nanolog.disable();

    let reportedValue;

    class TestExtension {
        getInfo () {
            return {
                id: 'test',
                name: 'Test',
                blocks: [
                    {
                        opcode: 'report',
                        blockType: BlockType.COMMAND,
                        text: 'report [INPUT]',
                        isEdgeActivated: false,
                        arguments: {
                            INPUT: {
                                type: ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        }
                    }
                ]
            };
        }
        report (args) {
            reportedValue = args.INPUT;
        }
    }

    vm.extensionManager.addBuiltinExtension('test', TestExtension);
    vm.setCompilerOptions({enabled: true});

    vm.on('COMPILE_ERROR', () => {
        t.fail('Compile error');
    });

    const testOperator = async (operator, inputs) => {

        const inputsSB3 = {};
        for (let i = 0; i < inputs.length; i++) {
            inputsSB3[operator.inputNames[i]] = [
                1,
                [
                    4,
                    `${Object.is(inputs[i], -0) ? '-0' : inputs[i]}`
                ]
            ];
        }

        await vm.loadProject({
            targets: [
                {
                    isStage: true,
                    name: 'Stage',
                    variables: {},
                    lists: {},
                    costumes: [
                        {
                            name: 'dummy',
                            dataFormat: 'svg',
                            assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                            md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg'
                        }
                    ],
                    sounds: [],

                    blocks: {
                        report: {
                            opcode: 'test_report',
                            inputs: {
                                INPUT: [
                                    3,
                                    'operator'
                                ]
                            }
                        },
                        operator: {
                            opcode: operator.opcode,
                            inputs: inputsSB3,
                            fields: operator.fields
                        }
                    }
                }
            ],
            meta: {
                semver: '3.0.0',
                vm: '0.2.0',
                agent: ''
            }
        });

        const thread = vm.runtime._pushThread('report', vm.runtime.targets[0]);

        const irGenerator = new IRGenerator(thread);
        const ir = irGenerator.generate();
        const irOptimizer = new IROptimizer(ir, thread.target);
        irOptimizer.optimize();


        while (vm.runtime.threads.length !== 0) {
            vm.runtime._step();
        }

        // The ir input representing our operator
        const irOperator = ir.entry.stack.blocks[0].inputs.inputs.INPUT;

        const expectedType = IntermediateInput.getNumberInputType(reportedValue);

        t.ok(
            irOperator.isSometimesType(expectedType),
            `${operator.opcode}${JSON.stringify(operator.fields)}[${inputs.map(str)}] ` +
            `outputted value ${str(reportedValue)} is of the expected type ${stringifyType(irOperator.type)}.`
        );
    };

    for (const operator of OPERATORS) {
        if (operator.inputNames.length === 2) {
            for (const left of VALUES) {
                for (const right of VALUES) {
                    await testOperator(operator, [left, right]);
                }
            }
        } else {
            for (const value of VALUES) {
                await testOperator(operator, [value]);
            }
        }
    }

    t.end();
});
