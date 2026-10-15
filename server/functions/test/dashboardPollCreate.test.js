const {test} = require('node:test');
const assert = require('node:assert/strict');
const {auth, db} = require('../lib/utils/db');
const {handlePolls} = require('../lib/polls');
const deviceId = 'd'.repeat(32), requestId = 'a'.repeat(32);
const definition = {question: 'Dinner?', description: '', answerMode: 'choices', options: [{id: 'a', label: 'Pizza'}, {id: 'b', label: 'Soup'}],
  resultsVisibility: 'live', protection: 'browser', moderate: true, defaultDurationMinutes: 15};

function fixture(t) {
  const previous = {TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY, PAIRING_URL: process.env.PAIRING_URL};
  process.env.TOKEN_ENCRYPTION_KEY = 'dashboard-poll-test-key'; process.env.PAIRING_URL = 'https://polls.example.test';
  t.after(() => {for (const [key, value] of Object.entries(previous)) {if (value === undefined) delete process.env[key]; else process.env[key] = value;}});
  const records = new Map([[`users/owner/devices/${deviceId}`, {revokedAtMs: 0, lastSeenAtMs: Date.now(), timeZone: 'America/New_York'}]]);
  const state = {revokeDuringCommit: false};
  const ref = (path) => ({path, id: path.split('/').at(-1), collection: (name) => collection(`${path}/${name}`), get: async () => snapshot(path)});
  const collection = (path) => ({path, doc: (name) => ref(`${path}/${name}`), limit: (limit) => ({path, limit, query: true})});
  const snapshot = (path) => ({exists: records.has(path), data: () => records.get(path)});
  t.mock.method(auth, 'verifyIdToken', async (token) => ({uid: 'owner', firebase: {sign_in_provider: token === 'owner' ? 'google.com' : 'custom'},
    ...(token === 'owner' ? {} : {dashboardDeviceId: deviceId})}));
  t.mock.method(db, 'collection', (name) => collection(name));
  t.mock.method(db, 'runTransaction', async (callback) => {
    const writes = [];
    const result = await callback({
      async get(target) {
        if (target.query) {
          const docs = [...records.entries()].filter(([path]) => path.startsWith(`${target.path}/`) && !path.slice(target.path.length + 1).includes('/'))
            .slice(0, target.limit).map(([path, data]) => ({id: path.split('/').at(-1), data: () => data}));
          return {docs, size: docs.length};
        }
        if (state.revokeDuringCommit && target.path.endsWith(`/devices/${deviceId}`)) return {exists: true, data: () => ({revokedAtMs: 123})};
        return snapshot(target.path);
      },
      create(target, data) {assert.equal(records.has(target.path), false); writes.push([target.path, data]);},
    });
    for (const [path, data] of writes) records.set(path, data);
    return result;
  });
  async function invoke(body = {}, token = 'tv', method = 'POST') {
    const res = {statusCode: 0, body: null, set() {}, status(code) {this.statusCode = code; return this;}, json(value) {this.body = value;}};
    await handlePolls({method, headers: {authorization: `Bearer ${token}`}, body: {action: 'createDashboardPoll', requestId, definition, ...body}}, res);
    return res;
  }
  return {records, state, invoke};
}

test('a linked TV creates an owner-visible template, round and voting link for its own installation', async (t) => {
  const {records, invoke} = fixture(t); const before = Date.now();
  const res = await invoke({referenceDeviceId: 'f'.repeat(32)});
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  const round = records.get(`users/owner/pollRounds/${requestId}`);
  assert.equal(round.referenceDeviceId, deviceId);
  assert.equal(round.timeZone, 'America/New_York');
  assert.ok(round.endsAtMs >= before + 15 * 60000 && round.endsAtMs <= Date.now() + 15 * 60000);
  assert.equal(records.get(`users/owner/pollTemplates/${requestId}`).question, 'Dinner?');
  assert.match(res.body.round.joinUrl, /^https:\/\/polls.example.test\/vote\/[a-f0-9]{48}$/);
  assert.equal(res.body.round.encryptedAccess, undefined);
  assert.equal(res.body.round.accessHash, undefined);
  assert.equal([...records.keys()].filter((path) => path.startsWith('poll_links/')).length, 1);
});

test('lost-response retries create one poll and preserve its link and deadline', async (t) => {
  const {records, invoke} = fixture(t);
  const first = await invoke(), second = await invoke();
  assert.equal(second.statusCode, 200);
  assert.deepEqual(second.body, first.body);
  assert.equal(records.size, 4);
  const changed = await invoke({definition: {...definition, question: 'Changed?'}});
  assert.equal(changed.statusCode, 409);
  assert.equal(records.size, 4);
});

test('invalid, written-answer, invitation and oversized requests create no records', async (t) => {
  const {records, invoke} = fixture(t);
  for (const body of [
    {requestId: '../wrong'}, {definition: {...definition, options: [{id: 'a', label: 'Pizza'}, {id: 'b', label: 'pizza'}]}},
    {definition: {...definition, answerMode: 'written', options: []}}, {definition: {...definition, protection: 'invitation'}},
    {padding: 'x'.repeat(17000)},
  ]) {assert.equal((await invoke(body)).statusCode, 400); assert.equal(records.size, 1);}
});

test('TV creation does not grant other owner actions and rechecks revocation before writing', async (t) => {
  const {records, state, invoke} = fixture(t);
  assert.equal((await invoke({}, 'owner')).statusCode, 403);
  for (const action of ['saveTemplate', 'deleteTemplate', 'startRound', 'close', 'deleteRound']) assert.equal((await invoke({action})).statusCode, 403);
  state.revokeDuringCommit = true;
  assert.equal((await invoke()).statusCode, 410);
  assert.equal(records.size, 1);
  state.revokeDuringCommit = false;
  records.get(`users/owner/devices/${deviceId}`).revokedAtMs = 123;
  assert.equal((await invoke()).statusCode, 401);
});

test('full libraries, deleted accounts and missing link configuration cannot leave partial polls', async (t) => {
  const {records, invoke} = fixture(t);
  for (let i = 0; i < 100; i++) records.set(`users/owner/pollTemplates/${String(i).padStart(32, '0')}`, {});
  assert.equal((await invoke()).statusCode, 400);
  assert.equal(records.size, 101);
  for (const key of [...records.keys()]) if (key.includes('/pollTemplates/')) records.delete(key);
  records.set('account_security/owner', {deleted: true});
  assert.equal((await invoke()).statusCode, 500); assert.equal(records.size, 2);
  records.delete('account_security/owner'); delete process.env.PAIRING_URL;
  assert.equal((await invoke()).statusCode, 500); assert.equal(records.size, 1);
});
