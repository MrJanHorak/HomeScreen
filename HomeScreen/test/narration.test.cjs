const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/accessibility/narration.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
}).outputText;
const mod = {exports: {}};
new Function('module', 'exports', code)(mod, mod.exports);
const {DEFAULT_NARRATION, normalizeNarration, selectionAnnouncement, NarrationController} = mod.exports;
const tick = () => new Promise((resolve) => setTimeout(resolve, 12));
function setup() {
  const spoken = [], errors = [], stops = [];
  const driver = {stop: async () => {stops.push(true);}, speak: async (text, preference, onError, isCurrent) => {
    if (isCurrent()) spoken.push({text, preference, onError});
  }};
  const controller = new NarrationController(driver, () => errors.push(true), 1);
  return {controller, driver, spoken, errors, stops};
}

test('corrupt saved preferences fall back safely and rates stay within usable bounds', () => {
  assert.deepEqual(normalizeNarration(null), DEFAULT_NARRATION);
  assert.deepEqual(normalizeNarration({enabled: 'true', rate: Infinity, voice: 2}), DEFAULT_NARRATION);
  assert.equal(normalizeNarration({rate: 10}).rate, 1.5);
  assert.equal(normalizeNarration({rate: -2}).rate, 0.5);
});
test('selection speech includes toggle, tab and disabled states and meaningful values', () => {
  assert.equal(selectionAnnouncement('High contrast', {selected: true}), 'High contrast. Selected');
  assert.equal(selectionAnnouncement('Narration', {checked: false}), 'Narration. Off');
  assert.equal(selectionAnnouncement('Volume', {disabled: true}, '50 percent'), 'Volume. 50 percent. Unavailable');
});
test('off blocks focus speech but permits an explicit voice preview', async () => {
  const {controller, spoken} = setup(); controller.configure(DEFAULT_NARRATION, true);
  controller.announce('Weather'); await tick(); assert.equal(spoken.length, 0);
  controller.announce('Preview', undefined, true); await tick(); assert.equal(spoken[0].text, 'Preview');
  controller.stop();
});
test('screen reader or background state blocks both navigation and previews', async () => {
  const {controller, spoken} = setup(); controller.configure({...DEFAULT_NARRATION, enabled: true}, false);
  controller.announce('Weather'); controller.announce('Preview', undefined, true); await tick();
  assert.equal(spoken.length, 0);
});
test('rapid focus changes speak only the latest selection; a late old blur cannot cancel it', async () => {
  const {controller, spoken} = setup(); controller.configure({...DEFAULT_NARRATION, enabled: true}, true);
  const old = {}, current = {};
  controller.announce('Weather', old); controller.announce('Tasks', current); controller.blur(old);
  await tick(); assert.deepEqual(spoken.map((item) => item.text), ['Tasks']);
  controller.blur(current); await tick();
});
test('stop and turning narration off cancel delayed announcements', async () => {
  const {controller, spoken} = setup(); controller.configure({...DEFAULT_NARRATION, enabled: true}, true);
  controller.announce('Weather'); controller.stop(); await tick(); assert.equal(spoken.length, 0);
  controller.announce('Tasks'); controller.configure(DEFAULT_NARRATION, true); await tick(); assert.equal(spoken.length, 0);
});
test('stale engine initialization cannot speak after stop, and current settings survive', async () => {
  const {controller, driver, spoken} = setup(); let release;
  const gate = new Promise((resolve) => {release = resolve;});
  driver.speak = async (text, preference, onError, isCurrent) => {
    await gate; if (isCurrent()) spoken.push({text, preference});
  };
  controller.configure({...DEFAULT_NARRATION, enabled: true}, true);
  controller.announce('Weather'); await tick(); controller.stop(); release(); await tick();
  assert.equal(spoken.length, 0);
  controller.configure({enabled: true, rate: 0.75, voice: 'voice-a'}, true);
  controller.announce('Tasks'); await tick(); assert.equal(spoken[0].preference.voice, 'voice-a');
  assert.equal(spoken[0].preference.rate, 0.75);
});
test('engine errors are reported and do not permanently poison subsequent speech', async () => {
  const {controller, driver, spoken, errors} = setup(); let fail = true;
  const speak = driver.speak;
  driver.speak = async (...args) => {if (fail) {fail = false; throw new Error('No engine');} return speak(...args);};
  controller.configure({...DEFAULT_NARRATION, enabled: true}, true);
  controller.announce('Weather'); await tick(); assert.equal(errors.length, 1);
  controller.announce('Tasks'); await tick(); assert.equal(spoken[0].text, 'Tasks');
});
