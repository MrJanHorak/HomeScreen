const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, imports = {}, globals = {}) {
  const module = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
  }).outputText;
  new Function('module', 'exports', 'require', ...Object.keys(globals), code)(module, module.exports,
    (name) => {if (!(name in imports)) throw new Error(`Unexpected import: ${name}`); return imports[name];}, ...Object.values(globals));
  return module.exports;
}
const {FocusMemory} = load('src/navigation/focusMemory.ts');
const {parseLaunch, parseFrames, parseMemory, options} = require('../scripts/benchmark-tv.cjs');

test('default focus is used only until the user selects a registered target', () => {
  const memory = new FocusMemory(), focused = [];
  memory.register('header:settings', () => focused.push('settings'));
  memory.register('weather', () => focused.push('weather'));
  memory.blocked = true;
  assert.equal(memory.focusDefault('header:settings'), false);
  memory.blocked = false;
  assert.equal(memory.focusDefault('missing'), false);
  assert.equal(memory.focusDefault('header:settings'), true);
  memory.remember('weather');
  assert.equal(memory.focusDefault('header:settings'), false);
  assert.deepEqual(focused, ['settings']);
});
test('focus follows stable identity after tiles remount in another order', () => {
  const memory = new FocusMemory(), selected = [];
  const remove = ['weather', 'tasks', 'media'].map((id) => memory.register(id, () => selected.push(id)));
  memory.remember('tasks'); memory.blocked = true;
  remove.forEach((fn) => fn());
  for (const id of ['media', 'weather', 'tasks']) memory.register(id, () => selected.push(id));
  memory.remember('media'); // a covered dashboard must not lose its return target
  assert.equal(memory.restore(), 'tasks');
  assert.deepEqual(selected, ['tasks']);
});
test('a removed tile restores its next neighbor, or previous neighbor at the end', () => {
  for (const [selected, expected] of [['tasks', 'media'], ['media', 'tasks']]) {
    const memory = new FocusMemory();
    const removers = Object.fromEntries(['weather', 'tasks', 'media'].map((id) => [id, memory.register(id, () => {})]));
    memory.remember(selected); removers[selected]();
    assert.equal(memory.restore(), expected);
  }
});
test('stale ref cleanup cannot remove a replacement target and empty screens are safe', () => {
  const memory = new FocusMemory(); let count = 0;
  const old = memory.register('weather', () => {throw new Error('stale ref');});
  memory.remember('weather'); const remove = memory.register('weather', () => count++);
  old(); assert.equal(memory.restore(), 'weather'); assert.equal(count, 1);
  remove(); assert.equal(memory.restore(), null);
});
test('clock ticks at minute boundaries, sleeps in background, and catches up on resume', () => {
  let now = 12_345, onAppChange, subscriber, value;
  const timers = new Map(); let serial = 0;
  const native = {AppState: {currentState: 'active', addEventListener: (_name, fn) => {onAppChange = fn; return {remove() {onAppChange = null;}};}}};
  const react = {useCallback: (fn) => fn, useSyncExternalStore: (subscribe, snapshot) => {subscriber = subscribe; value = snapshot;}};
  const {default: useClock} = load('src/hooks/useTVClock.ts', {react, 'react-native': native}, {
    Date: {now: () => now}, setTimeout: (fn, ms) => {timers.set(++serial, {fn, ms}); return serial;}, clearTimeout: (id) => timers.delete(id),
  });
  useClock(); let notifications = 0;
  const unsubscribe = subscriber(() => notifications++);
  assert.equal([...timers.values()][0].ms, 47_655);
  now = 60_000; const [id, timer] = [...timers][0]; timers.delete(id); timer.fn();
  assert.equal(value(), 60_000); assert.equal([...timers.values()][0].ms, 60_000);
  native.AppState.currentState = 'background'; onAppChange('background'); assert.equal(timers.size, 0);
  now = 200_000; native.AppState.currentState = 'active'; onAppChange('active');
  assert.equal(value(), now); assert.equal([...timers.values()][0].ms, 40_000);
  assert.equal(notifications, 3);
  unsubscribe(); assert.equal(timers.size, 0); assert.equal(onAppChange, null);
});
test('poll expiry wakes the shared clock between minute ticks without a per-second timer', () => {
  let now = 12_345, subscribe, snapshot, nextTimer;
  const react = {useCallback: (fn) => fn, useSyncExternalStore: (sub, get) => {subscribe = sub; snapshot = get;}};
  const {default: useClock} = load('src/hooks/useTVClock.ts', {react,
    'react-native': {AppState: {currentState: 'active', addEventListener: () => ({remove() {}})}},
  }, {Date: {now: () => now}, setTimeout: (fn, ms) => {nextTimer = {fn, ms}; return 1;}, clearTimeout: () => {}});
  useClock(12_500);
  const stop = subscribe(() => {});
  assert.equal(nextTimer.ms, 155);
  now = 12_500; nextTimer.fn();
  assert.equal(snapshot(), 12_500);
  assert.equal(nextTimer.ms, 47_500, 'expired deadlines must not create a zero-delay loop');
  stop();
});
test('benchmark accepts successful warm launches without fabricating a startup time', () => {
  assert.deepEqual(parseLaunch('Status: ok\nTotalTime: 123\nWaitTime: 150\n'), {totalTimeMs: 123, waitTimeMs: 150});
  assert.deepEqual(parseLaunch('Status: ok\nWaitTime: 2\n'), {totalTimeMs: null, waitTimeMs: 2});
  assert.throws(() => parseLaunch('Error: Activity class does not exist'), /successful/);
});
test('frame parser respects column names and rejects incomplete frames', () => {
  const frames = parseFrames('Total frames rendered: 3\nJanky frames: 1 (33%)\nFlags,Vsync,IntendedVsync,FrameCompleted,\n0,1,1000000,11000000,\n0,2,2000000,22000000,\n0,3,3000000,9223372036854775807,\n1,4,4000000,44000000,');
  assert.deepEqual(frames, {sampledFrames: 2, p50Ms: 10, p95Ms: 20, totalFrames: 3, jankyFrames: 1});
  assert.equal(parseFrames('No graphics data').p95Ms, null);
  assert.equal(parseMemory('TOTAL PSS: 1234 TOTAL RSS: 2222'), 1234);
  assert.equal(parseMemory('  TOTAL   456  100  0'), 456);
  assert.equal(parseMemory('No process found'), null);
});
test('benchmark requires an explicit device, bounded repetitions and matching component', () => {
  assert.throws(() => options([]), /serial/);
  assert.throws(() => options(['--serial', 'tv', '--runs', 'NaN']), /runs/);
  assert.throws(() => options(['--serial', 'tv', '--component', 'other.pkg/.Main']), /Component/);
  const opts = options(['--serial', '192.168.1.2:5555', '--dry-run']);
  assert.equal(opts.component, 'com.anonymous.mytvapp/.MainActivity');
  assert.equal(opts.runs, 5);
});
