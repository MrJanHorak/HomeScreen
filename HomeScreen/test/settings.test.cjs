const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const url = process.env.TV_SETTINGS_TEST_URL || 'http://127.0.0.1:5175/settings.html';
let browser;
before(async () => {browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
const state = (page) => page.locator('[data-appearance]').textContent().then(JSON.parse);
async function openAdd(page, category) {
  await page.getByRole('button', {name: 'Add cards', exact: true}).click();
  const header = page.getByRole('button', {name: category, exact: true});
  if (await header.getAttribute('aria-expanded') !== 'true') await header.click();
}
async function showCard(page, name) {
  await openAdd(page, 'Hidden cards');
  await page.getByRole('button', {name: `Show ${name}`, exact: true}).click();
  await page.getByRole('button', {name: 'Arrange cards', exact: true}).click();
}
async function addCard(page, category, name) {
  await openAdd(page, category);
  await page.getByRole('button', {name, exact: true}).click();
  await page.getByRole('button', {name: 'Arrange cards', exact: true}).click();
}

for (const viewport of [{width: 960, height: 540}, {width: 1920, height: 1080}]) {
  test(`card catalog collapses with keyboard, hides inactive cards, and restores them: ${viewport.width}`, async (t) => {
    const page = await browser.newPage({viewport}); t.after(() => page.close());
    await page.goto(`${url}?tv`);
    await page.getByRole('button', {name: 'Hide Poll · Movie night?', exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Show Schedule', exact: true}).count(), 0);
    if (process.env.TV_SETTINGS_SCREENSHOTS || process.env.TV_CATALOG_SCREENSHOTS) await page.screenshot({path: `../artifacts/cards-organized-arrange-${viewport.width}.png`});
    const before = await state(page);
    await page.getByRole('button', {name: 'Hide Poll · Movie night?', exact: true}).click();
    assert.equal(await page.getByRole('button', {name: 'Adjust Poll · Movie night?', exact: true}).count(), 0);
    await page.getByRole('button', {name: 'Add cards', exact: true}).click();
    for (const category of ['Hidden cards', 'News & RSS feeds', 'Shared activity', 'Polls']) {
      assert.equal(await page.getByRole('button', {name: category, exact: true}).getAttribute('aria-expanded'), 'false');
    }
    assert.equal(await page.getByTestId('feed-topics').count(), 0);
    const lastCategory = await page.getByRole('button', {name: 'Polls', exact: true}).boundingBox();
    const scroller = await page.getByTestId('card-settings-scroll').boundingBox();
    assert.ok(lastCategory.y + lastCategory.height <= scroller.y + scroller.height, 'all four collapsed categories fit without scrolling');
    if (process.env.TV_SETTINGS_SCREENSHOTS || process.env.TV_CATALOG_SCREENSHOTS) await page.screenshot({path: `../artifacts/cards-organized-add-${viewport.width}.png`});
    const hidden = page.getByRole('button', {name: 'Hidden cards', exact: true});
    await hidden.focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', {name: 'Show Poll · Movie night?', exact: true}).waitFor();
    await page.getByRole('button', {name: 'News & RSS feeds', exact: true}).focus(); await page.keyboard.press('Enter');
    assert.equal(await hidden.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.getByRole('button', {name: 'Show Poll · Movie night?', exact: true}).count(), 0);
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('button', {name: 'News & RSS feeds', exact: true}).getAttribute('aria-expanded'), 'false');
    await showCard(page, 'Poll · Movie night?');
    const restored = (await state(page)).widgetLayout;
    assert.deepEqual(restored.widgets.filter((widget) => before.widgetLayout.widgets.some((item) => item.id === widget.id)), before.widgetLayout.widgets, 'hide/show preserves card configuration');
    assert.deepEqual(restored.grid, before.widgetLayout.grid);
  });
}

test('removing a poll card clears only its layout entry and makes the poll available again', async (t) => {
  const page = await browser.newPage(); t.after(() => page.close());
  await page.goto(url);
  await page.getByRole('button', {name: 'Remove poll card Poll · Movie night?', exact: true}).click();
  assert.equal((await state(page)).widgetLayout.widgets.some((widget) => widget.kind === 'poll'), false);
  await addCard(page, 'Polls', 'Add Poll · Movie night?');
  const poll = (await state(page)).widgetLayout.widgets.find((widget) => widget.kind === 'poll');
  assert.equal(poll.roundId, 'b'.repeat(32));
  assert.equal(poll.visible, true);
  await page.getByRole('button', {name: 'Hide Weather', exact: true}).click();
  await page.getByRole('button', {name: 'Hide Activity · Alex', exact: true}).click();
  assert.equal(await page.getByRole('button', {name: 'Remove poll card Poll · Movie night?', exact: true}).isDisabled(), true);
});

for (const viewport of [{width: 960, height: 540}, {width: 1920, height: 1080}]) {
  test(`TV poll form validates, retries a lost response, and adds the created card: ${viewport.width}`, async (t) => {
    const page = await browser.newPage({viewport}); t.after(() => page.close());
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url);
    await openAdd(page, 'Polls');
    await page.getByRole('button', {name: 'Create a poll', exact: true}).click();
    await page.getByRole('button', {name: 'Create poll', exact: true}).click();
    await page.getByText('Enter a question and fill in every choice. Use at least two different choices.', {exact: true}).waitFor();
    assert.equal(await page.evaluate(() => window.settingsFixture.pollCreates.length), 0);
    await page.getByRole('textbox', {name: 'Question', exact: true}).fill('What should we watch?');
    await page.getByRole('textbox', {name: 'Choice 1', exact: true}).fill('Comedy');
    await page.getByRole('textbox', {name: 'Choice 2', exact: true}).fill('comedy');
    await page.getByRole('button', {name: 'Create poll', exact: true}).click();
    assert.equal(await page.evaluate(() => window.settingsFixture.pollCreates.length), 0);
    await page.getByRole('textbox', {name: 'Choice 2', exact: true}).fill('Adventure');
    await page.getByRole('button', {name: 'Add choice', exact: true}).click();
    await page.getByRole('textbox', {name: 'Choice 3', exact: true}).fill('Mystery');
    await page.getByRole('button', {name: 'Remove last choice', exact: true}).click();
    assert.equal(await page.getByRole('textbox', {name: 'Choice 3', exact: true}).count(), 0);
    await page.getByRole('button', {name: '15 minutes', exact: true}).focus(); await page.keyboard.press('Enter');
    if (process.env.TV_SETTINGS_SCREENSHOTS || process.env.TV_CATALOG_SCREENSHOTS) {
      await page.getByText('Polls', {exact: true}).scrollIntoViewIfNeeded();
      await page.screenshot({path: `../artifacts/polls-create-${viewport.width}.png`});
    }
    await page.evaluate(() => {window.settingsFixture.losePollResponse = true;});
    await page.getByRole('button', {name: 'Create poll', exact: true}).click();
    await page.getByText('Connection lost. Retry to check your poll.', {exact: true}).waitFor();
    assert.equal(await page.getByRole('textbox', {name: 'Question', exact: true}).inputValue(), 'What should we watch?');
    await page.getByRole('button', {name: 'Create poll', exact: true}).click();
    await page.getByRole('button', {name: 'Add created poll card', exact: true}).waitFor();
    const calls = await page.evaluate(() => window.settingsFixture.pollCreates);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].requestId, calls[1].requestId);
    assert.equal(calls[0].definition.defaultDurationMinutes, 15);
    assert.equal(await page.getByText('What should we watch?', {exact: true}).count(), 1);
    await page.getByRole('button', {name: 'Add created poll card', exact: true}).click();
    assert.equal((await state(page)).widgetLayout.widgets.filter((widget) => widget.roundId === calls[0].requestId).length, 1);
    await page.getByRole('button', {name: 'Remove poll card What should we watch?', exact: true}).click();
    assert.equal((await state(page)).widgetLayout.widgets.some((widget) => widget.roundId === calls[0].requestId), false);
    assert.equal(await page.getByRole('button', {name: 'Add poll What should we watch?', exact: true}).count(), 1);
    assert.deepEqual(errors, []);
  });
}

