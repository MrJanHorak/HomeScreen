const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
let browser;
before(async () => {browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
async function open(t, topic, width, reading = false, busy = false) {
  const page = await browser.newPage({viewport: {width, height: width === 960 ? 540 : 1080}});
  t.after(() => page.close()); const errors = [];
  page.setDefaultTimeout(5000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const voices = ['ar', 'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'].flatMap((language) => Array.from({length: 8}, (_, i) => ({voiceURI: `${language}-${i}`, name: `${language.toLowerCase()}-x-test-${i}-local`, lang: language})));
    Object.defineProperty(window, 'speechSynthesis', {value: {getVoices: () => voices, addEventListener() {}, removeEventListener() {}, speak() {}, cancel() {}}});
    window.SpeechSynthesisUtterance = class {constructor(text) {this.text = text;}};
  });
  await page.goto(`http://127.0.0.1:5177/details.html?topic=${topic}${reading ? '&reading' : ''}${busy ? '&busy' : ''}`);
  await page.getByTestId('detail-content').waitFor();
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(100);
  return {page, errors};
}

test('long lists retain every item and task completion remains reachable by keyboard', async (t) => {
  const {page, errors} = await open(t, 'todo', 960, true, true);
  const tasks = page.getByRole('checkbox');
  assert.equal(await tasks.count(), 30);
  await tasks.last().focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.lastCompletedTask === '29');
  assert.deepEqual(errors, []);
});
for (const width of [960, 1920]) for (const reading of [false, true]) {
  test(`settings sidebar and paged language/voice choices fit ${width}, ${reading ? 'OpenDyslexic' : 'system'}`, async (t) => {
    const {page, errors} = await open(t, 'settings', width, reading);
    const menu = page.getByRole('tablist', {name: 'Settings sections'});
    const menuBox = await menu.boundingBox();
    const contentBox = await page.getByTestId('detail-content').boundingBox();
    assert.ok(menuBox.width < contentBox.width / 3);
    await page.getByRole('tab', {name: 'Accessibility settings', exact: true}).click();
    const choose = page.getByRole('button', {name: 'Choose a voice', exact: true});
    const box = await choose.boundingBox(); assert.ok(box.y + box.height <= contentBox.y + contentBox.height, 'Voice settings visible without scrolling');
    await choose.click();
    await page.getByRole('button', {name: 'English, 16 voices', exact: true}).click();
    assert.equal(await page.getByTestId('voice-picker').getByRole('button', {name: /^Voice \d/}).count(), 6);
    assert.equal(await page.getByTestId('voice-picker').getByRole('button', {name: /^Spanish/}).count(), 0);
    await page.getByRole('button', {name: 'Next voice page', exact: true}).click();
    const voice = page.getByTestId('voice-picker').getByRole('button', {name: /^Voice \d/}).first();
    await voice.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('@tv_narration_v1')).voice !== null);
    const picker = await page.getByTestId('voice-picker').boundingBox();
    assert.ok(picker.y + picker.height <= contentBox.y + contentBox.height, 'Six choices and paging fit inside the modal');
    await page.screenshot({path: `../artifacts/tv-settings-voices-${width}-${reading ? 'dyslexic' : 'system'}.png`});
    await page.getByRole('button', {name: 'Back from Settings', exact: true}).click();
    await page.getByText('Choose a language', {exact: true}).waitFor();
    await page.getByRole('button', {name: 'English, 16 voices', exact: true}).click();
    await page.keyboard.press('Escape'); await page.getByText('Choose a language', {exact: true}).waitFor();
    await page.keyboard.press('Escape'); await page.getByText('Spoken navigation', {exact: true}).waitFor();
    await page.screenshot({path: `../artifacts/tv-settings-sidebar-${width}-${reading ? 'dyslexic' : 'system'}.png`});
    assert.deepEqual(errors, []);
  });
  for (const topic of ['weather', 'activity', 'meal', 'schedule', 'todo', 'media', 'poll']) {
    test(`${topic} uses a compact header and stays within ${width}, ${reading ? 'OpenDyslexic' : 'system'}`, async (t) => {
      const {page, errors} = await open(t, topic, width, reading);
      const header = await page.getByTestId('detail-header').boundingBox();
      const content = await page.getByTestId('detail-content').boundingBox();
      assert.ok(header.height < 80, 'Header should leave room for detail content');
      assert.ok(content.height > (width === 960 ? 400 : 880));
      const horizontalOverflow = await page.getByTestId('detail-content').evaluate((root) => [...root.querySelectorAll('div')].filter((node) => {
        const style = getComputedStyle(node);
        return style.overflowX !== 'scroll' && style.overflowX !== 'auto' && node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 3 && style.overflow !== 'hidden';
      }).map((node) => node.textContent.slice(0, 100)));
      assert.deepEqual(horizontalOverflow, [], 'Text and panels must not spill horizontally');
      if (width === 960 && topic === 'weather') {
        const lastDay = await page.getByTestId('weather-detail-day').last().boundingBox();
        assert.ok(lastDay.y + lastDay.height <= content.y + content.height, 'All five forecast days fit on the first screen');
        const pressure = await page.getByText('1012 hPa', {exact: true}).boundingBox();
        assert.ok(pressure.y + pressure.height <= content.y + content.height, 'Weather metrics fit alongside the forecast');
        const hero = await page.getByTestId('weather-overview-hero').boundingBox();
        const temperature = await page.getByTestId('weather-overview-temperature').boundingBox();
        const metrics = await page.getByTestId('weather-overview-metrics').boundingBox();
        assert.ok(hero.height >= temperature.height && hero.height > 0, 'Current weather occupies its full height');
        assert.ok(hero.y + hero.height <= metrics.y, 'Current weather must not overlap its metrics');
      }
      if (width === 960 && topic === 'activity') {
        const calories = await page.getByText('1720 kcal', {exact: true}).boundingBox();
        assert.ok(calories.y + calories.height <= content.y + content.height, 'All activity metrics fit on the first screen');
      }
      await page.screenshot({path: `../artifacts/tv-detail-${topic}-${width}-${reading ? 'dyslexic' : 'system'}.png`});
      await page.keyboard.press('Escape'); assert.equal(await page.getByTestId('detail-content').count(), 0);
      assert.deepEqual(errors, []);
    });
  }
}
