const {test} = require('node:test');
const assert = require('node:assert/strict');
const {checkGoogleHealthConnection} = require('../lib/services/googleHealthConnection');

test('checks Health account linkage without returning the identifier', async () => {
  let options;
  const result = await checkGoogleHealthConnection({request: async (input) => {
    options = input; return {data: {healthUserId: 'user-123'}};
  }});
  assert.equal(result, 'linked');
  assert.equal(options.url, 'https://health.googleapis.com/v4/users/me/identity');
  assert.equal(options.method, 'GET');
  assert.equal(options.timeout, 15000);
  assert.equal(await checkGoogleHealthConnection({request: async () => ({data: {}})}), 'unavailable');
});

test('distinguishes unlinked accounts and authorization failures from other errors', async () => {
  const failing = (response) => ({request: async () => {throw {response};}});
  assert.equal(await checkGoogleHealthConnection(failing({status: 400, data: {error: {details: [{reason: 'ACCOUNT_NOT_LINKED'}]}}})), 'not_linked');
  assert.equal(await checkGoogleHealthConnection(failing({status: 401})), 'unauthorized');
  assert.equal(await checkGoogleHealthConnection(failing({status: 403})), 'unauthorized');
  assert.equal(await checkGoogleHealthConnection(failing({status: 503})), 'unavailable');
  assert.equal(await checkGoogleHealthConnection(failing({status: 400})), 'unavailable');
});
