const {test} = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../lib/utils/requestAuth');
const db = require('../lib/utils/db');
const read = require('../lib/services/googleHealthRead');
const windows = require('../lib/services/healthCalorieWindows');
const {encryptToken} = require('../lib/utils/crypto');
const {handleGoogleHealthCalorieWindows} = require('../lib/googleHealthCalorieWindows');
const res = () => ({set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body; return this;}, send() {return this;}});

function fixture(t) {
  const prior = {flag: process.env.GOOGLE_HEALTH_OAUTH_ENABLED, key: process.env.TOKEN_ENCRYPTION_KEY};
  process.env.GOOGLE_HEALTH_OAUTH_ENABLED = 'true'; process.env.TOKEN_ENCRYPTION_KEY = 'test-key';
  t.after(() => {for (const [name, value] of Object.entries({GOOGLE_HEALTH_OAUTH_ENABLED: prior.flag, TOKEN_ENCRYPTION_KEY: prior.key})) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }});
  let revision = 'revision';
  const ref = {get: async () => ({data: () => ({revision, google: {refreshToken: encryptToken('private')}})})};
  t.mock.method(db.db, 'collection', () => ({doc: () => ({collection: () => ({doc: () => ref})})}));
  t.mock.method(db.db, 'runTransaction', async (fn) => fn({get: async (target) => target.get()}));
  t.mock.method(db, 'recordUserQuota', async () => true);
  t.mock.method(db, 'getAuthorizationVersion', async () => 1);
  t.mock.method(db, 'assertAuthorizationVersion', async () => {});
  t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: true}));
  t.mock.method(read, 'makeHealthOAuthClient', () => ({}));
  const count = {status: 'ok', higher: 1, lower: 0, similar: 23, missing: 0, baselineZero: 0};
  t.mock.method(windows, 'compareCalorieWindows', async () => ({google: count, wearables: count}));
  return {change() {revision = 'changed';}};
}

test('rejects invalid, future and expired dates and TV sessions', async (t) => {
  fixture(t); const req = (date) => ({method: 'POST', body: {date, timeZone: 'UTC'}});
  for (const date of ['2026-02-30', '2100-01-01', '2020-01-01']) {const out = res(); await handleGoogleHealthCalorieWindows(req(date), out); assert.equal(out.code, 400);}
  t.mock.method(auth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: false}));
  const out = res(); await handleGoogleHealthCalorieWindows(req('2026-10-29'), out); assert.equal(out.code, 403);
});

test('rechecks connection after the read and returns only summary counts', async (t) => {
  const f = fixture(t);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const req = {method: 'POST', body: {date: yesterday, timeZone: 'UTC'}};
  const out = res(); await handleGoogleHealthCalorieWindows(req, out);
  assert.equal(out.code, 200); assert.equal(out.body.hours, 24); assert.equal(out.body.google.higher, 1);
  t.mock.method(windows, 'compareCalorieWindows', async () => {f.change(); return {};});
  const changed = res(); await handleGoogleHealthCalorieWindows(req, changed); assert.equal(changed.code, 503);
});
