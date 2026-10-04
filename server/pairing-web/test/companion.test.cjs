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
async function setup(t) {
  const context = await browser.newContext({viewport:{width:390,height:844}}); t.after(() => context.close());
  const state = {preferences:{savedLocations:[{id:'ny',name:'New York',query:'New York, US',isDefault:true}],activeLocationId:'ny',stepGoal:10000,distanceGoal:8},revision:1,
    appearance:structuredClone(appearance), appearanceRevision:1, library:{updatedAtMs:0,designs:[],draft:null}, apps:{apps:[{packageName:'tv.one',label:'One'},{packageName:'tv.two',label:'Two'}],preferences:{visible:false,packages:[]},updatedAtMs:1}, photoPurpose:null, selected:false, writes:[]};
  await context.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/firebase_app.js*', (route) => route.fulfill({contentType:'application/javascript',body:'export class FirebaseError extends Error {}; export const initializeApp = () => ({});'}));
  await context.route('**/firebase_auth.js*', (route) => route.fulfill({contentType:'application/javascript',body:`const auth = {currentUser:{email:'owner@example.com',getIdToken:async ()=>'fixture-token'}}; let callback;
    export const getAuth=()=>auth; export class GoogleAuthProvider {}; export const getRedirectResult=async()=>null;
    export const onAuthStateChanged=(_auth,fn)=>{callback=fn; queueMicrotask(fn);}; export const signInWithRedirect=async()=>{};
    export const signOut=async()=>{auth.currentUser=null;callback();};`}));
  await context.route('https://photos.google.com/**', (route) => route.fulfill({body:'Mock Google picker',contentType:'text/html'}));
  await context.route('https://accounts.google.com/**', (route) => route.fulfill({body:'Mock Google consent',contentType:'text/html'}));
  await context.route('**cloudfunctions.net/**', async (route) => {
    const request = route.request(); const url = new URL(request.url()); const endpoint = url.pathname.split('/').pop(); const body = request.postDataJSON();
    let result = {}; let status = 200;
    if (request.method() === 'OPTIONS') return route.fulfill({status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET, PUT, POST, DELETE'}});
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
    } else if (endpoint === 'accountSecurity') result={connections:{dashboardGoogle:true,mealSheet:true,photos:true}};
    else if (endpoint === 'mealSheetConfig') result={authorized:true,spreadsheetTitle:'Weekly dinners'};
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
  for (const route of ['pair','dashboard','settings','meals','account']) {
    for (const width of [320,390,768,1024,1440]) {
      await page.setViewportSize({width,height:900}); await page.goto(`${baseUrl}/${route}`);
      await page.waitForFunction(()=>document.querySelector('#account-name')?.textContent === 'owner@example.com');
      if (route === 'dashboard') await page.locator('#appearance-content').waitFor({state:'visible'});
      if (route === 'dashboard') assert.equal(await page.evaluate(() => document.querySelector('.editor-actions').getBoundingClientRect().top >= document.querySelector('.studio-workspace').getBoundingClientRect().bottom),true,'Publish controls must not cover the editing workspace');
      if (route === 'settings') await page.locator('.weather-content').waitFor({state:'visible'});
      const dimensions = await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
      assert.ok(dimensions.scroll <= dimensions.width+1, `${route} overflows at ${width}: ${dimensions.scroll}`);
      assert.equal(await page.locator('.site-nav [aria-current=page]').count(),1);
      if (process.env.COMPANION_SCREENSHOTS && [390,768,1440].includes(width)) {
        await fs.mkdir(process.env.COMPANION_SCREENSHOTS,{recursive:true});
        await page.screenshot({path:path.join(process.env.COMPANION_SCREENSHOTS,`${route}-${width}.png`),fullPage:true});
      }
    }
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
  await page.getByText('4 · Ambient mode',{exact:true}).click(); await page.locator('#ambient-idle').selectOption('20'); await page.locator('#ambient-source').selectOption('plasma'); await page.locator('#ambient-preset').selectOption('Sunset');
  await page.locator('#appearance-save').click(); await page.getByText('Saved to TV. Your draft is clear.',{exact:true}).waitFor();
  assert.equal(state.appearance.ambient.idleMinutes,20); assert.equal(state.appearance.ambient.plasmaColors[0],'#E8795B');
  await page.getByText('Photos · choose images for your TV',{exact:true}).click();
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
  await page.getByText('Photos · choose images for your TV',{exact:true}).click();await page.getByRole('button',{name:'Choose dashboard photos',exact:true}).click();await page.getByRole('button',{name:'Check selection',exact:true}).click();
  await page.getByText('Photo selection expired. Start again.',{exact:true}).waitFor();assert.equal(state.appearance.background,'photo');assert.equal(await page.getByRole('button',{name:'Choose dashboard photos',exact:true}).isEnabled(),true);
});
test('signing out stops pending photo polls and clears editor data', async (t) => {
  const {page,state}=await setup(t);state.pending=true;await page.goto(`${baseUrl}/dashboard`);await page.locator('#appearance-content').waitFor({state:'visible'});
  await page.getByText('Photos · choose images for your TV',{exact:true}).click();await page.getByRole('button',{name:'Choose ambient photos',exact:true}).click();await page.getByRole('button',{name:'Check selection',exact:true}).click();
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
