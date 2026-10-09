const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
let browser;
before(async () => {browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
for (const width of [960, 1920]) {
  test(`reading preset loads offline fonts, supports keyboard, and preserves layouts at ${width}`, async (t) => {
    const page = await browser.newPage({viewport: {width, height: 1080}}); t.after(() => page.close());
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:5175/settings.html');
    await page.getByRole('button', {name: 'Free layout', exact: true}).waitFor();
    const state = () => page.locator('[data-appearance]').textContent().then(JSON.parse);
    const initial = await state();
    await page.getByRole('button', {name: 'Fonts & reading tab'}).click();
    const preset = page.getByRole('button', {name: 'Apply dyslexia-friendly reading preset'});
    await preset.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.settingsFixture.writes.at(-1)?.reading?.font === 'opendyslexic');
    await page.waitForFunction(() => document.fonts.check('24px OpenDyslexic') && document.fonts.check('24px OpenDyslexicBold'));
    assert.deepEqual((await state()).widgetLayout, initial.widgetLayout);
    assert.equal((await state()).reading.colors, 'warm');
    assert.match(await preset.textContent(), /✓.*Dyslexia-friendly/);
    const sample = page.getByText('Weather, plans and tasks', {exact: true});
    assert.match(await sample.evaluate((node) => getComputedStyle(node).fontFamily), /OpenDyslexic/);
    assert.equal(await sample.evaluate((node) => getComputedStyle(node).fontSize), '28px');
    const focusedBox = await preset.boundingBox();
    assert.ok(focusedBox.height >= 64);
    assert.ok(focusedBox.x >= 0 && focusedBox.x + focusedBox.width <= width, 'Focus must not clip the reading preset');
    await page.screenshot({path: `../artifacts/reading-settings-${width}.png`});
    await page.getByRole('button', {name: 'System font', exact: true}).focus(); await page.keyboard.press('Enter');
    assert.equal((await state()).reading.font, 'system');
    assert.equal((await state()).reading.colors, 'warm');
    await page.getByRole('button', {name: 'Reset reading settings', exact: true}).click();
    assert.equal((await state()).reading.colors, 'theme');
    assert.deepEqual(errors, []);
  });
  test(`OpenDyslexic keeps all widget footprints inside their bounds at ${width}`, async (t) => {
    const page = await browser.newPage({viewport: {width, height: 1080}}); t.after(() => page.close());
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:5174/?reading&polls&mode=${width === 960 ? 'compact' : 'full'}&layout=rows`);
    await page.locator('[data-measured] [data-testid="adaptive-meal"]').waitFor();
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(800);
    const report = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="adaptive-"]')].map((card) => {
      const box = card.getBoundingClientRect();
      const outside = [...card.querySelectorAll('[data-testid="card-row"], [data-testid="card-rows"], [data-testid="card-section"], [data-testid="activity-metric"], [data-testid="activity-stats"], [data-testid="activity-weekly-chart"], [data-testid="activity-weekly-summary"], [data-testid="activity-mini-chart"], [data-testid="activity-day-bars"], [data-testid="activity-day"], [data-testid="media-art"], [data-testid="media-progress"], [data-testid="card-hero"], [data-testid^="weather-"], [data-testid^="schedule-"], [data-testid^="tasks-"], [data-testid^="poll-"]')].filter((node) => {
        const r = node.getBoundingClientRect(); return r.bottom > box.bottom + 1 || r.right > box.right + 1 || r.left < box.left - 1;
      });
      return {id: card.dataset.testid, size: card.closest('article')?.dataset.size, outside: outside.map((node) => node.dataset.testid)};
    }));
    assert.ok(report.length >= 350);
    assert.deepEqual(report.filter((card) => card.outside.length), [], 'Reading font content must fit without shrinking TV font sizes');
    const weather = page.locator('[data-dashboard-layout]').getByRole('button', {name: 'Weather. Open details', exact: true});
    await weather.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-dashboard-layout]').getAttribute('data-opened'), 'weather');
    assert.deepEqual(errors, []);
  });
}
