const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {chromium} = require('playwright');

// Use the installed React renderer in a browser without starting the fixture server.
const reactRoot = path.dirname(require.resolve('react'));
const domRoot = path.dirname(require.resolve('react-dom'));
const schedulerRoot = path.dirname(require.resolve('scheduler'));
const modules = {
  react: fs.readFileSync(path.join(reactRoot, 'cjs/react.production.js'), 'utf8'),
  'react/jsx-runtime': fs.readFileSync(path.join(reactRoot, 'cjs/react-jsx-runtime.production.js'), 'utf8'),
  'react-dom': fs.readFileSync(path.join(domRoot, 'cjs/react-dom.production.js'), 'utf8'),
  'react-dom/client': fs.readFileSync(path.join(domRoot, 'cjs/react-dom-client.production.js'), 'utf8'),
  scheduler: fs.readFileSync(path.join(schedulerRoot, 'cjs/scheduler.production.js'), 'utf8'),
};
const wrapperCode = ts.transpileModule(fs.readFileSync('src/components/layout/TVScreenWrapper.tsx', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX},
}).outputText;

for (const platform of ['web', 'android']) test(`background synchronization preserves dashboard state and focus on ${platform}`, async (t) => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 960, height: 540}});
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent('<body style="margin:0"><div id="root" style="display:flex;height:540px"></div></body>');
  await page.evaluate(({modules, wrapperCode, platform}) => {
    const loaded = {};
    const load = (name) => {
      if (loaded[name]) return loaded[name].exports;
      const module = loaded[name] = {exports: {}};
      if (!modules[name]) throw new Error(`Unexpected import: ${name}`);
      new Function('module', 'exports', 'require', modules[name])(module, module.exports, load);
      return module.exports;
    };
    const React = load('react');
    const theme = {colors: {background: '#112233', backgroundOverlay: 'rgba(0,0,0,.3)'},
      spacing: {safeHorizontal: 30, safeVertical: 16}};
    function View({children, style, onLayout, pointerEvents}) {
      const ref = React.useRef(null);
      React.useLayoutEffect(() => {
        const {width, height} = ref.current.getBoundingClientRect();
        onLayout?.({nativeEvent: {layout: {width, height}}});
      }, [onLayout]);
      return React.createElement('div', {ref, style: {display: 'flex', flexDirection: 'column',
        ...Object.assign({}, ...(Array.isArray(style) ? style : [style])), pointerEvents}}, children);
    }
    const native = {View, Image: () => React.createElement('img', {alt: 'Background'}),
      StyleSheet: {create: (value) => value, absoluteFill: {position: 'absolute', inset: 0}},
      Platform: {OS: platform, select: (value) => value[platform]}};
    const imports = {...loaded, react: {exports: React}, 'react/jsx-runtime': {exports: load('react/jsx-runtime')},
      'react-native': {exports: native},
      '../../theme/tvTheme': {exports: {TVTheme: theme}},
      '../../theme/ThemeContext': {exports: {useTheme: () => theme}},
      '../../hooks/useCompactTVLayout': {exports: () => true},
      '../../../../server/functions/src/utils/photoFraming': {exports: {DEFAULT_PHOTO_ZOOM: 1, normalizePhotoZoom: (value) => value}}};
    const module = {exports: {}};
    new Function('module', 'exports', 'require', wrapperCode)(module, module.exports, (name) => {
      if (!imports[name]) throw new Error(`Unexpected wrapper import: ${name}`);
      return imports[name].exports;
    });
    let mounts = 0, unmounts = 0;
    function Dashboard() {
      React.useEffect(() => {mounts++; return () => {unmounts++;};}, []);
      return React.createElement('input', {id: 'dashboard-control', defaultValue: 'Saved dashboard'});
    }
    const root = load('react-dom/client').createRoot(document.getElementById('root'));
    window.renderBackground = (backgroundImage) => root.render(React.createElement(module.exports.default,
      {backgroundImage}, React.createElement(Dashboard)));
    window.dashboardCounts = () => ({mounts, unmounts});
    window.renderBackground(undefined);
  }, {modules, wrapperCode, platform});
  const control = page.locator('#dashboard-control');
  await control.fill('Keep my state'); await control.focus();
  await page.evaluate(() => {window.originalControl = document.getElementById('dashboard-control');});
  for (const background of [{uri: 'saved-photo'}, {uri: 'another-photo'}, null]) {
    await page.evaluate((value) => window.renderBackground(value || undefined), background);
    await page.waitForFunction((visible) => !!document.querySelector('img') === visible, !!background);
    assert.deepEqual(await page.evaluate(() => window.dashboardCounts()), {mounts: 1, unmounts: 0});
    assert.equal(await control.inputValue(), 'Keep my state');
    assert.equal(await page.evaluate(() => document.activeElement === window.originalControl &&
      document.getElementById('dashboard-control') === window.originalControl), true);
  }
  assert.deepEqual(errors, []);
});
