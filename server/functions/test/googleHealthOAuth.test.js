const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {google} = require('googleapis');
const database = require('../lib/utils/db');
const requestAuth = require('../lib/utils/requestAuth');
const consent = require('../lib/services/googleHealthConsent');
const {handleBeginGoogleHealth, handleGoogleHealthOAuthCallback, consumeHealthState} = require('../lib/googleHealthOAuth');

const response = () => ({set() {}, status(code) {this.code = code; return this;},
  json(body) {this.body = body; return this;}, send(body) {this.body = body; return this;},
  redirect(code, url) {this.code = code; this.url = url; return this;}});
const request = (method, body = {}, query = {}) => ({method, body, query});
function fixture(t) {
  const records = new Map();
  const keys = ['GOOGLE_HEALTH_OAUTH_ENABLED', 'GOOGLE_HEALTH_CLIENT_ID', 'GOOGLE_HEALTH_CLIENT_SECRET', 'GOOGLE_HEALTH_REDIRECT_URI', 'PAIRING_URL'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {GOOGLE_HEALTH_OAUTH_ENABLED: 'true', GOOGLE_HEALTH_CLIENT_ID: 'health-client',
    GOOGLE_HEALTH_CLIENT_SECRET: 'secret', GOOGLE_HEALTH_REDIRECT_URI: 'https://api.example/health-callback', PAIRING_URL: 'https://site.example/pair'});
  t.after(() => {for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];});
  const ref = (path) => ({path, create: async (data) => {assert.equal(records.has(path), false); records.set(path, data);}});
  t.mock.method(database.db, 'collection', (name) => ({doc: (id) => ref(`${name}/${id}`)}));
  t.mock.method(database.db, 'runTransaction', async (callback) => {
    const deletes = [];
    const result = await callback({get: async (target) => ({exists: records.has(target.path), data: () => records.get(target.path)}),
      delete: (target) => deletes.push(target.path)});
    deletes.forEach((path) => records.delete(path)); return result;
  });
  t.mock.method(database, 'recordUserQuota', async () => true);
  t.mock.method(database, 'getAuthorizationVersion', async () => 4);
  t.mock.method(requestAuth, 'authenticatedIdentity', async () => ({userId: 'user', owner: true, authTimeSeconds: 123}));
  t.mock.method(console, 'error', () => {});
  return records;
}
const statePath = (state) => `health_oauth_states/${crypto.createHash('sha256').update(state).digest('hex')}`;

test('start requires explicit consent, an owner session and the feature flag', async (t) => {
  const records = fixture(t);
  process.env.GOOGLE_HEALTH_OAUTH_ENABLED = 'false';
  let res = response(); await handleBeginGoogleHealth(request('POST', {consent: true}), res); assert.equal(res.code, 404);
  process.env.GOOGLE_HEALTH_OAUTH_ENABLED = 'true';
  res = response(); await handleBeginGoogleHealth(request('POST'), res); assert.equal(res.code, 400);
  t.mock.method(requestAuth, 'authenticatedIdentity', async () => ({userId: 'user', owner: false}));
  res = response(); await handleBeginGoogleHealth(request('POST', {consent: true}), res); assert.equal(res.code, 403);
  assert.equal(records.size, 0);
});

test('start creates separate hashed state, PKCE, and only the Health activity scope', async (t) => {
  const records = fixture(t); const res = response();
  await handleBeginGoogleHealth(request('POST', {consent: true}), res);
  assert.equal(res.code, 200);
  const url = new URL(res.body.authorizationUrl); const state = url.searchParams.get('state');
  assert.equal(url.searchParams.get('client_id'), 'health-client');
  assert.deepEqual(url.searchParams.get('scope').split(' '), ['openid', 'email', consent.GOOGLE_HEALTH_ACTIVITY_SCOPE]);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  const record = records.get(statePath(state));
  assert.equal(url.searchParams.get('code_challenge'), crypto.createHash('sha256').update(record.codeVerifier).digest('base64url'));
  assert.equal(record.authorizationVersion, 4);
  assert.equal(JSON.stringify([...records]).includes(state), false);
  assert.equal((await consumeHealthState(state)).userId, 'user');
  assert.equal(await consumeHealthState(state), null);
});

test('expired and cancelled states are consumed and never exchange a code', async (t) => {
  const records = fixture(t); const state = 's'.repeat(43); const path = statePath(state);
  records.set(path, {expiresAt: Date.now() - 1, authTimeSeconds: 123});
  assert.equal(await consumeHealthState(state), null); assert.equal(records.has(path), false);
  records.set(path, {expiresAt: Date.now() + 1000, authTimeSeconds: 123});
  const res = response(); await handleGoogleHealthOAuthCallback(request('GET', {}, {state, error: 'access_denied'}), res);
  assert.equal(res.code, 303); assert.equal(res.url, 'https://site.example/people?result=health_test_denied'); assert.equal(records.has(path), false);
});

test('callback exchanges with stored verifier once and reports only a staged connection', async (t) => {
  const records = fixture(t); const state = 'x'.repeat(43);
  records.set(statePath(state), {userId: 'user', authorizationVersion: 4, authTimeSeconds: 123,
    codeVerifier: 'verifier', expiresAt: Date.now() + 60000});
  let exchange;
  t.mock.method(google.auth.OAuth2.prototype, 'getToken', async (options) => {exchange = options; return {tokens: {access_token: 'private'}};});
  let completion;
  t.mock.method(consent, 'completeGoogleHealthConsent', async (...args) => {completion = args; return 'connected';});
  const res = response(); await handleGoogleHealthOAuthCallback(request('GET', {}, {state, code: 'code'}), res);
  assert.equal(res.code, 303); assert.equal(res.url, 'https://site.example/people?result=health_test_connected');
  assert.deepEqual(exchange, {code: 'code', codeVerifier: 'verifier'});
  assert.deepEqual(completion.slice(2), ['user', 'health-client', 4, 123]);
  assert.equal(res.url.includes('private'), false);
  const replay = response(); await handleGoogleHealthOAuthCallback(request('GET', {}, {state, code: 'code'}), replay);
  assert.equal(replay.code, 400);
});
