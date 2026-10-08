// Run against a local Vite server; Playwright can also be supplied through NODE_PATH.
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
let browser;
before(async () => {browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
const base = {layout: 'balanced', palette: 'night', customAccent: '#38BDF8', background: 'photo', backgroundColor: '#0F172A', backgroundZoom: 1.05,
  cards: ['weather', 'schedule', 'activity', 'media', 'meal', 'todo'].map((id, i) => ({id, visible: true, size: i === 1 ? 'wide' : 'standard'})), grid: null, cardStyles: {}};
async function setup(t, initial = {}) {
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  const state = {appearance: structuredClone(base), updatedAtMs: 10, library: {updatedAtMs: 0, designs: [], draft: null}, history: [], publishes: 0, ...initial};
  await page.route('**/__fixture-api/**', async (route) => {
    const request = route.request(); const body = request.postDataJSON();
    let status = 200; let result;
    if (request.url().endsWith('/polls')) result = {templates:[],rounds:[],devices:[]};
    else if (request.url().includes('googlePhotosPicker')) result = {photos: []};
    else if (request.url().endsWith('appearanceStudio')) {
      if (request.method() === 'GET') result = state;
      else if (['deleteRevision', 'clearHistory'].includes(body.action)) {
        if (JSON.stringify(body.expectedRevisions) !== JSON.stringify(state.history.map((entry) => entry.updatedAtMs))) {
          status = 409; result = {error: 'History changed on another device. Refresh designs and history before retrying.'};
        } else {
          state.history = body.action === 'clearHistory' ? [] : state.history.filter((entry) => entry.updatedAtMs !== body.updatedAtMs);
          result = {history: state.history};
        }
      }
      else if (body.expectedUpdatedAtMs !== state.library.updatedAtMs) { status = 409; result = {error: 'Designs changed in another browser. Refresh designs and history before retrying.'}; }
      else {
        if (body.action === 'draft') state.library.draft = body.draft;
        if (body.action === 'saveDesign') {
          const design = {id: body.id || String(state.library.updatedAtMs + 1), name: body.name, appearance: body.appearance, updatedAtMs: Date.now()};
          const index = state.library.designs.findIndex((item) => item.id === body.id);
          if (index < 0) state.library.designs.push(design); else state.library.designs[index] = design;
        }
        if (body.action === 'deleteDesign') state.library.designs = state.library.designs.filter((item) => item.id !== body.id);
        state.library.updatedAtMs++; result = {library: state.library};
      }
    } else if (body.expectedUpdatedAtMs !== state.updatedAtMs) {status = 409; result = {error: 'Settings changed on another device. Your draft is still here.'};}
    else {
      state.appearance = body.appearance; state.updatedAtMs++; state.publishes++;
      state.history.unshift({appearance: body.appearance, updatedAtMs: state.updatedAtMs, source: 'web', changedBy: 'fixture'});
      result = {updatedAtMs: state.updatedAtMs};
    }
    await route.fulfill({status, json: result});
  });
  const open = async () => {
    await page.goto(`${process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173'}/test/studio.html`);
    await page.locator('#appearance-content').waitFor({state: 'visible'});
    await page.waitForFunction(() => !document.querySelector('#appearance-reload').disabled);
    await page.getByText('Colors & background', {exact: true}).click();
  };
  await open();
  const waitIdle = () => page.waitForFunction(() => !document.querySelector('#appearance-reload').disabled);
  return {page, state, open, waitIdle};
}

test('phone edits support undo/redo, autosave, and recovery after reload without publishing', async (t) => {
  const {page, state, open} = await setup(t);
  await page.locator('#palette-select').selectOption('forest');
  await page.locator('#appearance-undo').click(); assert.equal(await page.locator('#palette-select').inputValue(), 'night');
  await page.locator('#appearance-redo').click(); assert.equal(await page.locator('#palette-select').inputValue(), 'forest');
  await page.waitForFunction(() => document.querySelector('#draft-status').textContent.startsWith('Draft saved to your account'));
  assert.equal(state.library.draft.appearance.palette, 'forest'); assert.equal(state.publishes, 0);
  await open(); assert.equal(await page.locator('#palette-select').inputValue(), 'forest');
  assert.equal(state.appearance.palette, 'night');
  await page.locator('#appearance-save').click();
  await page.waitForFunction(() => document.querySelector('#draft-status').textContent === 'No unpublished draft.');
  assert.equal(state.publishes, 1); assert.equal(state.appearance.palette, 'forest'); assert.equal(state.library.draft, null);
});

test('saved designs and revision restoration edit a draft with an undo path', async (t) => {
  const {page, state, waitIdle} = await setup(t, {history: [{appearance: {...base, palette: 'plum'}, updatedAtMs: 5, source: 'tv', changedBy: 'fixture'}]});
  await page.getByText('Saved designs and published history', {exact: true}).click();
  await page.locator('#design-name').fill('<Evening>'); await page.locator('#design-save').click(); await waitIdle();
  assert.equal(state.library.designs[0].name, '<Evening>'); assert.equal(await page.locator('#design-list script').count(), 0);
  await page.locator('#palette-select').selectOption('forest');
  await page.locator('#design-list').getByRole('button', {name: 'Replace', exact: true}).click(); await waitIdle();
  assert.equal(state.library.designs[0].appearance.palette, 'forest');
  await page.locator('#palette-select').selectOption('night');
  await page.locator('#design-list').getByRole('button', {name: 'Load', exact: true}).click();
  assert.equal(await page.locator('#palette-select').inputValue(), 'forest');
  await page.locator('#revision-list').getByRole('button', {name: 'Restore to draft'}).click();
  assert.equal(await page.locator('#palette-select').inputValue(), 'plum'); assert.equal(state.publishes, 0);
  await page.locator('#appearance-undo').click(); assert.equal(await page.locator('#palette-select').inputValue(), 'forest');
  await page.locator('#design-list').getByRole('button', {name: 'Delete', exact: true}).click(); await waitIdle();
  assert.equal(state.library.designs.length, 0);
  if (process.env.STUDIO_SCREENSHOT_DIR) {
    await page.screenshot({path: `${process.env.STUDIO_SCREENSHOT_DIR}/studio-phone.png`, fullPage: true});
    await page.setViewportSize({width: 1440, height: 1000});
    await page.screenshot({path: `${process.env.STUDIO_SCREENSHOT_DIR}/studio-desktop.png`, fullPage: true});
  }
});

test('history cleanup keeps saved designs and the current draft, including after reopening', async (t) => {
  const designs = [{id: 'saved', name: 'Evening', appearance: base, updatedAtMs: 1}];
  const draft = {appearance: {...base, palette: 'forest'}, baseUpdatedAtMs: 10};
  const history = [10, 5].map((updatedAtMs) => ({appearance: base, updatedAtMs, source: 'web', changedBy: 'fixture'}));
  const {page, state, waitIdle, open} = await setup(t, {library: {updatedAtMs: 1, designs: structuredClone(designs), draft}, history});
  await page.getByText('Saved designs and published history', {exact: true}).click();
  await page.locator('#revision-list').getByRole('button', {name: 'Delete', exact: true}).first().click();
  await waitIdle();
  assert.deepEqual(state.history.map((entry) => entry.updatedAtMs), [5]);
  assert.equal(await page.locator('#revision-list .design-library-row').count(), 1);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('#history-clear').click();
  assert.equal(state.history.length, 1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#history-clear').click();
  await waitIdle();
  assert.deepEqual(state.history, []);
  assert.equal(await page.locator('#history-clear').isDisabled(), true);
  assert.deepEqual(state.library.designs, designs);
  assert.deepEqual(state.library.draft, draft);
  assert.equal(state.appearance.palette, 'night');
  assert.equal(state.publishes, 0);
  await open();
  assert.equal(await page.locator('#palette-select').inputValue(), 'forest');
  await page.getByText('Saved designs and published history', {exact: true}).click();
  assert.equal(await page.locator('#revision-list .design-library-row').count(), 0);
  await page.locator('#draft-delete').click();
  await page.waitForFunction(() => document.querySelector('#palette-select').value === 'night' && !document.querySelector('#appearance-reload').disabled);
  await page.waitForTimeout(1700);
  assert.equal(state.library.draft, null, 'autosave must not recreate the deleted draft');
  assert.deepEqual(state.library.designs, designs);
  assert.equal(state.publishes, 0);
  assert.equal(await page.locator('#draft-delete').isDisabled(), true);
});

test('stale history cleanup reports a conflict and refresh allows retry without losing edits', async (t) => {
  const history = [{appearance: base, updatedAtMs: 5, source: 'web', changedBy: 'fixture'}];
  const {page, state, waitIdle} = await setup(t, {history});
  await page.locator('#palette-select').selectOption('forest');
  await page.getByText('Saved designs and published history', {exact: true}).click();
  state.history = [...history, {...history[0], updatedAtMs: 11}];
  await page.locator('#revision-list').getByRole('button', {name: 'Delete', exact: true}).click();
  await waitIdle();
  assert.match(await page.locator('#appearance-status').textContent(), /History changed/);
  assert.equal(state.history.length, 2);
  assert.equal(await page.locator('#palette-select').inputValue(), 'forest');
  await page.locator('#library-refresh').click();
  await waitIdle();
  await page.locator('#revision-list').getByRole('button', {name: 'Delete', exact: true}).first().click();
  await waitIdle();
  assert.deepEqual(state.history.map((entry) => entry.updatedAtMs), [11]);
  assert.equal(await page.locator('#palette-select').inputValue(), 'forest');
  assert.equal(state.publishes, 0);
});

test('stale drafts offer recovery before saving; discard loads the published revision', async (t) => {
  const draft = {appearance: {...base, palette: 'forest'}, baseUpdatedAtMs: 5};
  const {page, state, waitIdle} = await setup(t, {library: {updatedAtMs: 1, draft, designs: []}});
  assert.equal(await page.locator('#appearance-save').isDisabled(), true);
  assert.equal(await page.locator('#appearance-conflict').isVisible(), true);
  assert.match(await page.locator('#conflict-differences').textContent(), /colors/);
  assert.equal(await page.locator('#palette-select').inputValue(), 'forest'); assert.equal(state.publishes, 0);
  await page.locator('#appearance-reload').click();
  await page.waitForFunction(() => document.querySelector('#palette-select').value === 'night' && !document.querySelector('#appearance-reload').disabled);
  assert.equal(state.library.draft, null);
});

test('keeping an older draft requires an explicit publish and persists its new base across reload', async (t) => {
  const draft = {appearance: {...base, palette: 'forest'}, baseUpdatedAtMs: 5};
  const {page, state, open} = await setup(t, {library: {updatedAtMs: 1, draft, designs: []}});
  await page.locator('#appearance-keep-draft').click();
  assert.equal(state.publishes, 0);
  assert.equal(await page.locator('#palette-select').inputValue(), 'forest');
  assert.equal(await page.locator('#appearance-save').isEnabled(), true);
  await page.waitForFunction(() => document.querySelector('#draft-status').textContent.startsWith('Draft saved to your account'));
  assert.equal(state.library.draft.baseUpdatedAtMs, 10);
  await open();
  assert.equal(await page.locator('#appearance-conflict').isVisible(), false);
  await page.locator('#appearance-save').click();
  await page.waitForFunction(() => document.querySelector('#draft-status').textContent === 'No unpublished draft.');
  assert.equal(state.publishes, 1);
  assert.equal(state.appearance.palette, 'forest');
});

test('a TV change during editing or after keeping a draft still prevents an overwrite', async (t) => {
  const {page, state, waitIdle} = await setup(t);
  await page.locator('#palette-select').selectOption('forest');
  state.updatedAtMs = 11; state.appearance = {...base, palette: 'plum'};
  await page.locator('#appearance-save').click(); await waitIdle();
  assert.equal(await page.locator('#appearance-conflict').isVisible(), true);
  assert.equal(state.publishes, 0);
  await page.locator('#appearance-keep-draft').click();
  state.updatedAtMs = 12; state.appearance = {...base, palette: 'contrast'};
  await page.locator('#appearance-save').click(); await waitIdle();
  assert.equal(await page.locator('#appearance-conflict').isVisible(), true);
  assert.equal(state.publishes, 0);
  assert.equal(await page.locator('#palette-select').inputValue(), 'forest');
  await page.locator('#appearance-use-latest').click(); await waitIdle();
  await page.waitForFunction(() => document.querySelector('#palette-select').value === 'contrast');
  assert.equal(state.library.draft, null);
  assert.equal(state.appearance.palette, 'contrast');
});

test('library conflicts retain page edits and refresh permits an explicit draft retry', async (t) => {
  const {page, state, waitIdle} = await setup(t);
  await page.locator('#palette-select').selectOption('forest');
  state.library.updatedAtMs = 9;
  await page.locator('#draft-save').click(); await waitIdle();
  assert.match(await page.locator('#draft-status').textContent(), /changed in another browser/);
  assert.equal(await page.locator('#palette-select').inputValue(), 'forest');
  await page.getByText('Saved designs and published history', {exact: true}).click();
  await page.locator('#library-refresh').click(); await waitIdle();
  await page.locator('#draft-save').click(); await waitIdle();
  assert.equal(state.library.draft.appearance.palette, 'forest'); assert.equal(state.publishes, 0);
  await page.evaluate(() => window.editor.clear());
  assert.equal(await page.locator('#appearance-content').isVisible(), false);
  assert.equal(await page.locator('#design-list').textContent(), '');
});

test('card controls preserve preview order, width and the last visible card', async (t) => {
  const {page} = await setup(t);
  await page.getByRole('button', {name: 'Move Weather down', exact: true}).click();
  assert.equal(await page.locator('#card-list .card-editor-row').first().getAttribute('data-card-id'), 'schedule');
  assert.equal(await page.locator('.tv-preview-tile').first().textContent(), 'Schedule');
  await page.getByRole('combobox', {name: 'Weather width', exact: true}).selectOption('wide');
  assert.equal(await page.locator('.tv-preview-tile[data-card-id=weather]').evaluate((tile) => tile.style.flexGrow), '2');
  for (const id of ['schedule', 'activity', 'media', 'meal', 'todo']) {
    await page.locator(`.card-editor-row[data-card-id=${id}] input`).uncheck();
  }
  await page.locator('.card-editor-row[data-card-id=weather] input').click();
  assert.equal(await page.locator('.card-editor-row[data-card-id=weather] input').isChecked(), true);
  assert.match(await page.locator('#appearance-status').textContent(), /Keep at least one card visible/);
  assert.equal(await page.locator('.tv-preview-tile').count(), 1);
});

async function beginWeatherDrag(page) {
  await page.locator('#card-list').scrollIntoViewIfNeeded();
  const handle = await page.getByRole('button', {name: 'Drag Weather to reorder', exact: true}).boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
}

async function moveOverCard(page, id) {
  const target = await page.locator(`.card-editor-row[data-card-id=${id}]`).boundingBox();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
}

const cardOrder = (page) => page.locator('#card-list .card-editor-row').evaluateAll((rows) => rows.map((row) => row.dataset.cardId));

test('canceled row dragging leaves the draft unchanged; completed drops can be undone', async (t) => {
  const {page, state, waitIdle} = await setup(t);
  const original = await cardOrder(page);
  await beginWeatherDrag(page);
  await page.mouse.up();
  assert.equal(await page.locator('#draft-status').textContent(), 'No unpublished draft.');
  await beginWeatherDrag(page);
  await moveOverCard(page, 'schedule');
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', {pointerId: 1})));
  await page.mouse.up();
  assert.deepEqual(await cardOrder(page), original);
  assert.equal(await page.locator('#draft-status').textContent(), 'No unpublished draft.');
  await beginWeatherDrag(page);
  await moveOverCard(page, 'schedule');
  await page.mouse.up();
  assert.deepEqual((await cardOrder(page)).slice(0, 2), ['schedule', 'weather']);
  await page.locator('#appearance-undo').click();
  assert.deepEqual(await cardOrder(page), original);
  await page.locator('#appearance-redo').click();
  await page.locator('#draft-save').click();
  await waitIdle();
  assert.deepEqual(state.library.draft.appearance.cards.slice(0, 2).map((card) => card.id), ['schedule', 'weather']);
  assert.equal(state.publishes, 0);
});

test('clearing the editor during a drag prevents the old gesture from changing a new account', async (t) => {
  const {page, state} = await setup(t);
  await beginWeatherDrag(page);
  await page.evaluate(() => window.editor.clear());
  state.appearance = {...base, palette: 'plum', cards: structuredClone(base.cards).reverse()};
  await page.evaluate(() => window.editor.load());
  const loadedOrder = await cardOrder(page);
  await page.locator('#card-list').scrollIntoViewIfNeeded();
  await moveOverCard(page, 'activity');
  await page.mouse.up();
  assert.deepEqual(await cardOrder(page), loadedOrder);
  assert.equal(await page.locator('#draft-status').textContent(), 'No unpublished draft.');
  assert.equal(state.library.draft, null);
  assert.equal(state.publishes, 0);
});

test('malformed appearance fields fall back to usable controls and are not saved as unknown fields', async (t) => {
  const {page, state, waitIdle} = await setup(t, {appearance: {...base, palette: 'invalid',
    extraField: 'unrecognized', ambient: {idleMinutes: -1, plasmaColors: 42, info: {weather: 'false'}}}});
  assert.equal(await page.locator('#palette-select').inputValue(), 'night');
  await page.getByText('Ambient mode', {exact: true}).click();
  assert.equal(await page.locator('#ambient-idle').inputValue(), '10');
  assert.equal(await page.locator('[data-info=weather]').isChecked(), true);
  await page.getByText('Saved designs and published history', {exact: true}).click();
  await page.locator('#design-name').fill('Recovered');
  await page.locator('#design-save').click();
  await waitIdle();
  const saved = state.library.designs[0].appearance;
  assert.equal(saved.extraField, undefined);
  assert.equal(saved.ambient.idleMinutes, 10);
  assert.equal(saved.ambient.plasmaColors.length, 3);
});

test('invalid studio metadata reports an error and never enables publishing', async (t) => {
  const {page, state} = await setup(t);
  for (const invalid of [{...state, library: null}, {...state, updatedAtMs: -1}, {...state, history: [{}]}]) {
    await page.route('**/__fixture-api/appearanceStudio', (route) => route.fulfill({json: invalid}));
    await page.evaluate(() => window.editor.load());
    assert.equal(await page.locator('#appearance-content').isVisible(), false);
    assert.match(await page.locator('#appearance-status').textContent(), /invalid dashboard settings/);
    assert.equal(state.publishes, 0);
    await page.unroute('**/__fixture-api/appearanceStudio');
  }
});

test('a studio response arriving after clear cannot restore private editor data', async (t) => {
  const {page, state} = await setup(t);
  let release;
  let received;
  const gate = new Promise((resolve) => {release = resolve;});
  const requestReceived = new Promise((resolve) => {received = resolve;});
  await page.route('**/__fixture-api/appearanceStudio', async (route) => {
    received();
    await gate;
    await route.fulfill({json: {...state, library: {updatedAtMs: 1, draft: null,
      designs: [{id: 'private', name: 'Private design', appearance: base, updatedAtMs: 1}]}}});
  });
  await page.evaluate(() => {window.pendingLoad = window.editor.load();});
  await requestReceived;
  await page.evaluate(() => window.editor.clear());
  release();
  await page.evaluate(() => window.pendingLoad);
  assert.equal(await page.locator('#appearance-content').isVisible(), false);
  assert.equal(await page.locator('#design-list').textContent(), '');
  assert.equal(await page.locator('#appearance-status').textContent(), 'Sign in to edit your dashboard.');
  assert.equal(state.publishes, 0);
});

test('normalization preserves its input and produces independent default settings', async (t) => {
  const {page} = await setup(t);
  const result = await page.evaluate(async () => {
    const {normalizeAppearance} = await import('/src/features/dashboard/appearanceModel.ts');
    const original = {cards: [{id: 'weather', visible: false, size: 'standard'}]};
    const before = JSON.stringify(original);
    const normalized = normalizeAppearance(original);
    normalized.cards[0].size = 'wide';
    const allHidden = {cards: ['weather', 'schedule', 'activity', 'media', 'meal', 'todo']
      .map((id) => ({id, visible: false, size: 'standard'}))};
    const repaired = normalizeAppearance(allHidden);
    const firstDefault = normalizeAppearance(null);
    firstDefault.cards[0].visible = false;
    firstDefault.cardStyles.weather = {opacity: 0.5};
    const secondDefault = normalizeAppearance(null);
    return {
      originalUnchanged: JSON.stringify(original) === before,
      hiddenInputUnchanged: allHidden.cards.every((card) => !card.visible),
      repairedHasVisibleCard: repaired.cards.some((card) => card.visible),
      independentCards: secondDefault.cards[0].visible,
      independentStyles: Object.keys(secondDefault.cardStyles).length === 0,
    };
  });
  assert.deepEqual(result, {
    originalUnchanged: true,
    hiddenInputUnchanged: true,
    repairedHasVisibleCard: true,
    independentCards: true,
    independentStyles: true,
  });
});
