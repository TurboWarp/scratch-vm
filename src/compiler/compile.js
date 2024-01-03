const {IRGenerator} = require('./irgen');
const JSGenerator = require('./jsgen');

const compile = thread => {
    const irGenerator = new IRGenerator(thread);
    const ir = irGenerator.generate();

    const procedures = {};
    const target = thread.target;

    const compileScript = script => {
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

    return {
        startingFunction: entry,
        procedures,
        executableHat: ir.entry.executableHat
    };
};

module.exports = compile;
