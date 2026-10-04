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
    if (request.url().includes('googlePhotosPicker')) result = {photos: []};
    else if (request.url().endsWith('appearanceStudio')) {
      if (request.method() === 'GET') result = state;
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
    await page.getByText('2 · Colors and background', {exact: true}).click();
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

test('stale drafts cannot overwrite newer TV settings; discard loads the published revision', async (t) => {
  const draft = {appearance: {...base, palette: 'forest'}, baseUpdatedAtMs: 5};
  const {page, state, waitIdle} = await setup(t, {library: {updatedAtMs: 1, draft, designs: []}});
  await page.locator('#appearance-save').click(); await waitIdle();
  assert.match(await page.locator('#appearance-status').textContent(), /changed on another device/);
  assert.equal(await page.locator('#palette-select').inputValue(), 'forest'); assert.equal(state.publishes, 0);
  await page.locator('#appearance-reload').click();
  await page.waitForFunction(() => document.querySelector('#palette-select').value === 'night' && !document.querySelector('#appearance-reload').disabled);
  assert.equal(state.library.draft, null);
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
