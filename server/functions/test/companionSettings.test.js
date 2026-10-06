const {test} = require('node:test');
const assert = require('node:assert/strict');
const {auth, db} = require('../lib/utils/db');
const {handleUserPreferences} = require('../lib/userPreferences');
const {handleDeviceApps, validAppPreferences} = require('../lib/deviceApps');
const {handleUserAppearance} = require('../lib/userAppearance');
const deviceId = 'b'.repeat(32);
const preferences = {savedLocations: [{id: 'denver', name: 'Home', query: 'Denver, CO, US', isDefault: true}], activeLocationId: 'denver', stepGoal: 8000, distanceGoal: 6};
function req(method, body = {}, query = {}) {return {method, body, query, headers: {authorization: 'Bearer test'}};}
function res() {return {code: 0, body: null, set() {return this;}, status(code) {this.code = code; return this;}, json(body) {this.body = body; return this;}};}
function setup(t, data = {}, claims = {}) {
  t.mock.method(auth, 'verifyIdToken', async () => ({uid: 'owner', firebase: {sign_in_provider: 'google.com'}, ...claims}));
  const writes = [];
  const userRef = {get: async () => ({exists: true, data: () => data}), collection: (name) => name === 'devices' ? devices : {doc: () => ({delete: async () => {}})}};
  const deviceRef = {get: async () => ({exists: true, data: () => ({revokedAtMs: 0, lastSeenAtMs: Date.now()})}), collection: () => ({doc: () => appRef})};
  const appRef = {get: async () => ({exists: !!data.apps, data: () => data.apps})};
  const devices = {doc: (id) => {assert.equal(id, deviceId); return deviceRef;}};
  t.mock.method(db, 'collection', (name) => ({doc: (uid) => {
    if (name === 'users') {assert.equal(uid, 'owner'); return userRef;}
    if (name === 'account_security') return {get: async () => ({data: () => undefined})};
    return {delete: async () => {}};
  }}));
  t.mock.method(db, 'runTransaction', async (fn) => fn({get: (ref) => ref.get(), set: (ref, value, options) => writes.push({ref, value, options}), update: (ref, value) => writes.push({ref,value})}));
  return writes;
}
test('preferences GET exposes only settings, never Google credentials', async (t) => {
  setup(t, {...preferences, preferencesUpdatedAtMs: 12, google: {refreshToken: 'secret'}, googlePhotos: {refreshToken: 'secret'}});
  const result = res(); await handleUserPreferences(req('GET'), result);
  assert.equal(result.code, 200); assert.deepEqual(result.body.preferences, preferences);
  assert.equal(JSON.stringify(result.body).includes('secret'), false);
});
test('weather rejects ambiguous defaults, unknown active cities and stale revisions', async (t) => {
  const writes = setup(t, {preferencesUpdatedAtMs: 12});
  for (const value of [{...preferences, activeLocationId: 'missing'}, {...preferences, savedLocations: preferences.savedLocations.map((loc) => ({...loc, isDefault: false}))}]) {
    const result = res(); await handleUserPreferences(req('PUT', {preferences: value, expectedUpdatedAtMs: 12}), result); assert.equal(result.code,400);
  }
  const result = res(); await handleUserPreferences(req('PUT', {preferences, expectedUpdatedAtMs: 11}), result);
  assert.equal(result.code,409); assert.equal(writes.length,0);
});
test('weather save replaces legacy coordinates and invalidates cached weather', async (t) => {
  const writes = setup(t, {preferencesUpdatedAtMs: 12, location: {lat: 40, lon: 10, units: 'imperial'}});
  const result = res(); await handleUserPreferences(req('PUT', {preferences, expectedUpdatedAtMs: 12}), result);
  assert.equal(result.code,200); assert.deepEqual(writes[0].value.location,{city:'Denver, CO, US',units:'imperial'});
  assert.ok(writes[0].options.mergeFields.includes('location'));
});
test('unsigned settings request fails authentication', async (t) => {
  setup(t); const result = res(); await handleUserPreferences({method:'GET', headers:{}}, result); assert.equal(result.code,401);
});
test('legacy weather defaults and missing active cities normalize on read', async (t) => {
  setup(t,{savedLocations:[{id:'home',name:'Home',query:'Boston'},{id:'cabin',name:'Cabin',query:'Denver'}],activeLocationId:'deleted'});
  const result=res(); await handleUserPreferences(req('GET'),result);
  assert.equal(result.body.preferences.activeLocationId,'home'); assert.equal(result.body.preferences.savedLocations[0].isDefault,true);
});
test('appearance returns photo revision without transferring the media', async (t) => {
  t.mock.method(auth,'verifyIdToken',async()=>({uid:'owner',firebase:{sign_in_provider:'google.com'}}));
  const records={settings:{appearance:{palette:'night'},updatedAtMs:4},background:{dataUrl:'private-image',galleryUpdatedAtMs:11,backgroundUpdatedAtMs:12}};
  t.mock.method(db,'collection',()=>({doc:()=>({collection:()=>({doc:(name)=>({get:async()=>({data:()=>records[name]})})})})}));
  const result=res(); await handleUserAppearance(req('GET'),result);
  assert.equal(result.code,200);assert.equal(result.body.photoUpdatedAtMs,12);assert.equal(JSON.stringify(result.body).includes('private-image'),false);
});
test('favorites validate uniqueness and package bounds', () => {
  assert.equal(validAppPreferences({visible:true, packages:['tv.example']}),true);
  assert.equal(validAppPreferences({visible:true, packages:['tv.example','tv.example']}),false);
  assert.equal(validAppPreferences({visible:true, packages:['../foreign']}),false);
});
test('TV tokens cannot manage a different TV, owners cannot report installed apps', async (t) => {
  setup(t, {}, {dashboardDeviceId:deviceId, firebase:{sign_in_provider:'custom'}});
  const result = res(); await handleDeviceApps(req('GET', {}, {id:'a'.repeat(32)}),result); assert.equal(result.code,403);
});
test('favorites reject stale saves and uninstalled apps', async (t) => {
  const writes = setup(t, {apps:{apps:[{packageName:'tv.example',label:'Example'}],preferences:{visible:false,packages:[]},updatedAtMs:3}});
  for (const [revision, packages, code] of [[2,['tv.example'],409],[3,['tv.missing'],400]]) {
    const result = res(); await handleDeviceApps(req('PUT',{preferences:{visible:true,packages},expectedUpdatedAtMs:revision},{id:deviceId}),result); assert.equal(result.code,code);
  }
  assert.equal(writes.length,0);
});
test('owner saves ordered favorites scoped to the chosen TV', async (t) => {
  const writes = setup(t, {apps:{apps:[{packageName:'tv.example',label:'Example'}],preferences:{visible:false,packages:[]},updatedAtMs:3}});
  const result = res(); await handleDeviceApps(req('PUT',{preferences:{visible:true,packages:['tv.example']},expectedUpdatedAtMs:3},{id:deviceId}),result);
  assert.equal(result.code,200); assert.deepEqual(writes[0].value.preferences,{visible:true,packages:['tv.example']});
});
test('owner cannot upload inventory', async (t) => {
  setup(t); const result = res(); await handleDeviceApps(req('PUT',{apps:[],initialPreferences:{visible:false,packages:[]}},{id:deviceId}),result); assert.equal(result.code,400);
});
test('TV inventory refresh keeps companion favorites instead of reseeding them', async (t) => {
  const stored={visible:true,packages:['tv.example']};
  const writes=setup(t,{apps:{apps:[],preferences:stored,updatedAtMs:7}},{dashboardDeviceId:deviceId,firebase:{sign_in_provider:'custom'}});
  const result=res(); await handleDeviceApps(req('PUT',{apps:[{packageName:'tv.example',label:'Example'}],initialPreferences:{visible:false,packages:[]}},{current:'1'}),result);
  assert.equal(result.code,200);assert.deepEqual(writes[0].value.preferences,stored);assert.equal(result.body.updatedAtMs,7);
});
