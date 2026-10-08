const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const {chromium} = require('playwright');
const baseUrl = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173';
let browser;
before(async () => {browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
const person = {id: 'a'.repeat(32), name: 'Alex'};
async function setup(t, invite = false) {
  const page = await browser.newPage({viewport: {width: 390, height: 844}}); t.after(() => page.close());
  const state = {people: [person], sharing: [{id: 'b'.repeat(32), name: 'Me', dashboardName: 'Sam’s dashboard'}], connection: {connected: true, stepGoal: 8000, distanceGoal: 6}};
  const writes = []; const errors = []; page.on('pageerror', (e) => errors.push(e.message)); t.after(() => assert.deepEqual(errors, []));
  await page.route('**/__fixture-api/**', async (route) => {
    const url = new URL(route.request().url()); const body = route.request().postDataJSON();
    if (url.pathname.endsWith('/beginGoogleActivity')) {writes.push(body); return route.fulfill({json: {authorizationUrl: 'https://untrusted.example/steal'}});}
    if (body) {
      writes.push(body);
      if (body.action === 'invite') return route.fulfill({json: {id: 'c'.repeat(64), url: `${baseUrl}/people?invite=${'s'.repeat(43)}`, expiresAtMs: Date.now() + 1800000}});
      if (body.action === 'remove') {state.people = state.people.filter((p) => p.id !== body.id); state.sharing = state.sharing.filter((p) => p.id !== body.id);}
      return route.fulfill({json: {success: true}});
    }
    return route.fulfill({json: url.searchParams.has('invite') ? {dashboardName: 'Jordan’s dashboard', expiresAtMs: Date.now() + 1800000} : state});
  });
  await page.goto(`${baseUrl}/test/people.html${invite ? `?invite=${'s'.repeat(43)}` : ''}`);
  await page.getByRole('heading', {name: invite ? 'Your activity on this dashboard' : 'People on your dashboard', exact: true}).waitFor();
  return {page, writes, state};
}
test('people management generates/cancels an invitation, revokes shares and reflows on small screens', async (t) => {
  const {page, writes} = await setup(t);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: 900});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `People overflows at ${width}`);
    if (process.env.COMPANION_SCREENSHOTS && [390, 1440].includes(width)) {
      await fs.mkdir(process.env.COMPANION_SCREENSHOTS, {recursive: true});
      await page.screenshot({path: path.join(process.env.COMPANION_SCREENSHOTS, `people-${width}.png`), fullPage: true});
    }
  }
  await page.getByRole('button', {name: 'Add person', exact: true}).click();
  await page.getByLabel('Send this invitation to one person').waitFor();
  assert.match(await page.getByLabel('Send this invitation to one person').inputValue(), /invite=/);
  await page.getByRole('button', {name: 'Cancel invitation', exact: true}).click();
  await page.getByLabel('Send this invitation to one person').waitFor({state: 'hidden'});
  assert.equal(writes.at(-1).action, 'cancelInvitation');
  await page.getByRole('button', {name: 'Remove person', exact: true}).click();
  assert.equal(writes.some((b) => b.action === 'remove'), false);
  await page.getByRole('button', {name: 'Confirm removal', exact: true}).click();
  await page.getByText('No other people are sharing activity yet.', {exact: true}).waitFor();
  await page.getByRole('button', {name: 'Stop sharing', exact: true}).click();
  await page.getByText('You are not sharing activity with another dashboard.', {exact: true}).waitFor();
});
test('joining requires explicit consent and only trusts Google authorization redirects', async (t) => {
  const {page, writes} = await setup(t, true);
  assert.equal(await page.getByRole('button', {name: 'Approve sharing & connect activity', exact: true}).isDisabled(), true);
  await page.getByLabel('Name on the dashboard').fill('Alex');
  await page.getByLabel('I agree to share this activity on the dashboard and its linked TVs.').check();
  await page.getByRole('button', {name: 'Approve sharing & connect activity', exact: true}).click();
  await page.getByText('Could not start activity consent.', {exact: true}).waitFor();
  assert.equal(writes[0].consent, true); assert.equal(writes[0].invite, 's'.repeat(43));
  assert.equal(new URL(page.url()).pathname, '/test/people.html');
  assert.equal(await page.getByRole('button', {name: 'Add person', exact: true}).count(), 0);
});
test('sign-in restores the people invitation query without accepting another origin', async (t) => {
  const {page} = await setup(t);
  const restored = await page.evaluate(async () => {
    const navigation = await import('/src/app/authNavigation.ts');
    history.replaceState({}, '', `/people?invite=${'s'.repeat(43)}`); navigation.rememberSignInPath('people');
    history.replaceState({}, '', '/pair'); navigation.restoreSignInPath();
    const path = location.pathname + location.search;
    sessionStorage.setItem('homescreen:people-signin', 'https://untrusted.example/people?invite=stolen');
    history.replaceState({}, '', '/pair'); navigation.restoreSignInPath();
    return {path, afterAttack: location.pathname};
  });
  assert.equal(restored.path, `/people?invite=${'s'.repeat(43)}`); assert.equal(restored.afterAttack, '/pair');
});
test('two people get independent activity widgets and publish without replacing the owner card', async (t) => {
  const page = await browser.newPage(); t.after(() => page.close());
  const appearance = {layout: 'balanced', palette: 'night', customAccent: '#38BDF8', background: 'solid', backgroundColor: '#0F172A', backgroundZoom: 1.05,
    cards: ['weather', 'schedule', 'activity', 'media', 'meal', 'todo'].map((id) => ({id, visible: true, size: 'standard'})), grid: null, cardStyles: {}};
  const state = {appearance, updatedAtMs: 1, library: {updatedAtMs: 0, designs: [], draft: null}, history: []}; let published;
  await page.route('**/__fixture-api/**', async (route) => {
    const url = route.request().url(); const body = route.request().postDataJSON(); let result;
    if (url.endsWith('/people')) result = {people: [person, {id: 'b'.repeat(32), name: 'Sam'}], sharing: [], connection: null};
    else if (url.endsWith('/polls')) result = {templates: [], rounds: [], devices: []};
    else if (url.includes('googlePhotosPicker')) result = {photos: []};
    else if (url.endsWith('/appearanceStudio')) {if (!body) result = state; else {state.library.updatedAtMs++; state.library.draft = body.draft; result = {library: state.library};}}
    else {published = body.appearance; state.appearance = published; result = {updatedAtMs: ++state.updatedAtMs};}
    await route.fulfill({json: result});
  });
  await page.goto(`${baseUrl}/test/studio.html`);
  await page.waitForFunction(() => !document.querySelector('[aria-label="Person’s activity to add"]')?.disabled);
  await page.getByRole('button', {name: 'Add activity', exact: true}).click();
  assert.equal(await page.getByRole('button', {name: 'Add activity', exact: true}).isDisabled(), true);
  await page.getByLabel('Person’s activity to add').selectOption('b'.repeat(32));
  await page.getByRole('button', {name: 'Add activity', exact: true}).click();
  assert.equal(await page.locator('.widget-row').count(), 8);
  const alex = page.locator('.widget-row').filter({has: page.getByRole('heading', {name: 'Activity · Alex', exact: true})});
  await alex.getByRole('button', {name: 'Edit widget', exact: true}).click();
  await alex.getByLabel('Surface preset').selectOption('custom'); await alex.getByLabel('Background color').fill('#abcdef');
  await page.getByRole('button', {name: /Save to TV/}).click(); await page.getByText('Saved to TV. Your draft is clear.', {exact: true}).waitFor();
  const members = published.widgetLayout.widgets.filter((w) => w.personId);
  assert.equal(members.length, 2); assert.notEqual(members[0].id, members[1].id);
  assert.equal(members[0].style.backgroundColor, '#abcdef'); assert.equal(members[1].style, undefined);
  assert.equal(published.widgetLayout.widgets.find((w) => w.id === 'activity').personId, undefined);
});
