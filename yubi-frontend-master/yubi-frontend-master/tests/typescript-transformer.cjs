const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    return {
      code: ts.transpileModule(sourceText, {
        fileName: sourcePath,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2019,
          jsx: ts.JsxEmit.React,
          esModuleInterop: true,
          sourceMap: true,
        },
      }).outputText,
    };
  },
};
