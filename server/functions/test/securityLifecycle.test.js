const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {FieldValue} = require('firebase-admin/firestore');
const database = require('../lib/utils/db');
const requestAuth = require('../lib/utils/requestAuth');
const {encryptToken, decryptToken} = require('../lib/utils/crypto');
const {consumeState, handleBeginGoogleLink} = require('../lib/googlePairing');
const {downloadPhoto} = require('../lib/googlePhotosPicker');
const {handleAccountSecurity} = require('../lib/accountSecurity');

/** An atomic fixture: failed transactions commit nothing and reads precede writes. */
function fixture(t, initial = {}) {
  const records = new Map(Object.entries(initial));
  const writes = [];
  function ref(path) {
    return {path, collection: (name) => collection(`${path}/${name}`),
      get: async () => ({exists: records.has(path), data: () => records.get(path)})};
  }
  function collection(path) {
    return {doc: (id) => ref(`${path}/${id}`), where: (field, _operator, value) => ({
      limit() {return this;},
      get: async () => {
        const docs = [...records.entries()].filter(([key, data]) => key.startsWith(`${path}/`) &&
          !key.slice(path.length + 1).includes('/') && data[field] === value)
          .map(([key, data]) => ({ref: ref(key), data: () => data}));
        return {empty: docs.length === 0, docs};
      },
    })};
  }
  t.mock.method(database.db, 'recursiveDelete', async (target) => {
    for (const key of records.keys()) if (key === target.path || key.startsWith(`${target.path}/`)) records.delete(key);
  });
  t.mock.method(database.db, 'batch', () => {
    const operations = [];
    return {update: (target, value) => operations.push(() => records.set(target.path, {...records.get(target.path), ...value})),
      delete: (target) => operations.push(() => records.delete(target.path)), commit: async () => operations.forEach((operation) => operation())};
  });
  t.mock.method(database.db, 'collection', collection);
  t.mock.method(database.db, 'runTransaction', async (callback) => {
    const pending = [];
    const result = await callback({
      get: async (target) => {assert.equal(pending.length, 0, 'Reads precede writes'); return target.get();},
      set: (target, value, options) => pending.push([target.path, options?.merge ? {...records.get(target.path), ...value} : value]),
      update: (target, value) => pending.push([target.path, {...records.get(target.path), ...value}]),
      create: (target, value) => {assert.equal(records.has(target.path), false); pending.push([target.path, value]);},
      delete: (target) => pending.push([target.path, undefined]),
    });
    for (const [path, value] of pending) {
      if (value === undefined) records.delete(path);
      else {
        for (const [key, field] of Object.entries(value)) {
          if (field instanceof FieldValue && field.isEqual(FieldValue.delete())) delete value[key];
        }
        records.set(path, value);
      }
      writes.push(path);
    }
    return result;
  });
  const previous = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  t.after(() => {
    if (previous === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = previous;
  });
  return {records, writes};
}

test('Google credentials are encrypted with unique nonces and authenticate ciphertext', (t) => {
  fixture(t);
  const first = encryptToken('fixture-google-token');
  const second = encryptToken('fixture-google-token');
  assert.notEqual(first, second);
  assert.equal(decryptToken(first), 'fixture-google-token');
  const parts = first.split(':');
  parts[2] = `${parts[2][0] === '0' ? '1' : '0'}${parts[2].slice(1)}`;
  assert.throws(() => decryptToken(parts.join(':')), /decrypt/);
  assert.throws(() => decryptToken('plaintext-legacy-token'), /not encrypted/);
});

test('disconnect rejects late Photos, Meals and TV credential commits without writes', async (t) => {
  const f = fixture(t, {'device_codes/ABC234': {status: 'pending', expiresAt: Date.now() + 60_000}});
  const version = await database.getAuthorizationVersion('owner');
  await database.invalidatePendingAuthorizations('owner');
  f.writes.length = 0;
  const tokens = {accessToken: 'fixture-access', refreshToken: 'fixture-refresh', scope: 'fixture', expiryDate: 123};
  await assert.rejects(database.savePhotosTokens('owner', tokens, version), /cancelled/);
  await assert.rejects(database.saveMealSheetTokens('owner', tokens, version), /cancelled/);
  await assert.rejects(database.authorizeDeviceWithGoogleTokens('ABC234', 'owner', 'fixture-custom', tokens, 'a'.repeat(32), version), /cancelled/);
  assert.deepEqual(f.writes, []);
  assert.equal(f.records.get('device_codes/ABC234').status, 'pending');
});

test('fresh consent can commit encrypted tokens after a disconnect', async (t) => {
  const f = fixture(t);
  await database.invalidatePendingAuthorizations('owner');
  const version = await database.getAuthorizationVersion('owner');
  await database.savePhotosTokens('owner', {accessToken: 'fixture-access', refreshToken: 'fixture-refresh'}, version, Math.floor(Date.now() / 1000));
  assert.equal(decryptToken(f.records.get('users/owner').googlePhotos.refreshToken), 'fixture-refresh');
  assert.equal(JSON.stringify(f.records.get('users/owner')).includes('fixture-refresh'), false);
});

test('deletion prevents late cache, Sheet selection, settings and consent resurrection', async (t) => {
  const f = fixture(t);
  await database.invalidatePendingAuthorizations('owner', true);
  f.writes.length = 0;
  await assert.rejects(database.saveDashboardCache('owner', {tasks: []}, 0), /cancelled/);
  await assert.rejects(database.saveMealSheetSelection('owner', 'fixture-sheet', 'Meals', 0), /cancelled/);
  await assert.rejects(database.saveUserTokens('owner', {weatherCity: 'Boston'}), /deleted/);
  await assert.rejects(database.runUserTransaction('owner', async (transaction) => {
    transaction.set(database.db.collection('users').doc('owner'), {appearance: 'late'});
  }), /deleted/);
  await assert.rejects(database.getAuthorizationVersion('owner'), /deleted/);
  assert.deepEqual(f.writes, []);
});

test('an old dashboard fetch cannot put disconnected data back into the cache', async (t) => {
  const f = fixture(t);
  const version = await database.getAuthorizationVersion('owner');
  await database.invalidatePendingAuthorizations('owner');
  f.writes.length = 0;
  await assert.rejects(database.saveDashboardCache('owner', {tasks: [{title: 'private'}]}, version), /cancelled/);
  assert.deepEqual(f.writes, []);
});

test('OAuth state is one-time and expiration is enforced without relying on TTL cleanup', async (t) => {
  const state = 's'.repeat(43);
  const path = `oauth_states/${crypto.createHash('sha256').update(state).digest('hex')}`;
  const f = fixture(t, {[path]: {userId: 'owner', authorizationVersion: 0, expiresAt: Date.now() + 60_000}});
  assert.equal((await consumeState(state)).userId, 'owner');
  assert.equal(await consumeState(state), null);
  f.records.set(path, {userId: 'owner', expiresAt: Date.now() - 1});
  assert.equal(await consumeState(state), null);
  assert.equal(f.records.has(path), false);
});

test('public pairing poll requires the private secret and releases a custom token only once', async (t) => {
  const f = fixture(t);
  const hash = 'h'.repeat(64);
  f.records.set('device_codes/ABC234', {pollSecretHash: hash, expiresAt: Date.now() + 60_000,
    status: 'authorized', customToken: encryptToken('fixture-custom')});
  assert.equal(await database.consumeDeviceToken('ABC234', 'wrong'), null);
  assert.equal(f.writes.length, 0);
  assert.equal((await database.consumeDeviceToken('ABC234', hash)).customToken, 'fixture-custom');
  assert.equal((await database.consumeDeviceToken('ABC234', hash)).customToken, undefined);
});

test('a managed TV cannot authorize another TV through the browser pairing endpoint', async (t) => {
  t.mock.method(requestAuth, 'authenticatedIdentity', async () => ({userId: 'owner', deviceId: 'a'.repeat(32), owner: false}));
  t.mock.method(database, 'getDeviceCode', () => {throw new Error('TV pairing must be denied before database lookup');});
  const res = {set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body;}};
  await handleBeginGoogleLink({method: 'POST', body: {code: 'ABC234'}}, res);
  assert.equal(res.code, 403);
});

