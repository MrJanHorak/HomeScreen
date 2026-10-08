const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const path = require('node:path');
const fs = require('node:fs/promises');
let browser;
const baseUrl = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:5173';
before(async () => {browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
const appearance = {layout:'balanced',palette:'night',customAccent:'#38BDF8',background:'photo',backgroundColor:'#0F172A',backgroundZoom:1.05,
  cards:['weather','schedule','activity','media','meal','todo'].map((id) => ({id,visible:true,size:'standard'})),grid:null,cardStyles:{}};
async function setup(t, {signedOut = false} = {}) {
  const context = await browser.newContext({viewport:{width:390,height:844}}); t.after(() => context.close());
  const state = {preferences:{savedLocations:[{id:'ny',name:'New York',query:'New York, US',isDefault:true}],activeLocationId:'ny',stepGoal:10000,distanceGoal:8},revision:1,
    appearance:structuredClone(appearance), appearanceRevision:1, library:{updatedAtMs:0,designs:[],draft:null}, apps:{apps:[{packageName:'tv.one',label:'One'},{packageName:'tv.two',label:'Two'}],preferences:{visible:false,packages:[]},updatedAtMs:1}, photoPurpose:null, selected:false, writes:[]};
  await context.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/firebase_app.js*', (route) => route.fulfill({contentType:'application/javascript',body:'export class FirebaseError extends Error {}; export const initializeApp = () => ({});'}));
  await context.route('**/firebase_auth.js*', (route) => route.fulfill({contentType:'application/javascript',body:`const auth = {currentUser:${signedOut ? 'null' : "{uid:'owner',email:'owner@example.com',getIdToken:async ()=>'fixture-token'}"}}; let callback;
    export const getAuth=()=>auth; export class GoogleAuthProvider {}; export const getRedirectResult=async()=>null;
    export const onAuthStateChanged=(_auth,fn)=>{callback=fn; queueMicrotask(fn);}; export const signInWithRedirect=async()=>{};
    export const signOut=async()=>{auth.currentUser=null;callback();};
    window.switchFixtureAccount=(uid)=>{auth.currentUser=uid ? {uid,email:uid+'@example.com',getIdToken:async()=>uid+'-token'} : null;callback();};`}));
  await context.route('https://photos.google.com/**', (route) => route.fulfill({body:'Mock Google picker',contentType:'text/html'}));
  await context.route('https://accounts.google.com/**', (route) => route.fulfill({body:'Mock Google consent',contentType:'text/html'}));
  await context.route('**cloudfunctions.net/**', async (route) => {
    const request = route.request(); const url = new URL(request.url()); const endpoint = url.pathname.split('/').pop(); const body = request.postDataJSON();
    let result = {}; let status = 200;
    if (request.method() === 'OPTIONS') return route.fulfill({status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET, PUT, POST, DELETE'}});
    if (state.delayEndpoint === endpoint && (!state.delayMethod || state.delayMethod === request.method())) {
      state.delayEndpoint = null;
      await new Promise((resolve) => {state.releaseResponse = resolve; state.onDelayed?.();});
    }
    if (endpoint === 'userPreferences') {
      if (body) {state.writes.push(body); if (body.expectedUpdatedAtMs !== state.revision) {status=409; result={error:'Settings changed on another device. Reload settings before saving again.'};} else {state.preferences=body.preferences; result={updatedAtMs:++state.revision};}}
      else result={preferences:state.preferences,updatedAtMs:state.revision,hasSavedLocations:true};
    } else if (endpoint === 'appearanceStudio') {
      if (body) {state.library.draft=body.draft; state.library.updatedAtMs++; result={library:state.library};}
      else result={appearance:state.appearance,updatedAtMs:state.appearanceRevision,library:state.library,history:[]};
    } else if (endpoint === 'userAppearance') {
      state.writes.push(body); state.appearance=body.appearance; result={updatedAtMs:++state.appearanceRevision};
    } else if (endpoint === 'googlePhotosPicker') {
      const action = url.searchParams.get('action');
      if (state.failPickerAction === action) return route.fulfill({status:410,contentType:'application/json',body:JSON.stringify({error:'Photo selection expired. Start again.'}),headers:{'Access-Control-Allow-Origin':'*'}});
      if (action === 'status') result={connected:true};
      else if (action === 'create') {state.photoPurpose=url.searchParams.get('purpose');result={pickerUri:'https://photos.google.com/picker/mock',pollIntervalMs:1500,sessionId:'mock-session'};}
      else if (action === 'poll') {state.pollSession=url.searchParams.get('sessionId');state.polls=(state.polls||0)+1;state.selected=true;result=state.pending ? {status:'pending',pollIntervalMs:1500} : {status:'selected',photos:[]};}
      else result={photos:[],dataUrl:null};
    } else if (endpoint === 'accountSecurity') {
      if (body) state.writes.push(body);
      status=state.accountStatus || 200;
      result=status === 200 ? {connections:{dashboardGoogle:true,mealSheet:true,photos:true}} : {error:'Account action unavailable.'};
    } else if (endpoint === 'mealSheetConfig') {
      if (body) state.writes.push(body);
      if (request.method() === 'DELETE') state.mealRemoved=true;
      result={authorized:true,spreadsheetTitle:'Weekly dinners',mealCount:7};
    } else if (endpoint === 'beginGoogleLink') {
      state.writes.push(body); status=state.pairStatus || 200;
      result={authorizationUrl:state.authorizationUrl || 'https://accounts.google.com/mock-consent'};
    } else if (endpoint === 'beginGoogleMeals') result={authorizationUrl:state.authorizationUrl || 'https://accounts.google.com/mock-consent'};
    else if (endpoint === 'people') result={people:[],sharing:[],connection:{connected:false,stepGoal:10000,distanceGoal:8}};
    else if (endpoint === 'polls') result={templates:[],rounds:[],devices:[{id:'a'.repeat(32),name:'Living room',timeZone:'America/New_York',pollCapable:true}]};
    else if (endpoint === 'linkedDevices') result={devices:[{id:'a'.repeat(32),name:'Living room',pairedAtMs:1,lastSeenAtMs:Date.now()}]};
    else if (endpoint === 'deviceApps') {if (body) {state.apps.preferences=body.preferences;state.apps.updatedAtMs++;state.writes.push(body);}result=state.apps;}
    else throw new Error(`Unexpected API: ${endpoint}`);
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result),headers:{'Access-Control-Allow-Origin':'*'}});
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror',(error)=>errors.push(error.message)); t.after(()=>assert.deepEqual(errors,[]));
  return {page,state,context};
}
test('every companion page reflows at phone, tablet and laptop widths', async (t) => {
  const {page} = await setup(t);
  for (const route of ['pair','dashboard','polls','settings','meals','account','people']) {
    for (const width of [320,390,768,1024,1440]) {
      await page.setViewportSize({width,height:900}); await page.goto(`${baseUrl}/${route}`);
      await page.waitForFunction(()=>document.querySelector('#account-name')?.textContent === 'owner@example.com');
      if (route === 'dashboard') await page.locator('#appearance-content').waitFor({state:'visible'});
      if (route === 'dashboard') assert.equal(await page.evaluate(() => document.querySelector('.studio-actionbar').getBoundingClientRect().bottom <= document.querySelector('.studio-workspace').getBoundingClientRect().top),true,'Publish controls must remain visible before the workspace without covering it');
      if (route === 'settings') await page.locator('.weather-content').waitFor({state:'visible'});
      const dimensions = await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
      assert.ok(dimensions.scroll <= dimensions.width+1, `${route} overflows at ${width}: ${dimensions.scroll}`);
      assert.equal(await page.locator('.site-nav [aria-current=page]').count(),1);
      assert.equal(await page.locator('.site-nav [aria-current=page]').getAttribute('href'), `/${route}`);
      const featureRoots = ['#pair-form', '#appearance-editor', '#poll-manager', '#weather-editor', '#meal-form', '#account-controls', '#people-manager'];
      assert.equal(await page.locator(featureRoots.join(',')).count(), 1, 'only the active feature is mounted');
      if (process.env.COMPANION_SCREENSHOTS && [390,768,1440].includes(width)) {
        await fs.mkdir(process.env.COMPANION_SCREENSHOTS,{recursive:true});
        await page.screenshot({path:path.join(process.env.COMPANION_SCREENSHOTS,`${route}-${width}.png`),fullPage:true});
      }
    }
  }
});

test('pairing preserves QR codes, validates input, reports expiry and trusts only Google redirects', async (t) => {
  const {page,state} = await setup(t);
  await page.goto(`${baseUrl}/pair?code=a7k9w2`);
  assert.equal(await page.locator('#pair-code').inputValue(), 'A7K9W2');
  await page.locator('#pair-code').fill('abc!01');
  await page.getByRole('button', {name:'Connect TV'}).click();
  await page.getByText('Enter the six-character code displayed on your TV.', {exact:true}).waitFor();
  assert.equal(state.writes.length, 0);
  await page.locator('#pair-code').fill('A7K9W2');
  state.pairStatus=410;
  await page.getByRole('button', {name:'Connect TV'}).click();
  await page.getByText('That code is invalid or expired. Request a new code on your TV.', {exact:true}).waitFor();
  assert.deepEqual(state.writes.at(-1), {code:'A7K9W2'});
  state.pairStatus=200;
  state.authorizationUrl='https://example.com/steal';
  await page.getByRole('button', {name:'Connect TV'}).click();
  await page.getByText('The server returned an invalid Google sign-in URL.', {exact:true}).waitFor();
  assert.equal(new URL(page.url()).pathname, '/pair');
  state.authorizationUrl='https://accounts.google.com/mock-consent';
  await page.getByRole('button', {name:'Connect TV'}).click();
  await page.waitForURL('https://accounts.google.com/mock-consent');
});

test('meals connect and remove a Sheet without loading unrelated account features', async (t) => {
  const {page,state} = await setup(t);
  await page.goto(`${baseUrl}/meals?result=meals_connected`);
  await page.getByText('Google Sheets access is ready. Paste your meal Sheet link below.', {exact:true}).waitFor();
  await page.locator('#meal-url').fill('https://docs.google.com/spreadsheets/d/dinner');
  await page.getByRole('button', {name:'Use this Sheet'}).click();
  await page.getByText('Connected 7 dated dinners. Your TV will refresh automatically.', {exact:true}).waitFor();
  assert.deepEqual(state.writes.at(-1), {url:'https://docs.google.com/spreadsheets/d/dinner'});
  assert.equal(await page.locator('#meal-url').inputValue(), '');
  await page.getByRole('button', {name:'Disconnect meal Sheet', exact:true}).click();
  await page.getByText('Meal Sheet disconnected and its stored access removed.', {exact:true}).waitFor();
  assert.equal(state.mealRemoved, true);
  assert.equal(await page.locator('#meal-form').isHidden(), true);
  state.authorizationUrl='not a URL';
  await page.getByRole('button', {name:'Allow Google Sheets access', exact:true}).click();
  await page.getByText('The server returned an invalid Google permission URL.', {exact:true}).waitFor();
  state.authorizationUrl='https://accounts.google.com/mock-consent';
  await page.getByRole('button', {name:'Allow Google Sheets access', exact:true}).click();
  await page.waitForURL('https://accounts.google.com/mock-consent');
});

test('signed-out pages preserve OAuth return messages and disable account controls', async (t) => {
  const {page} = await setup(t, {signedOut:true});
  await page.goto(`${baseUrl}/meals?result=meals_denied`);
  await page.getByText('Google Sheets access was not approved.', {exact:true}).waitFor();
  assert.equal(await page.locator('#meal-form').isHidden(), true);
  await page.goto(`${baseUrl}/pair?result=expired`);
  await page.getByText('The TV code expired. Request a new one on your TV.', {exact:true}).waitFor();
  assert.equal(await page.locator('#connect-button').isDisabled(), true);
  await page.goto(`${baseUrl}/account`);
  assert.equal(await page.locator('#account-controls').isHidden(), true);
});

test('account actions preserve confirmation, errors and sign-out after success', async (t) => {
  const {page,state} = await setup(t);
  await page.goto(`${baseUrl}/account`);
  await page.getByText('Disconnect services or remove account data', {exact:true}).click();
  const revoke = page.getByRole('button', {name:'Sign out on every device', exact:true});
  page.once('dialog', (dialog) => dialog.dismiss());
  await revoke.click();
  assert.equal(state.writes.length, 0);
  state.accountStatus=503;
  page.once('dialog', (dialog) => dialog.accept());
  await revoke.click();
  await page.getByText('Account action unavailable.', {exact:true}).waitFor();
  assert.equal(await page.locator('#account-name').textContent(), 'owner@example.com');
  state.accountStatus=200;
  page.once('dialog', (dialog) => dialog.accept());
  await revoke.click();
  await page.getByText('All sessions revoked. Sign in again to continue.', {exact:true}).waitFor();
  assert.deepEqual(state.writes.at(-1), {action:'signOutEverywhere'});
  assert.equal(await page.locator('#account-controls').isHidden(), true);
});

for (const endpoint of ['mealSheetConfig','accountSecurity']) test(`late ${endpoint} loads cannot repopulate a signed-out page`, async (t) => {
  const {page,state} = await setup(t);
  state.delayEndpoint=endpoint;
  const delayed = new Promise((resolve) => {state.onDelayed=resolve;});
  await page.goto(`${baseUrl}/${endpoint === 'mealSheetConfig' ? 'meals' : 'account'}`);
  await delayed;
  await page.getByRole('button', {name:'Switch account', exact:true}).click();
  await page.waitForFunction(() => document.querySelector('#account-name').textContent === 'Not signed in');
  const response = page.waitForResponse((response) => response.url().endsWith(`/${endpoint}`));
  state.releaseResponse();
  await response;
  await page.waitForTimeout(100);
  if (endpoint === 'mealSheetConfig') {
    assert.equal(await page.locator('#meal-current').textContent(), '');
    assert.equal(await page.locator('#meal-status').textContent(), '');
    assert.equal(await page.locator('#meal-form').isHidden(), true);
  } else {
    assert.equal(await page.locator('#connection-status').textContent(), 'Sign in to see connected services.');
  }
});

test('a late Sheet save cannot overwrite the next account', async (t) => {
  const {page,state} = await setup(t);
  await page.goto(`${baseUrl}/meals`);
  await page.locator('#meal-form').waitFor({state:'visible'});
  state.delayEndpoint='mealSheetConfig'; state.delayMethod='PUT';
  const delayed = new Promise((resolve) => {state.onDelayed=resolve;});
  await page.locator('#meal-url').fill('https://docs.google.com/spreadsheets/d/old-account');
  await page.getByRole('button', {name:'Use this Sheet'}).click();
  await delayed;
  await page.evaluate(() => window.switchFixtureAccount('next'));
  await page.waitForFunction(() => document.querySelector('#account-name').textContent === 'next@example.com');
  const response = page.waitForResponse((response) => response.request().method() === 'PUT');
  state.releaseResponse(); await response;
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#meal-status').textContent(), '');
  assert.equal(await page.locator('#meal-url').inputValue(), '');
  assert.equal(await page.locator('#meal-save-button').isEnabled(), true);
});

test('redirect recovery keeps all companion flows on their originating pages', async (t) => {
  const {page} = await setup(t);
  for (const route of ['settings','account','meals','dashboard']) {
    await page.goto(`${baseUrl}/${route}`);
    await page.getByRole('button', {name:'Switch account', exact:true}).click();
    await page.getByRole('button', {name:'Sign in with Google', exact:true}).click();
    await page.goto(`${baseUrl}/pair`);
    await page.waitForURL(`${baseUrl}/${route}`);
    assert.equal(await page.locator('.site-nav [aria-current=page]').getAttribute('href'), `/${route}`);
  }
});
test('weather adds cities, sets the default, saves and keeps changes on a conflict', async (t) => {
  const {page,state} = await setup(t); await page.goto(`${baseUrl}/settings`);
  await page.locator('#weather-query').fill('Denver, CO, US'); await page.locator('#weather-label').fill('Cabin'); await page.getByRole('button',{name:'Add city',exact:true}).click();
  await page.getByRole('button',{name:'Make default: Cabin'}).click(); await page.getByRole('button',{name:'Save settings to TVs'}).click();
  await page.getByText('Settings saved. Running TVs update within about a minute.').waitFor();
  assert.equal(state.preferences.savedLocations.find((loc)=>loc.isDefault).name,'Cabin');
  state.revision++; await page.getByText('Activity goals',{exact:true}).click(); await page.locator('#step-goal').fill('8000'); await page.getByRole('button',{name:'Save settings to TVs'}).click();
  await page.getByText('Settings changed on another device. Reload settings before saving again.').waitFor(); assert.equal(await page.locator('#step-goal').inputValue(),'8000');
});
test('ambient edits join dashboard drafts and photo pickers work for both purposes', async (t) => {
  const {page,state} = await setup(t); await page.goto(`${baseUrl}/dashboard`); await page.locator('#appearance-content').waitFor({state:'visible'});
  await page.getByText('Ambient mode',{exact:true}).click(); await page.locator('#ambient-idle').selectOption('20'); await page.locator('#ambient-source').selectOption('plasma'); await page.locator('#ambient-preset').selectOption('Sunset');
  await page.locator('#appearance-save').click(); await page.getByText('Saved to TV. Your draft is clear.',{exact:true}).waitFor();
  assert.equal(state.appearance.ambient.idleMinutes,20); assert.equal(state.appearance.ambient.plasmaColors[0],'#E8795B');
  await page.getByText('Colors & background',{exact:true}).click();await page.getByText('Your photo library',{exact:true}).click();
  for (const purpose of ['background','ambient']) {
    await page.getByRole('button',{name:purpose==='background'?'Choose dashboard photos':'Choose ambient photos',exact:true}).click();
    await page.getByRole('button',{name:'Check selection',exact:true}).click();
    await page.getByText('Photos saved. Use Save to TV to publish your background or ambient design.').waitFor(); assert.equal(state.photoPurpose,purpose);
    assert.equal(state.pollSession,'mock-session');
  }
  await page.locator('#appearance-save').click();
  await page.getByText('Saved to TV. Your draft is clear.',{exact:true}).waitFor();
  assert.equal(state.appearance.background,'google-photo'); assert.equal(state.appearance.ambient.photoSource,'selected');
});
test('expired Photos sessions show restart guidance and retain the saved design', async (t) => {
  const {page,state}=await setup(t);state.failPickerAction='poll';await page.goto(`${baseUrl}/dashboard`);await page.locator('#appearance-content').waitFor({state:'visible'});
  await page.getByText('Colors & background',{exact:true}).click();await page.getByText('Your photo library',{exact:true}).click();await page.getByRole('button',{name:'Choose dashboard photos',exact:true}).click();await page.getByRole('button',{name:'Check selection',exact:true}).click();
  await page.getByText('Photo selection expired. Start again.',{exact:true}).waitFor();assert.equal(state.appearance.background,'photo');assert.equal(await page.getByRole('button',{name:'Choose dashboard photos',exact:true}).isEnabled(),true);
});
test('signing out stops pending photo polls and clears editor data', async (t) => {
  const {page,state}=await setup(t);state.pending=true;await page.goto(`${baseUrl}/dashboard`);await page.locator('#appearance-content').waitFor({state:'visible'});
  await page.getByText('Colors & background',{exact:true}).click();await page.getByText('Your photo library',{exact:true}).click();await page.getByRole('button',{name:'Choose ambient photos',exact:true}).click();await page.getByRole('button',{name:'Check selection',exact:true}).click();
  await page.getByRole('button',{name:'Switch account',exact:true}).click();await page.locator('#appearance-content').waitFor({state:'hidden'});
  const count=state.polls;await page.waitForTimeout(1700);assert.equal(state.polls,count);assert.equal(await page.locator('.saved-photo').count(),0);assert.equal(await page.locator('.picker-link').getAttribute('href'),null);
});
test('favorite app visibility and order save for the chosen TV', async (t) => {
  const {page,state} = await setup(t); await page.goto(`${baseUrl}/account`);
  await page.getByText('Favorite apps',{exact:true}).click(); await page.locator('.apps-content').waitFor({state:'visible'});
  await page.getByLabel('Show favorite apps on dashboard').check(); await page.getByLabel('One',{exact:true}).check(); await page.getByLabel('Two',{exact:true}).check();
  await page.getByRole('button',{name:'Move left: Two',exact:true}).click(); await page.getByRole('button',{name:'Save favorite apps',exact:true}).click();
  await page.getByText('Favorite apps saved to this TV.',{exact:true}).waitFor(); assert.deepEqual(state.apps.preferences,{visible:true,packages:['tv.two','tv.one']});
});
