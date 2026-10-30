const {test} = require('node:test');
const assert = require('node:assert/strict');
const {google} = require('googleapis');
const database = require('../lib/utils/db');
const {encryptToken, decryptToken} = require('../lib/utils/crypto');
const {fetchGoogleHealthSummary, makeHealthOAuthClient} = require('../lib/services/googleHealthRead');

const now = new Date('2026-10-28T15:00:00Z');
const goals = {stepGoal: 10000, distanceGoal: 8};
function fixture(t) {
  const env = ['TOKEN_ENCRYPTION_KEY', 'GOOGLE_HEALTH_CLIENT_ID', 'GOOGLE_HEALTH_CLIENT_SECRET', 'GOOGLE_HEALTH_REDIRECT_URI'];
  const prior = Object.fromEntries(env.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {TOKEN_ENCRYPTION_KEY: 'key', GOOGLE_HEALTH_CLIENT_ID: 'health-client',
    GOOGLE_HEALTH_CLIENT_SECRET: 'health-secret', GOOGLE_HEALTH_REDIRECT_URI: 'https://api.example/health'});
  t.after(() => {for (const key of env) if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key];});
  const records = new Map([['account_security/user', {version: 2}], ['users/user/activity/googleHealth', {
    provider: 'google-health', revision: 'first', google: {refreshToken: encryptToken('refresh-private')},
  }]]);
  const ref = (path) => ({path, collection: (name) => collection(`${path}/${name}`),
    get: async () => ({data: () => records.get(path)})});
  const collection = (path) => ({doc: (id) => ref(`${path}/${id}`)});
  t.mock.method(database.db, 'collection', collection);
  t.mock.method(database.db, 'runTransaction', async (fn) => {
    const updates = [];
    const value = await fn({get: async (target) => target.get(), update: (target, fields) => updates.push([target.path, fields])});
    for (const [path, fields] of updates) {
      const record = records.get(path);
      records.set(path, {...record, google: {...record.google, accessToken: fields['google.accessToken'], expiryDate: fields['google.expiryDate']}});
    }
    return value;
  });
  return records;
}
const run = () => fetchGoogleHealthSummary('user', 'America/New_York', goals, now);

test('refreshes on demand with the Health client and reuses a valid token', async (t) => {
  fixture(t); let refreshes = 0;
  t.mock.method(google.auth.OAuth2.prototype, 'refreshTokenNoCache', async (token) => {
    refreshes++; assert.equal(token, 'refresh-private');
    return {tokens: {access_token: 'new-access', expiry_date: Date.now() + 3600000}, res: null};
  });
  const client = makeHealthOAuthClient('refresh-private');
  assert.equal(client._clientId, 'health-client');
  assert.equal((await client.getRequestHeaders()).get('authorization'), 'Bearer new-access');
  assert.equal((await client.getRequestHeaders()).get('authorization'), 'Bearer new-access');
  assert.equal(refreshes, 1);
});

test('returns availability and stores a refreshed access token encrypted', async (t) => {
  const records = fixture(t);
  t.mock.method(google.auth.OAuth2.prototype, 'request', async function(options) {
    this.credentials.access_token = 'new-private-access'; this.credentials.expiry_date = Date.now() + 3600000;
    if (options.url.includes('/steps/')) return {data: {rollupDataPoints: [{civilStartTime: {date: {year: 2026, month: 10, day: 28}}, steps: {countSum: '0'}}]}};
    if (options.url.includes('/distance/')) throw {response: {status: 503}};
    return {data: {rollupDataPoints: []}};
  });
  const result = await run();
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.summary.today.steps, {status: 'ok', value: 0});
  assert.equal(result.summary.today.distanceKm.status, 'unavailable');
  assert.equal(result.summary.today.calories.status, 'missing');
  const stored = records.get('users/user/activity/googleHealth');
  assert.equal(decryptToken(stored.google.accessToken), 'new-private-access');
  assert.equal(JSON.stringify(stored).includes('new-private-access'), false);
});

test('expired grants ask for reconnection; transient failures do not', async (t) => {
  fixture(t);
  let failure = {response: {status: 400, data: {error: 'invalid_grant'}}};
  t.mock.method(google.auth.OAuth2.prototype, 'request', async () => {throw failure;});
  assert.deepEqual(await run(), {status: 'reconnect'});
  failure = {response: {status: 503}};
  const result = await run();
  assert.equal(result.status, 'ok');
  assert.equal(result.summary.today.steps.status, 'unavailable');
});

test('discards data and token writes when connection changes during a read', async (t) => {
  const records = fixture(t);
  t.mock.method(google.auth.OAuth2.prototype, 'request', async function() {
    this.credentials.access_token = 'new-private-access'; this.credentials.expiry_date = Date.now() + 3600000;
    records.delete('users/user/activity/googleHealth');
    records.set('account_security/user', {version: 3});
    return {data: {rollupDataPoints: []}};
  });
  assert.deepEqual(await run(), {status: 'unavailable'});
  assert.equal(records.has('users/user/activity/googleHealth'), false);
  assert.deepEqual(await run(), {status: 'not_connected'});
});