test('photo downloads reject untrusted origins, credentials and ports before sending Google credentials', async (t) => {
  t.mock.method(global, 'fetch', () => {throw new Error('No request should leave the server');});
  for (const baseUrl of ['http://photos.googleusercontent.com/a', 'https://evil.example/a',
    'https://photos.googleusercontent.com.evil.example/a', 'https://user:pass@photos.googleusercontent.com/a',
    'https://photos.googleusercontent.com:8443/a']) {
    await assert.rejects(downloadPhoto('fixture-token', {type: 'PHOTO', mediaFile: {baseUrl, mimeType: 'image/jpeg'}}), /unexpected image URL/);
  }
  assert.equal(global.fetch.mock.callCount(), 0);
});

test('photo downloads refuse redirects and accept only bounded raster content', async (t) => {
  t.mock.method(global, 'fetch', async (_url, options) => {
    assert.equal(options.redirect, 'error');
    return new Response('fixture', {headers: {'content-type': 'image/svg+xml'}});
  });
  await assert.rejects(downloadPhoto('fixture-token', {type: 'PHOTO', mediaFile: {
    baseUrl: 'https://photos.googleusercontent.com/a', mimeType: 'image/jpeg',
  }}), /photo format/);
});

test('application quotas stop repeated operations and reset when the window expires', async (t) => {
  const f = fixture(t);
  const now = Date.now();
  t.mock.method(Date, 'now', () => now);
  assert.equal(await database.recordUserQuota('owner', 'fixture', 2, 1000), true);
  assert.equal(await database.recordUserQuota('owner', 'fixture', 2, 1000), true);
  assert.equal(await database.recordUserQuota('owner', 'fixture', 2, 1000), false);
  assert.equal(f.records.get('user_request_limits/owner_fixture').userId, 'owner');
  t.mock.method(Date, 'now', () => now + 1001);
  assert.equal(await database.recordUserQuota('owner', 'fixture', 2, 1000), true);
});

