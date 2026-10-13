const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const url = process.env.TV_SETTINGS_TEST_URL || 'http://127.0.0.1:5175/settings.html';
let browser;
before(async () => {browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
const state = (page) => page.locator('[data-appearance]').textContent().then(JSON.parse);
for (const width of [520, 720, 960, 1920]) {
  test(`ambient thumbnail follows backdrop and color choices at ${width}`, async (t) => {
    const page = await browser.newPage({viewport: {width, height: 850}});
    t.after(() => page.close());
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}?photos`);
    await page.getByRole('button', {name: 'Ambient tab', exact: true}).click();
    const preview = page.getByTestId('ambient-backdrop-preview');
    await page.getByRole('button', {name: 'Plasma flow', exact: true}).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="ambient-backdrop-preview"] svg').length === 3);
    const colors = () => preview.locator('radialGradient stop:first-child').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('stop-color')));
    assert.deepEqual(await colors(), ['#16A085', '#38BDF8', '#A78BFA']);
    const blobSize = await preview.locator('svg').first().boundingBox();
    assert.ok(blobSize.width < 250, 'plasma scales to the thumbnail, not the window');
    for (const [name, expected] of [
      ['Ocean', ['#0477BF', '#22D3EE', '#0D9488']],
      ['Sunset', ['#E8795B', '#F59E0B', '#A855F7']],
      ['Ember', ['#D94657', '#F97316', '#EAB308']],
    ]) {
      const button = page.getByRole('button', {name, exact: true});
      await button.focus(); await page.keyboard.press('Enter');
      assert.deepEqual(await colors(), expected);
      assert.deepEqual((await state(page)).ambient.plasmaColors, expected);
    }
    await preview.scrollIntoViewIfNeeded();
    const flowHeading = await page.getByText('Flow colors', {exact: true}).boundingBox();
    const thumbnail = await preview.boundingBox();
    if (width === 520) assert.ok(flowHeading.y > thumbnail.y + thumbnail.height, 'narrow panels stack controls below the thumbnail');
    else assert.ok(flowHeading.x > thumbnail.x + thumbnail.width, 'wide panels keep the colors beside the thumbnail');
    if (process.env.TV_SETTINGS_SCREENSHOTS) await page.screenshot({path: `../artifacts/ambient-settings-preview-${width}.png`});
    await page.getByRole('button', {name: 'Choose individual colors', exact: true}).click();
    for (const [index, name, color] of [[0, 'Purple', '#A78BFA'], [1, 'Cyan', '#22D3EE'], [2, 'Green', '#34D399']]) {
      await page.getByRole('button', {name, exact: true}).nth(index).click();
      assert.equal((await colors())[index], color);
    }
    await page.getByRole('button', {name: 'Preview ambient mode', exact: true}).click();
    const full = page.getByTestId('ambient-full-preview');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="ambient-full-preview"] svg').length === 3);
    assert.deepEqual(await full.locator('radialGradient stop:first-child').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('stop-color'))), await colors());
    const ids = await page.locator('radialGradient').evaluateAll((nodes) => nodes.map((node) => node.id));
    assert.equal(new Set(ids).size, ids.length, 'thumbnail and full preview gradients have distinct IDs');
    await page.getByRole('button', {name: 'Close ambient preview', exact: true}).click();
    await page.getByRole('button', {name: 'Dark', exact: true}).click();
    assert.equal(await preview.locator('svg, img').count(), 0);
    assert.equal(await preview.getAttribute('aria-label'), 'Backdrop preview: Dark');
    await page.getByRole('button', {name: 'My photos (2)', exact: true}).click();
    assert.equal(await preview.getAttribute('aria-label'), 'Backdrop preview: My photos');
    assert.match(await preview.locator('img').getAttribute('src'), /^data:image\/svg\+xml/);
    await page.getByRole('button', {name: 'Built-in photos', exact: true}).click();
    assert.match(await preview.locator('img').getAttribute('src'), /wp8860764/);
    await page.getByRole('button', {name: 'Off', exact: true}).click();
    assert.equal(await page.getByRole('button', {name: 'Plasma flow', exact: true}).isDisabled(), true);
    await preview.scrollIntoViewIfNeeded();
    const bounds = await preview.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, 'thumbnail fits available width');
    assert.ok(Math.abs(bounds.width / bounds.height - 16 / 9) < 0.05);
    assert.deepEqual(errors, []);
  });
}
test('ambient preview handles an empty personal photo library', async (t) => {
  const page = await browser.newPage(); t.after(() => page.close());
  await page.goto(url);
  await page.getByRole('button', {name: 'Ambient tab', exact: true}).click();
  assert.equal(await page.getByRole('button', {name: 'My photos (0)', exact: true}).isDisabled(), true);
  assert.equal(await page.getByTestId('ambient-backdrop-preview').getAttribute('aria-label'), 'Backdrop preview: Built-in photos');
});
for (const viewport of [{width: 720, height: 540}, {width: 960, height: 540, sidebar: true}, {width: 960, height: 850}, {width: 1920, height: 540}]) {
  test(`preview stays visible while card controls scroll: ${viewport.width} × ${viewport.height}${viewport.sidebar ? ' with TV sidebar' : ''}`, async (t) => {
    const page = await browser.newPage({viewport: {width: viewport.width, height: viewport.height}}); t.after(() => page.close());
    await page.goto(viewport.sidebar ? `${url}?tv` : url);
    await page.getByRole('button', {name: 'Adjust Weather', exact: true}).waitFor();
    const preview = page.getByTestId('live-dashboard-preview');
    const scroll = page.getByTestId('card-settings-scroll');
    const before = await preview.boundingBox();
    const controlBounds = await scroll.boundingBox();
    assert.ok(before.x >= controlBounds.x + controlBounds.width, 'preview stays to the right of the card controls');
    assert.ok(before.height >= 260, 'TV preview retains its original full height');
    const reorder = page.getByRole('button', {name: 'Move later Weather', exact: true});
    await reorder.focus(); await page.keyboard.press('Enter');
    await page.getByText('Adjusting: Weather', {exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Make wider Weather', exact: true}).count(), 1);
    await page.getByRole('button', {name: 'Refresh available cards', exact: true}).focus();
    await page.waitForFunction(() => document.querySelector('[data-testid="card-settings-scroll"]').scrollTop > 0);
    const after = await preview.boundingBox();
    assert.equal(after.y, before.y);
    assert.equal(after.x, before.x);
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
    if (process.env.TV_SETTINGS_SCREENSHOTS || process.env.TV_CARD_SCREENSHOTS) {
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
