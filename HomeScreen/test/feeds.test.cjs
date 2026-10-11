const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
let browser;
before(async () => {browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => browser?.close());
const base = process.env.TV_TEST_URL || 'http://127.0.0.1:5174';
for (const mode of ['compact', 'full']) test(`feed cards fit all 50 sizes with readable headlines: ${mode}`, async (t) => {
  const page = await browser.newPage({viewport: {width: 1920, height: 1080}}); t.after(() => page.close());
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/feeds.html?matrix=1&reading=1&mode=${mode}`);
  await page.locator('[data-testid="adaptive-feed"]').first().waitFor(); await page.evaluate(() => document.fonts.ready);
  const report = await page.locator('[data-testid="adaptive-feed"]').evaluateAll((cards) => cards.map((card) => {
    const rect = card.getBoundingClientRect(); const rows = [...card.querySelectorAll('[data-testid="feed-headline"]')];
    return {size: card.closest('article').dataset.size, rows: rows.length, outside: rows.filter((row) => row.getBoundingClientRect().bottom > rect.bottom + 1).length,
      overlap: rows.length && rows[rows.length - 1].getBoundingClientRect().bottom > card.lastElementChild.getBoundingClientRect().top + 1,
      font: rows.length ? parseFloat(getComputedStyle(rows[0].firstElementChild).fontSize) : 0};
  }));
  assert.equal(report.length, 50); assert.deepEqual(report.filter((r) => r.outside || r.overlap), []);
  assert.ok(report.every((r) => r.rows > 0 && r.rows <= 5)); assert.ok(report.every((r) => r.font >= (mode === 'compact' ? 15 : 21)));
  assert.deepEqual(errors, []);
});
test('TV opens stories, displays QR, returns with Back, switches source and changes headline count', async (t) => {
  const page = await browser.newPage({viewport: {width: 960, height: 540}}); t.after(() => page.close());
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/feeds.html`);
  const card = page.getByRole('button', {name: 'BBC World. Open stories and sources', exact: true}); await card.waitFor();
  await card.click();
  const story = page.getByRole('button', {name: /BBC World: Researchers unveil/}); await story.waitFor(); await story.focus(); await page.keyboard.press('Enter');
  await page.getByText('Read full story on your phone', {exact: true}).waitFor(); assert.equal(await page.locator('[data-testid="poll-qr"] svg').count(), 1);
  if (process.env.FEED_SCREENSHOT_DIR) {
    await page.evaluate(async () => Promise.all(document.getAnimations().filter((animation) => Number.isFinite(animation.effect?.getTiming().iterations)).map((animation) => animation.finished.catch(() => undefined))));
    await page.screenshot({path: `${process.env.FEED_SCREENSHOT_DIR}/feed-tv-story.png`});
  }
  await page.keyboard.press('Escape'); await page.getByRole('button', {name: 'Choose feed source', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Choose feed source', exact: true}).click(); await page.getByRole('button', {name: 'NASA News', exact: true}).click();
  await page.getByRole('button', {name: /NASA News: Researchers unveil/}).waitFor();
  await page.getByRole('button', {name: '3 headlines', exact: true}).click();
  assert.equal(await page.evaluate(() => window.feedFixture.layout.widgets[0].feed.itemCount), 3);
  assert.equal(await page.evaluate(() => window.feedFixture.layout.widgets[0].feed.title), 'NASA News');
  if (process.env.FEED_SCREENSHOT_DIR) await page.screenshot({path: `${process.env.FEED_SCREENSHOT_DIR}/feed-tv-stories.png`});
  await page.keyboard.press('Escape'); await page.getByRole('button', {name: 'NASA News. Open stories and sources', exact: true}).waitFor();
  await page.evaluate(() => {const url = window.feedFixture.layout.widgets[0].feed.url; window.updateFeeds({[url]: {url, title: 'NASA', articles: [], updatedAtMs: 0, stale: true, error: 'Could not read this feed.'}});});
  await page.getByText('Could not read this feed.', {exact: true}).waitFor();
  assert.deepEqual(errors, []);
});
