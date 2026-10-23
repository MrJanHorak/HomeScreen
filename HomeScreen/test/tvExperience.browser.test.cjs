const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {chromium} = require('playwright');
let browser;
before(async () => {browser = await chromium.launch({headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => browser?.close());
const modules = Object.fromEntries([
  ['react', 'react/cjs/react.production.js'], ['react/jsx-runtime', 'react/cjs/react-jsx-runtime.production.js'],
  ['react-dom', 'react-dom/cjs/react-dom.production.js'], ['react-dom/client', 'react-dom/cjs/react-dom-client.production.js'],
  ['scheduler', 'scheduler/cjs/scheduler.production.js'],
].map(([name, file]) => {
  const rootName = file.split('/')[0];
  return [name, fs.readFileSync(path.join(path.dirname(require.resolve(rootName)), ...file.split('/').slice(1)), 'utf8')];
}));
for (const [name, file] of Object.entries({focusMemory: 'navigation/focusMemory.ts', ScreenFocus: 'navigation/ScreenFocus.tsx',
  DashboardFocusFrame: 'navigation/DashboardFocusFrame.web.tsx',
  MotionContext: 'accessibility/MotionContext.tsx', NarratedPressable: 'components/shared/NarratedPressable.tsx'})) {
  modules[name] = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX},
  }).outputText;
}

async function fixture(t, platform = 'web', saved = 'system') {
  const page = await browser.newPage({viewport: {width: 960, height: 540}});
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent('<div id="root"></div>');
  await page.evaluate(({modules, platform, saved}) => {
    const loaded = {};
    const aliases = {'./focusMemory': 'focusMemory', '../../navigation/ScreenFocus': 'ScreenFocus',
      '../../accessibility/MotionContext': 'MotionContext'};
    function load(name) {
      name = aliases[name] || name;
      if (loaded[name]) return loaded[name].exports;
      if (!modules[name]) throw new Error(`Unexpected import: ${name}`);
      const module = loaded[name] = {exports: {}};
      new Function('module', 'exports', 'require', modules[name])(module, module.exports, load);
      return module.exports;
    }
    const React = load('react');
    const appListeners = new Set(), motionListeners = new Set();
    const app = {currentState: 'active', addEventListener: (_name, fn) => {appListeners.add(fn); return {remove: () => appListeners.delete(fn)};}};
    window.appState = (state) => {app.currentState = state; appListeners.forEach((fn) => fn(state));};
    window.systemMotion = (enabled) => {window.systemReduced = enabled; motionListeners.forEach((fn) => fn(enabled));};
    const flatten = (style) => !style ? {} : Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style;
    const Pressable = React.forwardRef(function Pressable({children, onPress, onFocus, onBlur, style, disabled, accessibilityLabel}, ref) {
      const callback = React.useCallback((node) => {
        if (node) node.requestTVFocus = () => node.focus();
        if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;
      }, [ref]);
      const applied = flatten(typeof style === 'function' ? style({pressed: false, focused: false}) : style);
      const domStyle = {...applied, transform: applied.transform?.map((item) => `scale(${item.scale})`).join(' ')};
      return React.createElement('button', {ref: callback, onClick: onPress, onFocus, onBlur, disabled,
        'aria-label': accessibilityLabel, style: domStyle}, typeof children === 'function' ? children({pressed: false}) : children);
    });
    const View = React.forwardRef(function View({children, style, ...props}, ref) {
      return React.createElement('div', {ref, 'aria-hidden': props['aria-hidden'], style: flatten(style)}, children);
    });
    loaded['react-native'] = {exports: {Platform: {OS: platform}, AppState: app, Pressable, View,
      AccessibilityInfo: {isReduceMotionEnabled: async () => !!window.systemReduced,
        addEventListener: (_name, fn) => {motionListeners.add(fn); return {remove: () => motionListeners.delete(fn)};}}}};
    window.motionStorage = saved;
    loaded['@react-native-async-storage/async-storage'] = {exports: {getItem: async () => window.motionStorage,
      setItem: async (_key, value) => {window.motionStorage = value;}}};
    loaded['../../accessibility/NarrationContext'] = {exports: {useNarration: () => ({announce() {}, blur() {}, stop() {}, narrating: false})}};
    loaded['../../accessibility/narration'] = {exports: {selectionAnnouncement: (label) => label}};
    const {ScreenFocusProvider, ScreenFocusRestorer, useRememberedFocus} = load('ScreenFocus');
    const {MotionProvider, useMotion} = load('MotionContext');
    const Frame = load('DashboardFocusFrame').default;
    const Button = load('NarratedPressable').default;
    function Tile({id}) {
      const focus = useRememberedFocus(id);
      return React.createElement(Button, {ref: focus.ref, onFocus: focus.onFocus,
        accessibilityLabel: id, style: {transform: [{scale: 1.08}], transition: 'transform 1s'}}, id);
    }
    function Dashboard() {
      const [view, setView] = React.useState('dashboard');
      const [items, setItems] = React.useState(['weather', 'tasks', 'media']);
      const motion = useMotion();
      window.experience = {setView, setItems, motion};
      return React.createElement(React.Fragment, null,
        React.createElement(ScreenFocusRestorer, {active: view === 'dashboard'}),
        React.createElement(Frame, {hidden: view !== 'dashboard', style: {}}, items.map((id) => React.createElement(Tile, {key: id, id}))),
        view !== 'dashboard' && React.createElement('button', {id: 'cover'}, view),
        React.createElement('output', {id: 'motion'}, JSON.stringify({reduced: motion.reduced, ready: motion.ready, foreground: motion.foreground})));
    }
    const root = load('react-dom/client').createRoot(document.getElementById('root'));
    window.mountExperience = () => root.render(React.createElement(MotionProvider, null,
      React.createElement(ScreenFocusProvider, null, React.createElement(Dashboard))));
    window.unmountExperience = () => root.render(null);
    window.mountExperience();
  }, {modules, platform, saved});
  await page.waitForFunction(() => window.experience?.motion.ready);
  return {page, errors};
}

