const {test} = require('node:test');
const assert = require('node:assert/strict');
const {auth, db} = require('../lib/utils/db');
const {handlePollFeed, handlePolls} = require('../lib/polls');

test('linked TVs can list existing non-archived poll cards without receiving ballots or poll management access', async (t) => {
  const deviceId = 'a'.repeat(32);
  t.mock.method(auth, 'verifyIdToken', async () => ({uid: 'owner', dashboardDeviceId: deviceId, firebase: {sign_in_provider: 'custom'}}));
  const rounds = ['open', 'closed', 'archived'].map((state, index) => ({id: String(index).repeat(32),
    data: () => ({state, question: `${state} poll`, privateBallots: ['private'], invitationHash: 'secret'})}));
  const device = {get: async () => ({exists: true, data: () => ({revokedAtMs: 0, lastSeenAtMs: Date.now(), widgetLayoutVersion: 1})})};
  t.mock.method(db, 'collection', (name) => {
    assert.equal(name, 'users');
    return {doc(uid) {
      assert.equal(uid, 'owner');
      return {collection(child) {
        if (child === 'devices') return {doc(id) {assert.equal(id, deviceId); return device;}};
        if (child === 'appearance') return {doc: () => ({get: async () => ({data: () => ({})})})};
        assert.equal(child, 'pollRounds');
        return {orderBy(field, order) {assert.equal(field, 'createdAtMs'); assert.equal(order, 'desc');
          return {limit(size) {assert.equal(size, 100); return {get: async () => ({docs: rounds})};}};
        }};
      }};
    }};
  });
  const response = () => ({code: 0, body: null, set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body;}});
  const request = {method: 'GET', headers: {authorization: 'Bearer tv'}, query: {available: '1'}};
  const result = response();
  await handlePollFeed(request, result);
  assert.equal(result.code, 200);
  assert.deepEqual(result.body, {polls: rounds.slice(0, 2).map((round) => ({id: round.id, question: round.data().question}))});
  const management = response();
  await handlePolls(request, management);
  assert.equal(management.code, 403);
  const unsigned = response();
  await handlePollFeed({...request, headers: {}}, unsigned);
  assert.equal(unsigned.code, 401);
});
