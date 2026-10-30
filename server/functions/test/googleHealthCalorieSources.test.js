const {test} = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../lib/utils/requestAuth');
const db = require('../lib/utils/db');
const health = require('../lib/services/googleHealthRead');
const {handleGoogleHealthCalorieSources, sourceDifference} = require('../lib/googleHealthCalorieSources');
const ok = (value) => ({status: 'ok', value});
const response = () => ({set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body; return this;}, send() {return this;}});

function fixture(t) {
  const previous = process.env.GOOGLE_HEALTH_OAUTH_ENABLED;
  process.env.GOOGLE_HEALTH_OAUTH_ENABLED = 'true';
  t.after(() => {if (previous === undefined) delete process.env.GOOGLE_HEALTH_OAUTH_ENABLED; else process.env.GOOGLE_HEALTH_OAUTH_ENABLED = previous;});
  let revision = 'first';
  const ref = {get: async () => ({data: () => ({revision})})};
  t.mock.method(db.db, 'collection', () => ({doc: () => ({collection: () => ({doc: () => ref})})}));
  t.mock.method(db.db, 'runTransaction', async (fn) => fn({get: async (target) => target.get()}));
  t.mock.method(db, 'recordUserQuota', async () => true);
  t.mock.method(db, 'getAuthorizationVersion', async () => 1);
  t.mock.method(db, 'assertAuthorizationVersion', async () => {});
  t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: true}));
  const calls = [];
  t.mock.method(health, 'fetchGoogleHealthSummary', async (...args) => {
    calls.push(args[4]); const values = {'all-sources': ok(1000), 'google-sources': ok(900), 'google-wearables': {status: 'missing'}};
    return {status: 'ok', summary: {today: {date: '2026-10-30'}, weekly: [{date: '2026-10-29', calories: values[args[4].sourceFamily]},
      {date: '2026-10-30', calories: ok(2000)}]}};
  });
  return {calls, change: () => {revision = 'changed';}};
}
const request = {method: 'POST', body: {timeZone: 'America/New_York'}};

test('compares only completed dates across documented source families without raw values', async (t) => {
  const f = fixture(t); const res = response(); await handleGoogleHealthCalorieSources(request, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, {status: 'ok', days: [{date: '2026-10-29', google: {status: 'compared', percent: -10}, wearables: {status: 'missing'}}]});
  assert.deepEqual(f.calls.map((item) => item.sourceFamily), ['all-sources', 'google-sources', 'google-wearables']);
  assert.equal(f.calls.every((item) => item.caloriesOnly), true);
  assert.equal(JSON.stringify(res.body).includes('1000'), false);
});

test('distinguishes zero, missing and unavailable from a numeric difference', () => {
  assert.deepEqual(sourceDifference(ok(0), ok(0)), {status: 'baseline_zero'});
  assert.deepEqual(sourceDifference(ok(5), {status: 'missing'}), {status: 'baseline_missing'});
  assert.deepEqual(sourceDifference({status: 'unavailable'}, ok(5)), {status: 'unavailable'});
  assert.deepEqual(sourceDifference(ok(0), ok(5)), {status: 'compared', percent: -100});
});

test('rejects TV access and discards data if the connection changes', async (t) => {
  const f = fixture(t); t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: false}));
  const denied = response(); await handleGoogleHealthCalorieSources(request, denied); assert.equal(denied.code, 403);
  t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: true}));
  t.mock.method(health, 'fetchGoogleHealthSummary', async () => {f.change(); return {status: 'unavailable'};});
  const cancelled = response(); await handleGoogleHealthCalorieSources(request, cancelled); assert.equal(cancelled.code, 503);
});
