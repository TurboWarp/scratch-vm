// @ts-check

const {IRGenerator} = require('./irgen');
const {IROptimizer} = require('./iroptimizer');
const JSGenerator = require('./jsgen');

const compile = (/** @type {import("../engine/thread")} */ thread) => {
    const irGenerator = new IRGenerator(thread);
    const ir = irGenerator.generate();

    const irOptimizer = new IROptimizer(ir);
    irOptimizer.optimize();

    const procedures = {};
    const target = thread.target;

    const compileScript = (/** @type {import("./intermediate").IntermediateScript} */ script) => {
        if (script.cachedCompileResult) {
            return script.cachedCompileResult;
        }

        const compiler = new JSGenerator(script, ir, target);
        const result = compiler.compile();
        script.cachedCompileResult = result;
        return result;
    };

    const entry = compileScript(ir.entry);

    for (const procedureVariant of Object.keys(ir.procedures)) {
        const procedureData = ir.procedures[procedureVariant];
        const procedureTree = compileScript(procedureData);
        procedures[procedureVariant] = procedureTree;
    }

    const debuggerProfiling = Boolean(
        target.runtime.debuggerCompiledProfiler &&
        target.runtime.debuggerCompiledProfiler.enabled
    );
    const startingFunction = debuggerProfiling ? compiledThread => {
        const script = entry(compiledThread);
        return () => {
            const generator = script();
            const compiledProfiler = compiledThread.target.runtime.debuggerCompiledProfiler;
            return {
                next: () => {
                    try {
                        return generator.next();
                    } finally {
                        compiledProfiler.end(compiledThread);
                    }
                }
            };
        };
    } : entry;

    return {
        startingFunction,
        procedures,
        executableHat: ir.entry.executableHat
    };
};

module.exports = compile;
