const {test} = require('node:test');
const assert = require('node:assert/strict');
const {completeGoogleHealthConsent, GOOGLE_HEALTH_ACTIVITY_SCOPE} = require('../lib/services/googleHealthConsent');

function setup() {
  const calls = [];
  const tokens = {access_token: 'access', refresh_token: 'refresh', id_token: 'identity', scope: GOOGLE_HEALTH_ACTIVITY_SCOPE};
  const client = {
    verifyIdToken: async (options) => {calls.push(['verify', options]); return {getPayload: () => ({sub: 'subject'})};},
    setCredentials: () => calls.push(['credentials']),
    request: async () => ({data: {healthUserId: 'linked'}}),
  };
  const dependencies = {userMatches: async () => true,
    save: async (...args) => calls.push(['save', ...args])};
  return {calls, tokens, client, dependencies};
}
const run = (s) => completeGoogleHealthConsent(s.client, s.tokens, 'user', 'client-id', 3, 123, s.dependencies);

test('verifies identity and Health link before saving separate credentials', async () => {
  const s = setup();
  assert.equal(await run(s), 'connected');
  assert.deepEqual(s.calls[0], ['verify', {idToken: 'identity', audience: 'client-id'}]);
  assert.equal(s.calls[1][0], 'credentials');
  assert.deepEqual(s.calls[2], ['save', 'user', s.tokens, 3, 123]);
});

test('rejects missing refresh token or Health scope before account or link checks', async () => {
  for (const change of [{refresh_token: null}, {scope: 'openid'}, {id_token: null}]) {
    const s = setup(); Object.assign(s.tokens, change);
    assert.equal(await run(s), 'invalid_grant');
    assert.deepEqual(s.calls, []);
  }
});

test('does not save for mismatched accounts, unlinked accounts or failed Health checks', async () => {
  const mismatch = setup(); mismatch.dependencies.userMatches = async () => false;
  assert.equal(await run(mismatch), 'account_mismatch');
  assert.equal(mismatch.calls.some((call) => call[0] === 'save'), false);
  for (const response of [
    {status: 400, data: {error: {details: [{reason: 'ACCOUNT_NOT_LINKED'}]}}},
    {status: 401}, {status: 503},
  ]) {
    const s = setup(); s.client.request = async () => {throw {response};};
    assert.notEqual(await run(s), 'connected');
    assert.equal(s.calls.some((call) => call[0] === 'save'), false);
  }
});

test('propagates verification and cancelled transaction failures', async () => {
  const invalid = setup(); invalid.client.verifyIdToken = async () => {throw new Error('invalid identity');};
  await assert.rejects(run(invalid), /invalid identity/);
  const cancelled = setup(); cancelled.dependencies.save = async () => {throw new Error('Authorization was cancelled');};
  await assert.rejects(run(cancelled), /cancelled/);
});

test('real storage encrypts a separate grant and rejects a late consent after disconnect', async (t) => {
  const db = require('../lib/utils/db');
  const {decryptToken} = require('../lib/utils/crypto');
  const previous = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = 'fixture-key';
  t.after(() => {if (previous === undefined) delete process.env.TOKEN_ENCRYPTION_KEY; else process.env.TOKEN_ENCRYPTION_KEY = previous;});
  const records = new Map([['account_security/user', {version: 3}], ['users/user/activity/connection', {provider: 'google-fit'}]]);
  const ref = (path) => ({path, collection: (name) => collection(`${path}/${name}`)});
  const collection = (path) => ({doc: (id) => ref(`${path}/${id}`)});
  t.mock.method(db.db, 'collection', collection);
  t.mock.method(db.db, 'runTransaction', async (callback) => {
    const pending = [];
    const result = await callback({get: async (target) => ({data: () => records.get(target.path)}),
      set: (target, value) => pending.push([target.path, value])});
    pending.forEach(([path, value]) => records.set(path, value)); return result;
  });
  t.mock.method(db.auth, 'getUser', async () => ({disabled: false, providerData: [{providerId: 'google.com', uid: 'subject'}]}));
  const s = setup();
  s.tokens.refresh_token = 'fixture-private-refresh-value';
  assert.equal(await completeGoogleHealthConsent(s.client, s.tokens, 'user', 'client-id', 3, 123), 'connected');
  const saved = records.get('users/user/activity/googleHealth');
  assert.equal(decryptToken(saved.google.refreshToken), s.tokens.refresh_token);
  assert.equal(JSON.stringify(saved).includes(s.tokens.refresh_token), false);
  assert.deepEqual(records.get('users/user/activity/connection'), {provider: 'google-fit'});
  records.delete('users/user/activity/googleHealth');
  records.set('account_security/user', {version: 4});
  await assert.rejects(completeGoogleHealthConsent(s.client, s.tokens, 'user', 'client-id', 3, 123), /cancelled/);
  assert.equal(records.has('users/user/activity/googleHealth'), false);
});
