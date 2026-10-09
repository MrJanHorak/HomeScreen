const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const url = 'http://127.0.0.1:5176/narration.html';
let browser;
before(async () => {browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
async function open(t, width = 960, options = {}) {
  const page = await browser.newPage({viewport: {width, height: width === 960 ? 540 : 1080}});
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((options) => {
    window.speechCalls = []; window.speechStops = 0;
    const voices = [{voiceURI: 'test-en', name: 'English voice', lang: 'en-US', default: true},
      {voiceURI: 'test-es', name: 'Spanish voice', lang: 'es-ES'}];
    Object.defineProperty(window, 'speechSynthesis', {value: {
      getVoices: () => voices, addEventListener: () => {}, removeEventListener: () => {},
      speak: (message) => window.speechCalls.push({text: message.text, rate: message.rate, voice: message.voice?.voiceURI}),
      cancel: () => {window.speechStops++;},
    }});
    window.SpeechSynthesisUtterance = class {constructor(text) {this.text = text;}};
    if (options.unsupported) Object.defineProperty(window, 'speechSynthesis', {value: undefined});
    if (options.saved) localStorage.setItem('@tv_narration_v1', options.saved);
  }, options);
  await page.goto(url);
  await page.getByRole('button', {name: 'Read selections aloud, on', exact: true}).waitFor();
  await page.waitForFunction(() => !document.querySelector('[aria-label="Read selections aloud, on"]').hasAttribute('aria-disabled'));
  return {page, errors};
}
const calls = (page) => page.evaluate(() => window.speechCalls);
const clear = (page) => page.evaluate(() => {window.speechCalls.length = 0;});

for (const width of [960, 1920]) test(`keyboard navigation, preview, speed, voices and device persistence work at ${width}`, async (t) => {
  const {page, errors} = await open(t, width);
  await page.getByRole('button', {name: 'Weather. Open details', exact: true}).focus();
  await page.waitForTimeout(240); assert.equal((await calls(page)).length, 0);
  const on = page.getByRole('button', {name: 'Read selections aloud, on', exact: true});
  await on.focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.speechCalls.some((item) => item.text.includes('Read selections aloud, on. Selected')));
  await clear(page);
  await page.getByRole('button', {name: 'Weather. Open details', exact: true}).focus();
  await page.getByRole('button', {name: 'Tasks. Open details', exact: true}).focus();
  await page.waitForFunction(() => window.speechCalls.some((item) => item.text === 'Tasks. Open details'));
  assert.deepEqual((await calls(page)).map((item) => item.text), ['Tasks. Open details']);
  await page.getByRole('button', {name: 'Slower speaking speed', exact: true}).click();
  await page.getByRole('button', {name: 'Choose a voice', exact: false}).click();
  await page.getByRole('button', {name: 'Spanish voice. es-ES', exact: true}).click();
  await clear(page);
  await page.getByRole('button', {name: 'Preview voice', exact: true}).click();
  await page.waitForFunction(() => window.speechCalls.some((item) => item.text.startsWith('This is your dashboard voice')));
  assert.equal((await calls(page)).at(-1).rate, 0.75); assert.equal((await calls(page)).at(-1).voice, 'test-es');
  const stops = await page.evaluate(() => window.speechStops);
  await page.getByRole('button', {name: 'Stop speaking', exact: true}).click();
  assert.ok(await page.evaluate(() => window.speechStops) > stops);
  await page.screenshot({path: `../artifacts/narration-settings-${width}.png`});
  await page.reload(); await page.getByRole('button', {name: 'Read selections aloud, on', exact: true}).waitFor();
  await page.waitForFunction(() => JSON.parse(document.querySelector('[data-narration]').textContent).voice === 'test-es');
  const saved = await page.locator('[data-narration]').textContent().then(JSON.parse);
  assert.deepEqual(saved, {enabled: true, rate: 0.75, voice: 'test-es'});
  await page.getByRole('button', {name: 'Read selections aloud, off', exact: true}).click();
  await clear(page);
  await page.getByRole('button', {name: 'Preview voice', exact: true}).click();
  await page.waitForFunction(() => window.speechCalls.some((item) => item.text.startsWith('This is your dashboard voice')));
  assert.deepEqual(errors, []);
});

test('TalkBack and background lifecycle pause speech; input labels never speak typed values', async (t) => {
  const {page, errors} = await open(t);
  await page.getByRole('button', {name: 'Read selections aloud, on', exact: true}).click();
  await page.evaluate(() => window.setTestScreenReader(false));
  await page.getByRole('textbox', {name: 'Location label, optional'}).focus();
  await page.waitForFunction(() => window.speechCalls.some((item) => item.text === 'Location label, optional. Edit text'));
  assert.ok((await calls(page)).every((item) => !item.text.includes('Private household detail')));
  await page.evaluate(() => window.setTestScreenReader(true));
  await page.getByText('Your screen reader is active.', {exact: false}).waitFor();
  await clear(page);
  await page.getByRole('button', {name: 'Weather. Open details', exact: true}).focus();
  await page.waitForTimeout(240); assert.equal((await calls(page)).length, 0);
  await page.evaluate(() => window.setTestScreenReader(false));
  await page.getByRole('button', {name: 'Tasks. Open details', exact: true}).focus();
  await page.evaluate(() => window.setTestAppState('background'));
  await page.waitForTimeout(240); assert.equal((await calls(page)).length, 0);
  await page.evaluate(() => window.setTestAppState('active'));
  await page.getByRole('button', {name: 'Stay in app', exact: true}).focus();
  await page.waitForFunction(() => window.speechCalls.some((item) => item.text === 'Stay in app'));
  assert.deepEqual(errors, []);
});

test('an unavailable saved voice falls back to the device default without changing the saved preference', async (t) => {
  const {page, errors} = await open(t, 960, {saved: JSON.stringify({enabled: true, rate: 1, voice: 'removed-voice'})});
  await page.getByRole('button', {name: 'Preview voice', exact: true}).click();
  await page.waitForFunction(() => window.speechCalls.some((item) => item.text.startsWith('This is your dashboard voice')));
  assert.equal((await calls(page)).at(-1).voice, undefined);
  assert.equal(JSON.parse(await page.locator('[data-narration]').textContent()).voice, 'removed-voice');
  assert.deepEqual(errors, []);
});

test('unsupported speech and corrupt saved preferences leave navigation usable', async (t) => {
  const {page, errors} = await open(t, 960, {unsupported: true, saved: '{broken'});
  assert.deepEqual(JSON.parse(await page.locator('[data-narration]').textContent()), {enabled: false, rate: 1, voice: null});
  await page.getByRole('button', {name: 'Read selections aloud, on', exact: true}).click();
  await page.getByRole('button', {name: 'Weather. Open details', exact: true}).focus();
  await page.getByText('Speech could not play.', {exact: false}).waitFor();
  await page.getByRole('button', {name: 'Read selections aloud, off', exact: true}).click();
  assert.equal(JSON.parse(await page.locator('[data-narration]').textContent()).enabled, false);
  assert.deepEqual(errors, []);
});
