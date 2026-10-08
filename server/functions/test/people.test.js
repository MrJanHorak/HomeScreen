const {test} = require('node:test');
const assert = require('node:assert/strict');
const database = require('../lib/utils/db');
const requestAuth = require('../lib/utils/requestAuth');
const sharing = require('../lib/services/activitySharing');
const fit = require('../lib/services/googleFit');
const {activityProfile, ACTIVITY_SCOPES, invitationHash, personId} = require('../lib/utils/people');
const {addPersonWidget, widgetsFromLegacy, validWidgetLayout, legacyWidgetProjection, widgetGridFromRows} = require('../lib/utils/widgets');
const {handlePeople, handlePeopleActivity, sharedPersonActivity, peopleActivityHandler} = require('../lib/people');
const {handleBeginGoogleActivity, beginGoogleActivityHandler} = require('../lib/googlePairing');
const {decryptToken} = require('../lib/utils/crypto');
const profile = {name: 'Alex', stepGoal: 8000, distanceGoal: 6};
const tokens = {accessToken: 'private-access', refreshToken: 'private-refresh', scope: ACTIVITY_SCOPES.join(' ')};

function fixture(t, initial = {}, uid = 'owner', owner = true) {
  const records = new Map(Object.entries(initial));
  const writes = [];
  function ref(path) {
    return {path, id: path.split('/').at(-1), collection: (name) => collection(`${path}/${name}`),
      get: async () => ({id: path.split('/').at(-1), ref: ref(path), exists: records.has(path), data: () => records.get(path)}),
      create: async (data) => {assert.equal(records.has(path), false); records.set(path, data);}};
  }
  function collection(path) {
    return {path, doc: (id) => ref(`${path}/${id}`), where: (field, _op, value) => ({
      limit(n) {this.max = n; return this;},
      async get() {
        const docs = [...records].filter(([key, data]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/') && data[field] === value)
          .slice(0, this.max || Infinity).map(([key, data]) => ({id: key.split('/').at(-1), ref: ref(key), data: () => data}));
        return {docs, size: docs.length, empty: !docs.length};
      },
    })};
  }
  t.mock.method(database.db, 'collection', collection);
  t.mock.method(database.db, 'runTransaction', async (callback) => {
    const pending = [];
    const result = await callback({get: async (target) => {assert.equal(pending.length, 0, 'All transaction reads precede writes'); return target.get();},
      create: (target, data) => {assert.equal(records.has(target.path), false); pending.push([target.path, data]);},
      set: (target, data) => pending.push([target.path, data]),
      update: (target, data) => pending.push([target.path, {...records.get(target.path), ...data}]),
      delete: (target) => pending.push([target.path, undefined])});
    for (const [path, data] of pending) {if (data === undefined) records.delete(path); else records.set(path, data); writes.push(path);}
    return result;
  });
  t.mock.method(database.db, 'batch', () => {const targets = []; return {delete: (target) => targets.push(target.path), commit: async () => targets.forEach((path) => records.delete(path))};});
  t.mock.method(database.db, 'recursiveDelete', async (target) => {for (const path of records.keys()) if (path.startsWith(`${target.path}/`)) records.delete(path);});
  t.mock.method(requestAuth, 'authenticatedIdentity', async () => ({userId: uid, owner, deviceId: owner ? null : 'd'.repeat(32), authTimeSeconds: Math.floor(Date.now() / 1000)}));
  t.mock.method(database, 'recordUserQuota', async () => true);
  t.mock.method(database.auth, 'getUser', async () => ({displayName: 'Jordan Household'}));
  t.mock.method(console, 'error', () => {});
  const previous = {key: process.env.TOKEN_ENCRYPTION_KEY, url: process.env.PAIRING_URL, client: process.env.GOOGLE_CLIENT_ID, redirect: process.env.GOOGLE_REDIRECT_URI};
  process.env.TOKEN_ENCRYPTION_KEY = 'test-secret'; process.env.PAIRING_URL = 'https://dashboard.example/pair';
  process.env.GOOGLE_CLIENT_ID = 'fixture-client'; process.env.GOOGLE_REDIRECT_URI = 'https://api.example/callback';
  t.after(() => {for (const [key, value] of Object.entries({TOKEN_ENCRYPTION_KEY: previous.key, PAIRING_URL: previous.url, GOOGLE_CLIENT_ID: previous.client, GOOGLE_REDIRECT_URI: previous.redirect})) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }});
  return {records, writes};
}
const request = (method = 'GET', body = {}, query = {}, zone = 'America/New_York') => ({method, body, query, headers: {}, header: () => zone});
const response = () => ({set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body; return this;}});
const authTime = () => Math.floor(Date.now() / 1000);
async function join(t, initial = {}) {
  const f = fixture(t, initial);
  const invitation = await sharing.createActivityInvitation('owner');
  await sharing.saveActivityConsent('alex', tokens, 0, authTime(), profile, invitation.id);
  return {...f, invitation, id: personId('owner', 'alex')};
}

