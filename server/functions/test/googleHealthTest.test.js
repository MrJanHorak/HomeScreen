const {test} = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../lib/utils/requestAuth');
const db = require('../lib/utils/db');
const reader = require('../lib/services/googleHealthRead');
const {handleGoogleHealthTest} = require('../lib/googleHealthTest');

const response = () => ({set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body; return this;}, send() {return this;}});
const req = (body = {timeZone: 'America/New_York'}) => ({method: 'POST', body});
const day = (i) => ({date: `2026-10-${20 + i}`, steps: {status: 'ok', value: 123456},
  distanceKm: {status: 'missing'}, calories: {status: 'unavailable'}, activeMinutesByLevel: {status: 'ok', value: {LIGHT: 999}}});
function fixture(t) {
  const prior = process.env.GOOGLE_HEALTH_OAUTH_ENABLED;
  process.env.GOOGLE_HEALTH_OAUTH_ENABLED = 'true';
  t.after(() => {if (prior === undefined) delete process.env.GOOGLE_HEALTH_OAUTH_ENABLED; else process.env.GOOGLE_HEALTH_OAUTH_ENABLED = prior;});
  t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: true}));
  t.mock.method(db, 'recordUserQuota', async () => true);
  t.mock.method(reader, 'fetchGoogleHealthSummary', async () => ({status: 'ok', summary: {weekly: Array.from({length: 7}, (_, i) => day(i))}}));
}

test('test read reports only coverage, never values or credentials', async (t) => {
  fixture(t); const res = response(); await handleGoogleHealthTest(req(), res);
  assert.equal(res.code, 200); assert.equal(res.body.status, 'ok');
  assert.deepEqual(res.body.coverage.steps, {available: 7, missing: 0, unavailable: 0, today: 'ok'});
  assert.equal(res.body.coverage.calories.unavailable, 7);
  assert.equal(JSON.stringify(res.body).includes('123456'), false);
  assert.equal(JSON.stringify(res.body).includes('999'), false);
});

test('requires feature flag, owner, valid timezone and quota', async (t) => {
  fixture(t); let res = response(); process.env.GOOGLE_HEALTH_OAUTH_ENABLED = 'false';
  await handleGoogleHealthTest(req(), res); assert.equal(res.code, 404);
  process.env.GOOGLE_HEALTH_OAUTH_ENABLED = 'true';
  t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: false}));
  res = response(); await handleGoogleHealthTest(req(), res); assert.equal(res.code, 403);
  t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: true}));
  res = response(); await handleGoogleHealthTest(req({timeZone: 'not-a-zone'}), res); assert.equal(res.code, 400);
  t.mock.method(db, 'recordUserQuota', async () => false);
  res = response(); await handleGoogleHealthTest(req(), res); assert.equal(res.code, 429);
});

test('reports a revoked grant without returning provider error details', async (t) => {
  fixture(t); t.mock.method(reader, 'fetchGoogleHealthSummary', async () => ({status: 'reconnect'}));
  const res = response(); await handleGoogleHealthTest(req(), res);
  assert.deepEqual(res.body, {status: 'reconnect'});
});

test('explicit refresh check passes the request to the reader and reports its result', async (t) => {
  fixture(t); let options;
  t.mock.method(reader, 'fetchGoogleHealthSummary', async (...args) => {
    options = args[4]; return {status: 'ok', refreshVerified: true, summary: {weekly: Array.from({length: 7}, (_, i) => day(i))}};
  });
  const res = response(); await handleGoogleHealthTest(req({timeZone: 'UTC', forceRefresh: true}), res);
  assert.deepEqual(options, {forceRefresh: true}); assert.equal(res.body.refreshVerified, true);
  const invalid = response(); await handleGoogleHealthTest(req({timeZone: 'UTC', forceRefresh: 'true'}), invalid);
  assert.equal(invalid.code, 400);
});
