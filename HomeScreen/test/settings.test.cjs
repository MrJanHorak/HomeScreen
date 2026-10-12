const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const url = process.env.TV_SETTINGS_TEST_URL || 'http://127.0.0.1:5175/settings.html';
let browser;
before(async () => {browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
const state = (page) => page.locator('[data-appearance]').textContent().then(JSON.parse);
for (const viewport of [{width: 720, height: 540}, {width: 960, height: 850}, {width: 1920, height: 540}]) {
  test(`preview stays visible while card controls scroll: ${viewport.width} × ${viewport.height}`, async (t) => {
    const page = await browser.newPage({viewport}); t.after(() => page.close());
    await page.goto(url);
    await page.getByRole('button', {name: 'Adjust Weather', exact: true}).waitFor();
    const preview = page.getByTestId('live-dashboard-preview');
    const scroll = page.getByTestId('card-settings-scroll');
    const before = await preview.boundingBox();
    const reorder = page.getByRole('button', {name: 'Move later Weather', exact: true});
    await reorder.focus(); await page.keyboard.press('Enter');
    await page.getByText('Adjusting: Weather', {exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Make wider Weather', exact: true}).count(), 1);
    await page.getByRole('button', {name: 'Refresh available cards', exact: true}).focus();
    await page.waitForFunction(() => document.querySelector('[data-testid="card-settings-scroll"]').scrollTop > 0);
    const after = await preview.boundingBox();
    assert.equal(after.y, before.y);
    assert.ok(after.y >= 0 && after.y + after.height <= viewport.height);
    assert.ok((await scroll.boundingBox()).height > 120, 'settings retain usable scrolling space');
    await page.getByRole('button', {name: 'Adjust Activity · Alex', exact: true}).focus();
    await page.keyboard.press('Enter');
    await page.getByText('Adjusting: Activity · Alex', {exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Make wider Weather', exact: true}).count(), 0);
    const resize = page.getByRole('button', {name: 'Make wider Activity · Alex', exact: true});
    await resize.focus(); await page.keyboard.press('Enter');
    assert.equal((await state(page)).widgetLayout.widgets.find((widget) => widget.personId)?.size, 'wide');
    await page.getByRole('button', {name: 'Free layout. Choose where each card goes', exact: true}).click();
    await page.getByRole('button', {name: 'Move up Activity · Alex', exact: true}).waitFor();
    assert.equal(await page.getByText(/^\d+ × \d+$/).count(), 0);
    assert.equal(await page.getByRole('button', {name: 'Move up Activity · Alex', exact: true}).isDisabled(), true);
    const previous = await state(page);
    await page.getByRole('button', {name: 'Swap next Activity · Alex', exact: true}).click();
    assert.notDeepEqual((await state(page)).widgetLayout.grid.items, previous.widgetLayout.grid.items);
    await page.getByRole('button', {name: 'Hide Activity · Alex', exact: true}).click();
    await page.getByText('Adjusting: Weather', {exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Move up Activity · Alex', exact: true}).count(), 0);
    if (process.env.TV_SETTINGS_SCREENSHOTS) {
      await page.getByRole('button', {name: 'Adjust Weather', exact: true}).focus();
      await page.screenshot({path: `../artifacts/settings-sticky-${viewport.width}-${viewport.height}.png`});
    }
  });
}
for (const width of [960, 1920]) test(`TV card and saved layout controls work with keyboard and persist widget instances: ${width}`, async (t) => {
  const page = await browser.newPage({viewport: {width, height: 850}});
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  const poll = page.getByRole('button', {name: 'Hide Poll · Movie night?', exact: true});
  await poll.waitFor();
  if (process.env.TV_SETTINGS_SCREENSHOTS) await page.screenshot({path: `../artifacts/settings-cards-${width}.png`});
  await poll.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', {name: 'Show Poll · Movie night?', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Show Poll · Movie night?', exact: true}).click();
  await page.getByRole('button', {name: 'Add Activity · Sam', exact: true}).click();
  await page.getByRole('button', {name: 'Hide Activity · Sam', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Add Poll · Dinner?', exact: true}).click();
  await page.getByRole('button', {name: 'Hide Poll · Dinner?', exact: true}).waitFor();
  assert.equal((await state(page)).widgetLayout.widgets.filter((widget) => widget.visible).length, 5);
  await page.getByRole('button', {name: 'Layout tab', exact: true}).click();
  if (process.env.TV_SETTINGS_SCREENSHOTS) {
    await page.getByRole('button', {name: 'Apply saved layout Garden', exact: true}).waitFor();
    await page.screenshot({path: `../artifacts/settings-layouts-${width}.png`});
  }
  await page.getByRole('button', {name: 'Apply saved layout Garden', exact: true}).click();
  assert.equal((await state(page)).palette, 'forest');
  assert.equal((await state(page)).widgetLayout.grid.items.length, 3);
  await page.getByRole('button', {name: 'Cards tab', exact: true}).click();
  await page.getByRole('button', {name: 'Swap next Weather', exact: true}).click();
  const moved = await state(page);
  assert.equal(moved.widgetLayout.grid.items.find((item) => item.id === 'weather').x, 6);
  await page.getByRole('button', {name: 'Hide Activity · Alex', exact: true}).click();
  await page.getByRole('button', {name: 'Show Activity · Alex', exact: true}).click();
  assert.equal((await state(page)).widgetLayout.grid.items.length, 3);
  await page.getByRole('button', {name: 'Layout tab', exact: true}).click();
  await page.getByRole('button', {name: 'Balanced. All six cards, with the schedule prominent.', exact: true}).click();
  const preset = await state(page);
  assert.equal(preset.widgetLayout.widgets.find((widget) => widget.kind === 'poll').visible, false);
  assert.equal(preset.widgetLayout.grid, null);
  await page.getByRole('button', {name: 'Apply saved layout Classic', exact: true}).click();
  assert.equal((await state(page)).widgetLayout, null);
  await page.waitForFunction(() => window.settingsFixture.writes.at(-1)?.widgetLayout === null);
  assert.deepEqual(errors, []);
});

test('saved layout failures show a retry and retain the current dashboard', async (t) => {
  const page = await browser.newPage(); t.after(() => page.close());
  await page.goto(url);
  await page.getByRole('button', {name: 'Free layout. Choose where each card goes', exact: true}).waitFor();
  const previous = await state(page);
  await page.evaluate(() => {window.settingsFixture.failLayouts = true;});
  await page.getByRole('button', {name: 'Layout tab', exact: true}).click();
  await page.getByText('Could not load saved layouts', {exact: true}).waitFor();
  assert.deepEqual(await state(page), previous);
  await page.evaluate(() => {window.settingsFixture.failLayouts = false;});
  await page.getByRole('button', {name: 'Refresh saved layouts', exact: true}).click();
  await page.getByRole('button', {name: 'Apply saved layout Garden', exact: true}).waitFor();
});