test('activity profile bounds reject control characters and invalid goals; identities do not collide across dashboards', () => {
  assert.deepEqual(activityProfile({...profile, name: ' Alex '}), profile);
  for (const change of [{name: ''}, {name: 'a\0b'}, {name: 'x'.repeat(41)}, {stepGoal: 99}, {stepGoal: 1.5}, {distanceGoal: NaN}, {distanceGoal: 201}]) assert.equal(activityProfile({...profile, ...change}), null);
  assert.notEqual(personId('ab', 'c'), personId('a', 'bc'));
  assert.notEqual(personId('owner', 'alex'), personId('other', 'alex'));
});
test('single-use invitations store only the hash and consent writes encrypted participant credentials without changing the TV account', async (t) => {
  const f = await join(t, {'users/owner': {google: {refreshToken: 'owner-unchanged'}}});
  const token = new URL(f.invitation.url).searchParams.get('invite');
  assert.equal(invitationHash(token), f.invitation.id);
  assert.equal(f.records.has(`activity_invitations/${f.invitation.id}`), false);
  const connection = f.records.get('users/alex/activity/connection');
  assert.equal(decryptToken(connection.google.refreshToken), tokens.refreshToken);
  assert.equal(JSON.stringify(connection).includes(tokens.refreshToken), false);
  assert.equal(f.records.get('users/owner').google.refreshToken, 'owner-unchanged');
  assert.equal(f.records.get(`activity_shares/${f.id}`).name, 'Alex');
  await assert.rejects(sharing.saveActivityConsent('someone', tokens, 0, authTime(), profile, f.invitation.id), /unavailable/);
  assert.equal(f.records.has('users/someone/activity/connection'), false);
});
test('expired, cancelled, self, capacity-limited and deleted-owner invitations cannot write credentials', async (t) => {
  const f = fixture(t); const invitation = await sharing.createActivityInvitation('owner');
  const path = `activity_invitations/${invitation.id}`; const saved = f.records.get(path);
  f.records.set(path, {...saved, expiresAtMs: Date.now()});
  await assert.rejects(sharing.saveActivityConsent('alex', tokens, 0, authTime(), profile, invitation.id), /unavailable/);
  f.records.set(path, saved);
  await assert.rejects(sharing.saveActivityConsent('owner', tokens, 0, authTime(), profile, invitation.id), /unavailable/);
  f.records.set('account_security/owner', {version: 1, deleted: true});
  await assert.rejects(sharing.saveActivityConsent('alex', tokens, 0, authTime(), profile, invitation.id), /cancelled/);
  f.records.delete('account_security/owner');
  for (let i = 0; i < 12; i++) f.records.set(`activity_shares/${i}`, {dashboardId: 'owner', userId: `user${i}`});
  await assert.rejects(sharing.saveActivityConsent('alex', tokens, 0, authTime(), profile, invitation.id), /limit/);
  assert.equal(f.records.has('users/alex/activity/connection'), false);
  f.records.delete(path);
  await assert.rejects(sharing.readActivityInvitation(invitation.id), /expired/);
});
test('missing activity scope and participant disconnect cancel credential writes', async (t) => {
  const f = fixture(t); const invitation = await sharing.createActivityInvitation('owner');
  await assert.rejects(sharing.saveActivityConsent('alex', {...tokens, scope: ACTIVITY_SCOPES[0]}, 0, authTime(), profile, invitation.id), /permissions/);
  await database.invalidatePendingAuthorizations('alex');
  await assert.rejects(sharing.saveActivityConsent('alex', tokens, 0, authTime(), profile, invitation.id), /cancelled/);
  assert.equal(f.records.has('users/alex/activity/connection'), false);
});
test('activity consent requests only activity scopes, requires explicit sharing consent and disallows TV sessions', async (t) => {
  const f = fixture(t, {}, 'alex'); const res = response();
  await handleBeginGoogleActivity(request('POST', {...profile, consent: true}), res);
  assert.equal(res.code, 200);
  const scopes = new URL(res.body.authorizationUrl).searchParams.get('scope').split(' ');
  assert.deepEqual(scopes, ['openid', 'email', ...ACTIVITY_SCOPES]);
  assert.equal([...f.records.keys()].filter((key) => key.startsWith('oauth_states/')).length, 1);
  const denied = response(); await handleBeginGoogleActivity(request('POST', profile), denied); assert.equal(denied.code, 400);
  t.mock.method(requestAuth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: false}));
  const tv = response(); await handleBeginGoogleActivity(request('POST', {...profile, consent: true}), tv); assert.equal(tv.code, 403);
});
test('participants and dashboard owners can revoke a share, while other accounts and another TV cannot', async (t) => {
  const f = await join(t);
  await assert.rejects(sharing.removeActivityShare(f.id, 'stranger', true), /unavailable/);
  await assert.rejects(sharing.removeActivityShare(f.id, 'alex', false), /unavailable/);
  await sharing.removeActivityShare(f.id, 'alex', true);
  assert.equal(f.records.has(`activity_shares/${f.id}`), false);
  assert.equal(f.records.has('users/alex/activity/connection'), true);
});
test('removal during an upstream fetch filters shared activity out of the final response', async (t) => {
  const f = await join(t);
  t.mock.method(fit, 'fetchHealthData', async () => {f.records.delete(`activity_shares/${f.id}`); return {status: 'ok', steps: 12345};});
  const res = response(); await handlePeopleActivity(request(), res);
  assert.equal(res.code, 200); assert.deepEqual(res.body.people, []);
});
test('disconnect during a refresh cannot recreate credentials or caches or return shared data', async (t) => {
  const f = await join(t);
  t.mock.method(fit, 'fetchHealthData', async () => {
    await database.invalidatePendingAuthorizations('alex'); await sharing.clearActivitySharing('alex');
    return {status: 'ok', steps: 12345};
  });
  const res = response(); await handlePeopleActivity(request(), res);
  assert.equal(res.code, 200); assert.deepEqual(res.body.people, []);
  assert.equal([...f.records.keys()].some((key) => key.startsWith('users/alex/activity/')), false);
});
test('per-person/timezone caches preserve individual goals and are never sent with credentials or Firebase identities', async (t) => {
  await join(t);
  t.mock.method(fit, 'fetchHealthData', async (_tokens, goals, zone) => ({status: 'ok', steps: 8000, stepGoal: goals.stepGoal, distanceGoal: goals.distanceGoal, zone}));
  await sharedPersonActivity('alex', 'America/New_York');
  await sharedPersonActivity('alex', 'America/New_York');
  await sharedPersonActivity('alex', 'Europe/London');
  assert.equal(fit.fetchHealthData.mock.calls.length, 2);
  const res = response(); await handlePeopleActivity(request(), res);
  assert.equal(res.body.people[0].health.stepGoal, 8000);
  assert.equal(res.body.people[0].name, 'Alex');
  assert.equal(JSON.stringify(res.body).includes('private-'), false);
  assert.equal(res.body.people[0].userId, undefined);
});
test('account deletion clears both owned and contributed shares, invitations, credentials and health caches', async (t) => {
  const f = await join(t);
  f.records.set('activity_shares/other', {dashboardId: 'alex', userId: 'someone'});
  f.records.set('activity_invitations/pending', {dashboardId: 'alex'});
  await sharing.clearActivitySharing('alex', true);
  assert.equal([...f.records.keys()].some((key) => key.startsWith('activity_shares/') || key.startsWith('activity_invitations/') || key.startsWith('users/alex/activity/')), false);
});
test('People endpoint hides participant controls from TV sessions and requires authentication', async (t) => {
  await join(t);
  t.mock.method(requestAuth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: false}));
  const tv = response(); await handlePeople(request(), tv);
  assert.equal(tv.body.people.length, 1); assert.deepEqual(tv.body.sharing, []); assert.equal(tv.body.connection, null);
  t.mock.method(requestAuth, 'authenticatedIdentity', async () => null);
  const anonymous = response(); await handlePeople(request(), anonymous); assert.equal(anonymous.code, 401);
});
test('named activity widgets have independent geometry and never replace owner activity on older TVs', () => {
  const cards = ['weather', 'activity'].map((id) => ({id, visible: true, size: 'standard'}));
  let layout = widgetsFromLegacy(cards, null);
  layout = addPersonWidget(layout, 'a'.repeat(32)); layout = addPersonWidget(layout, 'b'.repeat(32));
  assert.equal(validWidgetLayout({...layout, grid: widgetGridFromRows(layout.widgets)}), true);
  assert.throws(() => addPersonWidget(layout, 'a'.repeat(32)), /already/);
  assert.equal(validWidgetLayout({...layout, widgets: layout.widgets.map((w) => w.personId ? {...w, id: 'activity'} : w)}), false);
  const legacy = legacyWidgetProjection({...layout, widgets: layout.widgets.filter((w) => w.personId)});
  assert.equal(legacy.cards.find((c) => c.id === 'activity').visible, false);
  assert.equal(legacy.cards.some((c) => c.id.includes('activity_')), false);
});
test('only the feed needs provider secrets; the OAuth callback retains encrypted token storage', () => {
  assert.ok(peopleActivityHandler.__endpoint.secretEnvironmentVariables.some((s) => s.key === 'TOKEN_ENCRYPTION_KEY'));
  assert.equal(beginGoogleActivityHandler.__endpoint.secretEnvironmentVariables, undefined);
});