test('deleting an account requires a recent owner sign-in before any database action', async (t) => {
  t.mock.method(database.db, 'collection', () => {throw new Error('No account records may be touched');});
  for (const authTimeSeconds of [undefined, Math.floor(Date.now() / 1000) - 301]) {
    t.mock.method(requestAuth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: true, deviceId: null, authTimeSeconds}));
    const res = {set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body;}};
    await handleAccountSecurity({method: 'POST', body: {action: 'deleteAccount'}}, res);
    assert.equal(res.code, 403);
  }
  assert.equal(requestAuth.recentlyAuthenticated({authTimeSeconds: Math.floor(Date.now() / 1000)}), true);
});

test('Google disconnect clears credentials and cache and revokes managed TVs', async (t) => {
  const f = fixture(t, {'users/owner': {google: {refreshToken: 'fixture'}},
    'users/owner/cache/dashboard': {tasks: ['private']},
    'users/owner/devices/aaa': {revokedAtMs: 0}});
  t.mock.method(requestAuth, 'authenticatedIdentity', async () => ({userId: 'owner', owner: true, deviceId: null}));
  t.mock.method(database.auth, 'revokeRefreshTokens', async () => {});
  // These ordinary document deletes are used by cache invalidation.
  const originalCollection = database.db.collection;
  t.mock.method(database.db, 'collection', (name) => {
    const wrap = (target) => ({...target, delete: async () => f.records.delete(target.path),
      collection: (child) => ({...target.collection(child), doc: (id) => wrap(target.collection(child).doc(id))})});
    const group = originalCollection(name);
    return {...group, doc: (id) => wrap(group.doc(id))};
  });
  const res = {set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body;}};
  await handleAccountSecurity({method: 'POST', body: {action: 'disconnectGoogle'}}, res);
  assert.equal(res.code, 200);
  assert.equal(f.records.get('users/owner').google, undefined);
  assert.equal(f.records.has('users/owner/cache/dashboard'), false);
  assert.ok(f.records.get('users/owner/devices/aaa').revokedAtMs > 0);
  assert.equal(database.auth.revokeRefreshTokens.mock.callCount(), 1);
  assert.equal(f.records.get('account_security/owner').version, 1);
});

test('a request authenticated before sign-out cannot start valid consent in the new version', async (t) => {
  const f = fixture(t);
  const before = Math.floor(Date.now() / 1000);
  await database.invalidatePendingAuthorizations('owner', false, true);
  const version = await database.getAuthorizationVersion('owner');
  f.writes.length = 0;
  await assert.rejects(database.savePhotosTokens('owner', {refreshToken: 'fixture'}, version, before), /cancelled/);
  assert.deepEqual(f.writes, []);
  await database.savePhotosTokens('owner', {refreshToken: 'fixture'}, version, before + 1);
  assert.equal(f.records.has('users/owner'), true);
});
