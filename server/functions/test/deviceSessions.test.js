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

test("ordinary cached dashboard requests record the TV clock timezone before polls exist", async (t) => {
  stubAuth(t, {dashboardDeviceId: id});
  const updates = stubDevice(t, {revokedAtMs: 0, lastSeenAtMs: Date.now()});
  const cache = require("../lib/utils/db");
  t.mock.method(cache, "getDashboardCache", async () => ({cachedAtMs: Date.now(), summary: {cached: true}}));
  t.mock.method(cache, "recordUserQuota", async () => {throw new Error("Cache hit must not refresh providers");});
  const req = request(); req.headers["x-time-zone"] = "America/New_York";
  const res = response();
  await require("../lib/getDashboardSummary").handleGetDashboardSummary(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {cached: true});
  assert.deepEqual(updates, [{timeZone: "America/New_York"}]);
});

test("TV timezone reports ignore invalid values and avoid redundant writes", async (t) => {
  stubAuth(t, {dashboardDeviceId: id});
  const updates = stubDevice(t, {revokedAtMs: 0, lastSeenAtMs: Date.now(), timeZone: "America/New_York"});
  for (const timeZone of ["invalid/zone", "America/New_York", undefined, ["UTC"]]) {
    const req = request(); req.headers["x-time-zone"] = timeZone;
    assert.ok(await authenticatedIdentity(req));
  }
  assert.deepEqual(updates, []);
  const req = request(); req.headers["x-time-zone"] = "Europe/London";
  assert.ok(await authenticatedIdentity(req));
  assert.deepEqual(updates, [{timeZone: "Europe/London"}]);
});

test("an owner browser timezone cannot overwrite a linked TV's clock", async (t) => {
  stubAuth(t, {firebase: {sign_in_provider: "google.com"}});
  t.mock.method(db, "collection", () => {throw new Error("Owner authentication must not write device metadata");});
  const req = request(); req.headers["x-time-zone"] = "Pacific/Honolulu";
  assert.equal((await authenticatedIdentity(req)).owner, true);
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
    assert.equal(res.statusCode, 401);
  }
});

test("legacy tokens cannot mint replacement devices by varying installation keys", async (t) => {
  stubAuth(t, {});
  t.mock.method(db, "collection", () => {throw new Error("No device data may be accessed");});
  t.mock.method(auth, "createCustomToken", () => {throw new Error("No token may be minted");});
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = response();
    await linkedDevicesHandler(request("POST", {installationKey: `attacker-installation-${attempt}`}, {current: "1"}), res);
    assert.equal(res.statusCode, 405);
  }
});

test("unmanaged, anonymous and unexpected providers fail authentication", async (t) => {
  for (const provider of ["custom", "anonymous", "password", undefined]) {
    t.mock.method(auth, "verifyIdToken", async () => ({uid: "owner-a", firebase: {sign_in_provider: provider}}));
    assert.equal(await authenticatedIdentity(request()), null);
  }
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
