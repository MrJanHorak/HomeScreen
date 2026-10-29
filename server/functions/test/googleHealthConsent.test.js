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
