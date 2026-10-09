const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = {exports: {}};
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/accessibility/voiceGroups.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
}).outputText)(mod, mod.exports);
const {groupVoices, voiceDisplay, voiceLanguage} = mod.exports;
test('voices group by base language across regions, private tags and underscore locales', () => {
  const make = (id, language) => ({identifier: id, language, name: id});
  const groups = groupVoices([make('gb', 'en_GB'), make('us', 'en-US'), make('es', 'es-ES'), make('ar-local', 'ar-XA-x-arc-local'), make('unknown', '')]);
  assert.deepEqual(groups.map((g) => g.label), ['Arabic', 'English', 'Spanish', 'Other languages']);
  assert.deepEqual(groups.find((g) => g.id === 'en').voices.map((v) => v.identifier), ['gb', 'us']);
});
test('engine duplicates do not create duplicate choices; technical voice names get readable labels', () => {
  const technical = {identifier: 'en-test', name: 'en-us-x-iom-local', language: 'en-US'};
  assert.equal(groupVoices([technical, technical])[0].voices.length, 1);
  assert.deepEqual(voiceDisplay(technical, 2), {label: 'Voice 3', subtitle: 'en-US · Local'});
  assert.equal(voiceDisplay({...technical, name: 'Samantha'}, 0).label, 'Samantha');
  assert.equal(voiceLanguage({language: 'und'}), 'other');
});
