const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/accessibility/speechDriver.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
}).outputText;
const voice = (identifier) => ({identifier, name: identifier, language: 'en-US', quality: 'Default'});
function setup(getVoices) {
  const calls = [], timers = new Set();
  const engine = {getAvailableVoicesAsync: getVoices, maxSpeechInputLength: 4000,
    speak: (text, options) => calls.push({text, options}), stop: async () => {}};
  const mod = {exports: {}};
  new Function('module', 'exports', 'require', 'setTimeout', 'clearTimeout', code)(
    mod, mod.exports, () => engine,
    (callback) => {timers.add(callback); return callback;}, (timer) => timers.delete(timer));
  return {...mod.exports, calls, timers};
}
const preference = {enabled: false, rate: 1, voice: 'a'};
const speak = (driver, prefs = preference, isCurrent = () => true) => driver.speak('Preview', prefs, () => {}, isCurrent);

test('native voice discovery shares initialization and cached previews apply a new voice immediately', async () => {
  let queries = 0, release, started;
  const gate = new Promise((resolve) => {release = resolve;});
  const initialization = new Promise((resolve) => {started = resolve;});
  const {availableVoices, speechDriver, calls} = setup(() => {queries++; started(); return gate;});
  const first = availableVoices();
  assert.equal(availableVoices(), first);
  await initialization; assert.equal(queries, 1);
  release([voice('a'), voice('b')]); await first;
  await speak(speechDriver); await speak(speechDriver, {...preference, voice: 'b', rate: 0.75});
  assert.equal(queries, 1);
  assert.deepEqual(calls.map(({options}) => [options.voice, options.rate]), [['a', 1], ['b', 0.75]]);
});

test('explicit refresh discovers downloaded voices and removed selections fall back to default', async () => {
  let voices = [voice('a')], queries = 0;
  const {availableVoices, speechDriver, calls} = setup(async () => {queries++; return voices;});
  await availableVoices(); voices = [voice('b')];
  assert.equal((await availableVoices())[0].identifier, 'a');
  assert.equal((await availableVoices(true))[0].identifier, 'b');
  await speak(speechDriver);
  assert.equal(calls[0].options.voice, undefined); assert.equal(queries, 2);
});

test('a stalled TV engine times out and a retry is not overwritten by the late result', async () => {
  let release, queries = 0;
  const gate = new Promise((resolve) => {release = resolve;});
  const {availableVoices, timers} = setup(() => ++queries === 1 ? gate : Promise.resolve([voice('b')]));
  const pending = availableVoices();
  const rejection = assert.rejects(pending, /did not load its voices/);
  for (const timer of timers) timer();
  await rejection;
  assert.equal((await availableVoices())[0].identifier, 'b');
  release([voice('a')]); await Promise.resolve(); await Promise.resolve();
  assert.equal((await availableVoices())[0].identifier, 'b');
});

test('canceling during TV voice initialization prevents stale speech', async () => {
  let release, current = true;
  const gate = new Promise((resolve) => {release = resolve;});
  const {speechDriver, calls} = setup(() => gate);
  const pending = speak(speechDriver, preference, () => current);
  current = false; release([voice('a')]); await pending;
  assert.equal(calls.length, 0);
});