test('created polls remain available when a full dashboard rejects their card', async (t) => {
  const page = await browser.newPage(); t.after(() => page.close());
  await page.goto(url);
  await openAdd(page, 'News & RSS feeds');
  for (let i = 0; i < 5; i++) await page.getByRole('button', {name: 'Add Science News feed', exact: true}).click();
  const full = await state(page);
  await page.getByRole('button', {name: 'Polls tab', exact: true}).click();
  await page.getByRole('textbox', {name: 'Question', exact: true}).fill('Later?');
  await page.getByRole('textbox', {name: 'Choice 1', exact: true}).fill('Yes');
  await page.getByRole('textbox', {name: 'Choice 2', exact: true}).fill('No');
  await page.getByRole('button', {name: 'Create poll', exact: true}).click();
  await page.getByRole('button', {name: 'Add created poll card', exact: true}).click();
  await page.getByText(/Automatic rows fit eight cards/).waitFor();
  assert.deepEqual(await state(page), full);
  assert.equal(await page.evaluate(() => window.settingsFixture.pollCreates.length), 1);
  await page.getByRole('button', {name: 'Cards tab', exact: true}).click();
  await page.getByRole('button', {name: 'Hide Weather', exact: true}).click();
  await addCard(page, 'Polls', 'Add Poll · Later?');
  assert.equal((await state(page)).widgetLayout.widgets.filter((widget) => widget.kind === 'poll').length, 2);
});
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
    await page.getByRole('button', {name: 'Adjust Weather', exact: true}).click();
    const reorder = page.getByRole('button', {name: 'Move later Weather', exact: true});
    await reorder.focus(); await page.keyboard.press('Enter');
    await page.getByText('Adjusting: Weather', {exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Make wider Weather', exact: true}).count(), 1);
    await openAdd(page, 'News & RSS feeds');
    await page.getByRole('button', {name: 'Refresh available cards', exact: true}).focus();
    await page.waitForFunction(() => document.querySelector('[data-testid="card-settings-scroll"]').scrollTop > 0);
    const after = await preview.boundingBox();
    assert.equal(after.y, before.y);
    assert.equal(after.x, before.x);
    assert.ok(after.y >= 0 && after.y + after.height <= viewport.height);
    assert.ok((await scroll.boundingBox()).height > 120, 'settings retain usable scrolling space');
    await page.getByRole('button', {name: 'Arrange cards', exact: true}).click();
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
    await page.getByText('Choose a card to adjust.', {exact: true}).waitFor();
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
  await showCard(page, 'Poll · Movie night?');
  await addCard(page, 'Shared activity', 'Add Activity · Sam');
  await page.getByRole('button', {name: 'Hide Activity · Sam', exact: true}).waitFor();
  await addCard(page, 'Polls', 'Add Poll · Dinner?');
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
  await page.getByRole('button', {name: 'Adjust Weather', exact: true}).click();
  await page.getByRole('button', {name: 'Swap next Weather', exact: true}).click();
  const moved = await state(page);
  assert.equal(moved.widgetLayout.grid.items.find((item) => item.id === 'weather').x, 6);
  await page.getByRole('button', {name: 'Hide Activity · Alex', exact: true}).click();
  await showCard(page, 'Activity · Alex');
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

test('Adjust starts closed, toggles with keyboard, and closes when its card is hidden or removed', async (t) => {
  const page = await browser.newPage({viewport: {width: 960, height: 540}}); t.after(() => page.close());
  const textErrors = [];
  page.on('console', (message) => {if (message.text().includes('Unexpected text node')) textErrors.push(message.text());});
  await page.goto(url);
  const adjust = page.getByRole('button', {name: 'Adjust Weather', exact: true});
  await adjust.waitFor();
  const initial = await state(page);
  assert.equal(await adjust.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.getByRole('button', {name: 'Move later Weather', exact: true}).count(), 0);
  await adjust.focus(); await page.keyboard.press('Enter');
  assert.equal(await adjust.getAttribute('aria-expanded'), 'true');
  await page.getByText('Adjusting: Weather', {exact: true}).waitFor();
  await page.keyboard.press('Enter');
  assert.equal(await adjust.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.getByRole('button', {name: 'Make wider Weather', exact: true}).count(), 0);
  assert.deepEqual(await state(page), initial, 'opening and closing controls never edits the saved layout');
  await adjust.click();
  await page.getByRole('button', {name: 'Adjust Activity · Alex', exact: true}).click();
  assert.equal(await adjust.getAttribute('aria-expanded'), 'false');
  await page.getByRole('button', {name: 'Hide Activity · Alex', exact: true}).click();
  await page.getByText('Choose a card to adjust.', {exact: true}).waitFor();
  await showCard(page, 'Activity · Alex');
  assert.equal(await page.getByRole('button', {name: 'Adjust Activity · Alex', exact: true}).getAttribute('aria-expanded'), 'false');
  await addCard(page, 'News & RSS feeds', 'Add Science News feed');
  await page.getByRole('button', {name: 'Adjust Feed · Science News', exact: true}).click();
  await page.getByRole('button', {name: 'Remove feed Feed · Science News', exact: true}).click();
  await page.getByText('Choose a card to adjust.', {exact: true}).waitFor();
  assert.deepEqual(textErrors, [], 'settings render no bare text nodes inside native Views');
});

test('failed feed additions keep the layout and show an error beside the chosen source', async (t) => {
  const page = await browser.newPage({viewport: {width: 960, height: 540}}); t.after(() => page.close());
  await page.goto(url);
  await openAdd(page, 'News & RSS feeds');
  const add = page.getByRole('button', {name: 'Add Science News feed', exact: true});
  await add.waitFor();
  for (let i = 0; i < 5; i++) await add.click();
  const full = await state(page);
  assert.equal(full.widgetLayout.widgets.filter((widget) => widget.visible).length, 8);
  await add.click();
  const error = page.getByTestId('feed-sources').getByRole('alert');
  await error.waitFor();
  assert.match(await error.textContent(), /Automatic rows fit eight cards/);
  assert.deepEqual(await state(page), full, 'a failed add does not create a hidden or overlapping card');
  const buttonBounds = await add.boundingBox();
  const errorBounds = await error.boundingBox();
  assert.ok(errorBounds.y >= buttonBounds.y + buttonBounds.height && errorBounds.y - buttonBounds.y - buttonBounds.height < 12);
});

for (const viewport of [{width: 720, height: 540}, {width: 960, height: 540, sidebar: true}, {width: 1920, height: 1080}]) {
  test(`feed topics and sources have a clear hierarchy and consistent widths: ${viewport.width}`, async (t) => {
    const page = await browser.newPage({viewport}); t.after(() => page.close());
    await page.goto(viewport.sidebar ? `${url}?tv` : url);
    await page.getByRole('button', {name: 'Adjust Weather', exact: true}).waitFor();
    await openAdd(page, 'News & RSS feeds');
    const sources = page.getByTestId('feed-sources');
    const topics = page.getByTestId('feed-topics');
    await topics.scrollIntoViewIfNeeded();
    const topicWidths = await topics.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().width));
    assert.ok(Math.max(...topicWidths) - Math.min(...topicWidths) < 1, 'topics have equal widths');
    await page.getByRole('button', {name: 'Space', exact: true}).focus(); await page.keyboard.press('Enter');
    await page.getByText('Space · 3 sources', {exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Add Science News feed', exact: true}).count(), 0);
    assert.equal(await sources.getByRole('button').count(), 3);
    const widths = await sources.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().width));
    assert.ok(Math.max(...widths) - Math.min(...widths) < 1, 'all source rows have equal widths');
    if (process.env.TV_SETTINGS_SCREENSHOTS) {
      await page.getByTestId('add-feed-section').evaluate((node) => node.scrollIntoView({block: 'start'}));
      await page.screenshot({path: `../artifacts/cards-cleanup-feeds-${viewport.width}.png`});
    }
    const add = page.getByRole('button', {name: 'Add NASA News feed', exact: true});
    await add.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
    const feeds = (await state(page)).widgetLayout.widgets.filter((widget) => widget.kind === 'feed');
    assert.equal(feeds.length, 2, 'each add creates an independent feed card');
    assert.notEqual(feeds[0].id, feeds[1].id);
    assert.ok(feeds.every((widget) => widget.feed.title === 'NASA News' && widget.visible));
    await page.getByText('Added Feed · NASA News. Find it in Arrange cards above.', {exact: true}).waitFor();
    await openAdd(page, 'Polls');
    assert.equal(await page.getByTestId('add-poll-section').getByRole('button', {name: 'Add Poll · Dinner?', exact: true}).count(), 1);
    await openAdd(page, 'Shared activity');
    assert.equal(await page.getByTestId('add-activity-section').getByRole('button', {name: 'Add Activity · Sam', exact: true}).count(), 1);
    if (process.env.TV_SETTINGS_SCREENSHOTS) {
      await page.getByTestId('card-settings-scroll').evaluate((node) => {node.scrollTop = node.scrollHeight;});
      await page.screenshot({path: `../artifacts/cards-cleanup-add-${viewport.width}.png`});
      if (viewport.width === 960) {
        await page.setViewportSize({width: 960, height: 850});
        await page.getByTestId('add-feed-section').evaluate((node) => node.scrollIntoView({block: 'start'}));
        await page.screenshot({path: '../artifacts/cards-cleanup-feeds-overview-960.png'});
      }
    }
  });

  test(`free-layout preview keeps symmetric outer margins and separates tiles: ${viewport.width}`, async (t) => {
    const page = await browser.newPage({viewport}); t.after(() => page.close());
    await page.goto(viewport.sidebar ? `${url}?tv` : url);
    await page.getByRole('button', {name: 'Layout tab', exact: true}).click();
    await page.getByRole('button', {name: 'Apply saved layout Garden', exact: true}).click();
    await page.getByRole('button', {name: 'Cards tab', exact: true}).click();
    const preview = page.getByTestId('live-dashboard-preview').getByTestId('layout-preview');
    await preview.getByTestId('preview-tile-weather').waitFor();
    const report = await preview.evaluate((node) => {
      const outer = node.getBoundingClientRect();
      const tiles = [...node.querySelectorAll('[data-testid^="preview-tile-"]')].map((tile) => tile.getBoundingClientRect());
      return {left: Math.min(...tiles.map((r) => r.left)) - outer.left,
        right: outer.right - Math.max(...tiles.map((r) => r.right)),
        top: Math.min(...tiles.map((r) => r.top)) - outer.top,
        bottom: outer.bottom - Math.max(...tiles.map((r) => r.bottom)),
        overlapping: tiles.some((a, i) => tiles.slice(i + 1).some((b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top))};
    });
    assert.ok(report.left >= 8 && report.top >= 8, 'tiles respect the preview inset');
    assert.ok(Math.abs(report.left - report.right) < 1, JSON.stringify(report));
    assert.ok(Math.abs(report.top - report.bottom) < 1, JSON.stringify(report));
    assert.equal(report.overlapping, false);
    if (process.env.TV_SETTINGS_SCREENSHOTS) await page.screenshot({path: `../artifacts/cards-cleanup-preview-${viewport.width}.png`});
  });
}
