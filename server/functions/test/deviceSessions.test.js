const test = require("node:test");
const assert = require("node:assert/strict");
const {auth, db} = require("../lib/utils/db");
const {authenticatedIdentity} = require("../lib/utils/requestAuth");
const {handleLinkedDevices: linkedDevicesHandler} = require("../lib/linkedDevices");

const id = "a".repeat(32);
function request(method = "GET", body = {}, query = {}) {
  return {method, body, query, headers: {authorization: "Bearer test-token"}};
}
function response() {
  return {
    statusCode: 0, body: null,
    set() { return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
function stubAuth(t, claims) {
  t.mock.method(auth, "verifyIdToken", async (token, checkRevoked) => {
    assert.equal(token, "test-token"); assert.equal(checkRevoked, true);
    return {uid: "owner-a", firebase: {sign_in_provider: "custom"}, ...claims};
  });
}
function stubDevice(t, data, exists = true) {
  const updates = [];
  const ref = {
    async get() { return {exists, data: () => data}; },
    async update(changes) { updates.push(changes); },
  };
  const deviceCollection = {doc(deviceId) { assert.equal(deviceId, id); return ref; }};
  t.mock.method(db, "collection", (name) => {
    assert.equal(name, "users");
    return {doc(uid) {
      assert.equal(uid, "owner-a");
      return {collection(child) { assert.equal(child, "devices"); return deviceCollection; }};
    }};
  });
  t.mock.method(db, "runTransaction", async (callback) => callback({
    get: () => ref.get(), update: (_ref, changes) => updates.push(changes),
  }));
  return updates;
}

test("Google browser sign-in grants owner controls without a device claim", async (t) => {
  stubAuth(t, {firebase: {sign_in_provider: "google.com"}});
  assert.deepEqual(await authenticatedIdentity(request()), {userId: "owner-a", deviceId: null, owner: true});
});

test("managed TV session uses its owner-scoped device record and cannot become an owner", async (t) => {
  stubAuth(t, {dashboardDeviceId: id});
  stubDevice(t, {revokedAtMs: 0, lastSeenAtMs: Date.now()});
  assert.deepEqual(await authenticatedIdentity(request()), {userId: "owner-a", deviceId: id, owner: false});
});

test("revoked, missing, malformed and unverifiable TV sessions fail authentication", async (t) => {
  const verifier = stubVerifier();
  t.mock.method(auth, "verifyIdToken", verifier);
  stubDevice(t, {revokedAtMs: Date.now()});
  assert.equal(await authenticatedIdentity(request()), null);
  verifier.claim = "../foreign-device";
  assert.equal(await authenticatedIdentity(request()), null);
  verifier.fail = true;
  assert.equal(await authenticatedIdentity(request()), null);
  assert.equal(await authenticatedIdentity({headers: {}}), null);
  function stubVerifier() {
    const verify = async () => {
      if (verify.fail) throw new Error("token revoked");
      return {uid: "owner-a", dashboardDeviceId: verify.claim, firebase: {sign_in_provider: "custom"}};
    };
    verify.claim = id;
    return verify;
  }
});

test("a deleted TV record fails authentication even with a valid Firebase token", async (t) => {
  stubAuth(t, {dashboardDeviceId: id});
  stubDevice(t, undefined, false);
  assert.equal(await authenticatedIdentity(request()), null);
});

test("a legacy custom-token session cannot list, rename or remove other TVs", async (t) => {
  stubAuth(t, {});
  for (const method of ["GET", "PUT", "DELETE"]) {
    const res = response();
    await linkedDevicesHandler(request(method, {id, name: "Bedroom"}), res);
    assert.equal(res.statusCode, 403);
  }
});

test("a legacy TV can register its current installation and retry without duplicate records", async (t) => {
  stubAuth(t, {});
  let record;
  let created = 0;
  let deviceId;
  const ref = {get: async () => ({exists: Boolean(record), data: () => record})};
  t.mock.method(db, "collection", () => ({doc: () => ({collection: () => ({doc: (id) => {deviceId = id; return ref;}})})}));
  t.mock.method(db, "runTransaction", async (callback) => callback({
    get: () => ref.get(), create: (_ref, value) => {record = value; created++;},
  }));
  t.mock.method(auth, "createCustomToken", async (_uid, claims) => {
    assert.equal(claims.dashboardDeviceId, deviceId);
    return "upgraded-token";
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = response();
    await linkedDevicesHandler(request("POST", {installationKey: "stable-installation-key"}, {current: "1"}), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.customToken, "upgraded-token");
  }
  assert.equal(created, 1);
  assert.match(deviceId, /^[0-9a-f]{32}$/);
});

test("owner removal revokes only the selected TV record", async (t) => {
  stubAuth(t, {firebase: {sign_in_provider: "google.com"}});
  const updates = stubDevice(t, {revokedAtMs: 0});
  const res = response();
  await linkedDevicesHandler(request("DELETE", {id}), res);
  assert.equal(res.statusCode, 200);
  assert.equal(updates.length, 1);
  assert.ok(updates[0].revokedAtMs > 0);
});

test("owner cannot rename a TV absent from their own device collection", async (t) => {
  stubAuth(t, {firebase: {sign_in_provider: "google.com"}});
  const updates = stubDevice(t, undefined, false);
  const res = response();
  await linkedDevicesHandler(request("PUT", {id, name: "Other owner's TV"}), res);
  assert.equal(res.statusCode, 404);
  assert.equal(updates.length, 0);
});

test("TV can remove its own session while ignoring a supplied foreign device id", async (t) => {
  stubAuth(t, {dashboardDeviceId: id});
  const updates = stubDevice(t, {revokedAtMs: 0, lastSeenAtMs: Date.now()});
  const res = response();
  await linkedDevicesHandler(request("DELETE", {id: "b".repeat(32)}, {current: "1"}), res);
  assert.equal(res.statusCode, 200);
  assert.equal(updates.length, 1);
  assert.ok(updates[0].revokedAtMs > 0);
});

test("owner rename validates name length and control characters", async (t) => {
  stubAuth(t, {firebase: {sign_in_provider: "google.com"}});
  stubDevice(t, {revokedAtMs: 0});
  for (const name of ["", "x".repeat(41), "Room\nTV"]) {
    const res = response();
    await linkedDevicesHandler(request("PUT", {id, name}), res);
    assert.equal(res.statusCode, 400);
  }
});

test("current TV gets the canonical companion address without old pairing query parameters", async (t) => {
  stubAuth(t, {dashboardDeviceId: id});
  stubDevice(t, {name: "Bedroom", revokedAtMs: 0, lastSeenAtMs: Date.now(), pairedAtMs: 123});
  const previous = process.env.PAIRING_URL;
  process.env.PAIRING_URL = "https://dashboard.example/pair?code=OLD";
  t.after(() => { if (previous === undefined) delete process.env.PAIRING_URL; else process.env.PAIRING_URL = previous; });
  const res = response();
  await linkedDevicesHandler(request("GET", {}, {current: "1"}), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.companionUrl, "https://dashboard.example/dashboard");
  assert.deepEqual(res.body.device, {name: "Bedroom", pairedAtMs: 123});
});
