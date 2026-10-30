const {test} = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../lib/utils/requestAuth');
const db = require('../lib/utils/db');
const fit = require('../lib/services/googleFit');
const health = require('../lib/services/googleHealthRead');
const {encryptToken} = require('../lib/utils/crypto');
const {handleGoogleHealthComparison} = require('../lib/googleHealthComparison');
const res = () => ({set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body; return this;}, send() {return this;}});
const req = () => ({method: 'POST', body: {timeZone: 'America/New_York'}});

function fixture(t) {
  const prior = {flag: process.env.GOOGLE_HEALTH_OAUTH_ENABLED, key: process.env.TOKEN_ENCRYPTION_KEY};
  process.env.GOOGLE_HEALTH_OAUTH_ENABLED = 'true'; process.env.TOKEN_ENCRYPTION_KEY = 'test-key';
  t.after(() => {for (const [name, value] of Object.entries({GOOGLE_HEALTH_OAUTH_ENABLED: prior.flag, TOKEN_ENCRYPTION_KEY: prior.key})) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }});
  const data = new Map([['users/owner', {google: {refreshToken: encryptToken('fit-private')}}],
    ['users/owner/activity/googleHealth', {revision: 'revision'}]]);
  const ref = (path) => ({path, collection: (name) => collection(`${path}/${name}`), get: async () => ({data: () => data.get(path)})});
  const collection = (path) => ({doc: (id) => ref(`${path}/${id}`)});
  t.mock.method(db.db, 'collection', collection);
  t.mock.method(db.db, 'runTransaction', async (fn) => fn({get: async (target) => target.get()}));
  t.mock.method(db, 'recordUserQuota', async () => true);
  t.mock.method(db, 'getAuthorizationVersion', async () => 1);
  t.mock.method(db, 'assertAuthorizationVersion', async () => {});
  t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: true}));
  const d = '2026-10-27'; const metric = (value) => ({status: 'ok', value});
  t.mock.method(fit, 'fetchHealthData', async () => ({status: 'ok', weekly: [{date: d, steps: 100, distance: 1, calories: 200}]}));
  t.mock.method(health, 'fetchGoogleHealthSummary', async () => ({status: 'ok', summary: {today: {date: '2026-10-28'},
    weekly: [{date: d, steps: metric(110), distanceKm: metric(2), calories: metric(300)}]}}));
  return data;
}

test('returns only per-day percentages for the authenticated owner', async (t) => {
  fixture(t); const response = res(); await handleGoogleHealthComparison(req(), response);
  assert.equal(response.code, 200); assert.equal(response.body.days[0].steps.percent, 10);
  assert.equal(JSON.stringify(response.body).includes('fit-private'), false);
  assert.equal(JSON.stringify(response.body).includes('110'), false);
});

test('rejects TV sessions and discards results if consent changes during the read', async (t) => {
  const data = fixture(t);
  t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: false}));
  const denied = res(); await handleGoogleHealthComparison(req(), denied); assert.equal(denied.code, 403);
  t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: true}));
  t.mock.method(fit, 'fetchHealthData', async () => {data.delete('users/owner/activity/googleHealth'); return {status: 'ok', weekly: []};});
  const cancelled = res(); await handleGoogleHealthComparison(req(), cancelled); assert.equal(cancelled.code, 503);
  assert.equal(cancelled.body.days, undefined);
});
