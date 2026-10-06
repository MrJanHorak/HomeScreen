const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

module.exports = function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
  }).outputText;
  const result = {exports:{}};
  new Function('module', 'exports', 'require', code)(result, result.exports,
    id => id.startsWith('.') ? load(path.resolve(path.dirname(file), id) + '.ts') : require(id));
  return result.exports;
};