for (const platform of ['web', 'android']) test(`focus returns after details, ambient mode and app resume (${platform})`, async (t) => {
  const {page, errors} = await fixture(t, platform);
  const tasks = page.getByRole('button', {name: 'tasks', exact: true});
  await tasks.focus();
  await tasks.evaluate((node) => {window.originalTasks = node;});
  await page.evaluate(() => window.experience.setView('details'));
  await page.locator('#cover').focus();
  await page.evaluate(() => window.experience.setView('dashboard'));
  await tasks.waitFor();
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'tasks');
  await page.evaluate(() => window.experience.setView('ambient'));
  await page.locator('#cover').focus();
  assert.equal(await page.locator('[aria-label="tasks"]').evaluate((node) => node.closest('[aria-hidden="true"]').inert), true);
  await page.evaluate(() => {window.experience.setItems(['media', 'tasks', 'weather']); window.experience.setView('dashboard');});
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'tasks');
  assert.equal(await tasks.evaluate((node) => node === window.originalTasks), true, 'ambient mode preserves the measured dashboard controls');
  await page.evaluate(() => {window.appState('background'); document.activeElement.blur();});
  await page.evaluate(() => window.appState('active'));
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'tasks');
  await page.evaluate(() => window.experience.setItems(['media', 'weather']));
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'media');
  assert.deepEqual(errors, []);
});
test('motion preference persists and removes zoom/CSS animation from shared controls', async (t) => {
  const {page, errors} = await fixture(t);
  await page.evaluate(() => window.experience.motion.setPreference('reduced'));
  await page.waitForFunction(() => window.experience.motion.reduced && window.motionStorage === 'reduced');
  assert.equal(await page.getByRole('button', {name: 'tasks', exact: true}).evaluate((node) => node.style.transform), 'scale(1)');
  assert.equal(await page.getByRole('button', {name: 'tasks', exact: true}).evaluate((node) => node.style.transition), 'none');
  await page.evaluate(() => window.unmountExperience());
  await page.waitForFunction(() => !document.querySelector('output'));
  await page.evaluate(() => window.mountExperience());
  await page.waitForFunction(() => window.experience.motion.ready && window.experience.motion.preference === 'reduced');
  assert.deepEqual(errors, []);
});
test('device setting follows live browser reduced-motion changes', async (t) => {
  const {page} = await fixture(t);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.waitForFunction(() => window.experience.motion.reduced);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.waitForFunction(() => !window.experience.motion.reduced);
});
test('native motion changes and background transitions are observed', async (t) => {
  const {page} = await fixture(t, 'android');
  await page.evaluate(() => window.systemMotion(true));
  await page.waitForFunction(() => window.experience.motion.reduced);
  await page.evaluate(() => window.appState('background'));
  await page.waitForFunction(() => !window.experience.motion.foreground);
  await page.evaluate(() => {window.systemMotion(false); window.appState('active');});
  await page.waitForFunction(() => window.experience.motion.foreground && !window.experience.motion.reduced);
});
