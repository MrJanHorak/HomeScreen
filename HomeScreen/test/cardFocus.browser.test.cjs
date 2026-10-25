const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {chromium} = require('playwright');

const modules = Object.fromEntries([
  ['react', 'react/cjs/react.production.js'], ['react/jsx-runtime', 'react/cjs/react-jsx-runtime.production.js'],
  ['react-dom', 'react-dom/cjs/react-dom.production.js'], ['react-dom/client', 'react-dom/cjs/react-dom-client.production.js'],
  ['scheduler', 'scheduler/cjs/scheduler.production.js'],
].map(([name, file]) => [name, fs.readFileSync(path.join(path.dirname(require.resolve(file.split('/')[0])), ...file.split('/').slice(1)), 'utf8')]));
for (const [name, file] of Object.entries({TVCard: 'src/components/shared/TVCard.tsx',
  theme: 'src/theme/tvTheme.ts', reading: '../server/functions/src/utils/reading.ts', cardStyle: '../server/functions/src/utils/cardStyle.ts',
  dashboardLayout: '../server/functions/src/utils/dashboardLayout.ts'})) {
  modules[name] = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX},
  }).outputText;
}

test('focus decoration does not rerender custom card contents; appearance changes still update their ink', async t => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<div id="root"></div>');
  await page.evaluate(modules => {
    const loaded = {};
    const aliases = {'../../../server/functions/src/utils/reading': 'reading',
      '../../../../server/functions/src/utils/reading': 'reading', './reading': 'reading',
      '../../../../server/functions/src/utils/cardStyle': 'cardStyle', './dashboardLayout': 'dashboardLayout'};
    function load(name) {
      name = aliases[name] || name;
      if (loaded[name]) return loaded[name].exports;
      if (!modules[name]) throw Error(`Unexpected import: ${name}`);
      const module = loaded[name] = {exports: {}};
      new Function('module', 'exports', 'require', modules[name])(module, module.exports, load);
      return module.exports;
    }
    const React = load('react');
    const {themeForPalette} = load('theme');
    const Theme = React.createContext(null), Appearance = React.createContext(null);
    const flatten = value => Array.isArray(value) ? Object.assign({}, ...value.map(flatten)) : value || {};
    const Pressable = React.forwardRef(function Pressable({children, accessibilityLabel, onFocus, onBlur, style}, ref) {
      const applied = flatten(style);
      return React.createElement('button', {ref, 'aria-label': accessibilityLabel, onFocus, onBlur,
        style: {borderStyle: 'solid', borderColor: applied.borderColor, backgroundColor: applied.backgroundColor,
          borderWidth: applied.borderWidth, transform: `scale(${applied.transform?.[0]?.scale || 1})`}}, children);
    });
    loaded['react-native'] = {exports: {Platform: {OS: 'android', Version: 30, select: value => value.android}, StyleSheet: {create: value => value}}};
    loaded['./NarratedPressable'] = {exports: Pressable};
    loaded['./ReadingText'] = {exports: ({children}) => React.createElement('span', null, children)};
    loaded['../../theme/ThemeContext'] = {exports: {useTheme: () => React.useContext(Theme),
      useAppearance: () => ({appearance: React.useContext(Appearance)}),
      CardThemeProvider: ({theme, children}) => React.createElement(Theme.Provider, {value: theme}, children)}};
    loaded['../../hooks/useCompactTVLayout'] = {exports: () => false};
    loaded['../../accessibility/MotionContext'] = {exports: {useMotion: () => ({reduced: false})}};
    loaded['../../navigation/ScreenFocus'] = {exports: {useRememberedFocus: () => ({ref: null, onFocus() {}})}};
    const {default: TVCard} = load('TVCard');
    const counts = {renders: 0};
    function Contents() {
      const theme = React.useContext(Theme); counts.renders++;
      return React.createElement('span', {'data-testid': 'card-ink', 'data-color': theme.colors.textPrimary}, 'Card content');
    }
    function Scene() {
      const [surface, setSurface] = React.useState({backgroundColor: '#FFFFFF', opacity: 1});
      const [reading, setReading] = React.useState(load('reading').DEFAULT_READING);
      const theme = React.useMemo(() => themeForPalette('night', '#38BDF8', '#0F172A', 'solid', reading), [reading]);
      const appearance = React.useMemo(() => ({cardStyles: {weather: surface}}), [surface]);
      Object.assign(window, {focusCard: {counts, changeSurface: color => setSurface({...surface, backgroundColor: color}),
        useContrast: () => setReading({...reading, colors: 'contrast'})}});
      return React.createElement(Theme.Provider, {value: theme}, React.createElement(Appearance.Provider, {value: appearance},
        React.createElement(TVCard, {cardId: 'weather', accessibilityLabel: 'Custom focus card', style: {}}, React.createElement(Contents)),
        React.createElement('button', {id: 'outside'}, 'Outside')));
    }
    load('react-dom/client').createRoot(document.getElementById('root')).render(React.createElement(Scene));
  }, modules);
  const card = page.getByRole('button', {name: 'Custom focus card'});
  await card.waitFor();
  const initial = await page.evaluate(() => ({renders: window.focusCard.counts.renders,
    border: getComputedStyle(document.querySelector('[aria-label="Custom focus card"]')).borderColor}));
  assert.equal(await page.getByTestId('card-ink').getAttribute('data-color'), '#111827');
  await card.focus();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[aria-label="Custom focus card"]')).borderColor === 'rgb(56, 189, 248)');
  assert.equal(await page.evaluate(() => window.focusCard.counts.renders), initial.renders, 'focus must not invalidate content theme');
  await page.getByRole('button', {name: 'Outside'}).focus();
  await page.waitForFunction(border => getComputedStyle(document.querySelector('[aria-label="Custom focus card"]')).borderColor === border, initial.border);
  assert.equal(await page.evaluate(() => window.focusCard.counts.renders), initial.renders, 'blur must not invalidate content theme');
  await page.evaluate(() => window.focusCard.changeSurface('#112244'));
  await page.waitForFunction(() => document.querySelector('[data-testid="card-ink"]').dataset.color === '#F8FAFC');
  await page.evaluate(() => window.focusCard.useContrast());
  await page.waitForFunction(() => document.querySelector('[data-testid="card-ink"]').dataset.color === '#FFFFFF');
  assert.deepEqual(errors, []);
});
