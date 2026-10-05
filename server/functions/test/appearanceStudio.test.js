const test = require("node:test");
const assert = require("node:assert/strict");
const {auth, db} = require("../lib/utils/db");
const {handleAppearanceStudio} = require("../lib/appearanceStudio");
const {handleUserAppearance} = require("../lib/userAppearance");
const {MAX_DESIGNS, MAX_REVISIONS} = require("../lib/utils/appearanceLibrary");
const appearance = {layout: "balanced", palette: "night", background: "photo", customAccent: "#38BDF8", backgroundColor: "#0F172A",
  cards: ["weather", "schedule", "activity", "media", "meal", "todo"].map((id) => ({id, visible: true, size: "standard"}))};

function fixture(t, initial = {}, provider = "google.com") {
  const records = structuredClone(initial);
  const writes = [];
  t.mock.method(auth, "verifyIdToken", async () => ({uid: "owner-a", firebase: {sign_in_provider: provider}}));
  t.mock.method(db, "collection", (name) => {
    assert.equal(name, "users");
    return {doc(uid) {
      assert.equal(uid, "owner-a");
      return {collection(child) { assert.equal(child, "appearance"); return {doc: (id) => id}; }};
    }};
  });
  t.mock.method(db, "runTransaction", async (callback) => {
    const pending = [];
    let writing = false;
    const result = await callback({
      get: async (id) => { assert.equal(writing, false, "Firestore reads must precede writes"); return {data: () => structuredClone(records[id])}; },
      set: (id, data) => {writing = true; pending.push([id, structuredClone(data)]);},
    });
    for (const [id, data] of pending) {records[id] = data; writes.push(id);}
    return result;
  });
  async function invoke(handler, method, body = {}) {
    const res = {statusCode: 0, body: null, set() {}, status(code) {this.statusCode = code; return this;}, json(value) {this.body = value;}};
    await handler({method, headers: {authorization: "Bearer test"}, body}, res);
    return res;
  }
  return {records, writes, studio: (method, body) => invoke(handleAppearanceStudio, method, body), publish: (body) => invoke(handleUserAppearance, "PUT", body)};
}

test("drafts persist across reads without changing the published TV settings", async (t) => {
  const f = fixture(t, {settings: {appearance, updatedAtMs: 42}});
  const draft = {appearance: {...appearance, palette: "forest"}, baseUpdatedAtMs: 42};
  assert.equal((await f.studio("PUT", {action: "draft", draft, expectedUpdatedAtMs: 0})).statusCode, 200);
  const loaded = await f.studio("GET");
  assert.deepEqual(loaded.body.library.draft, draft);
  assert.equal(loaded.body.updatedAtMs, 42);
  assert.deepEqual(loaded.body.appearance, appearance);
  assert.deepEqual(f.writes, ["studio"]);
});

test("stale library saves and stale publishes retain the account draft and write nothing", async (t) => {
  const draft = {appearance, baseUpdatedAtMs: 1};
  const f = fixture(t, {studio: {updatedAtMs: 3, draft, designs: []}, settings: {appearance, updatedAtMs: 2}});
  assert.equal((await f.studio("PUT", {action: "draft", draft: null, expectedUpdatedAtMs: 0})).statusCode, 409);
  assert.equal((await f.publish({appearance, expectedUpdatedAtMs: 1})).statusCode, 409);
  assert.deepEqual(f.records.studio.draft, draft);
  assert.deepEqual(f.writes, []);
});

test("designs can be created, replaced and deleted without publishing", async (t) => {
  const f = fixture(t);
  const created = await f.studio("PUT", {action: "saveDesign", name: "  Evening  ", appearance, expectedUpdatedAtMs: 0});
  const design = created.body.library.designs[0];
  assert.equal(design.name, "Evening");
  const changed = {...appearance, palette: "plum"};
  const replaced = await f.studio("PUT", {action: "saveDesign", id: design.id, name: "Evening", appearance: changed, expectedUpdatedAtMs: created.body.library.updatedAtMs});
  assert.equal(replaced.body.library.designs.length, 1);
  assert.deepEqual(replaced.body.library.designs[0].appearance, changed);
  const removed = await f.studio("PUT", {action: "deleteDesign", id: design.id, expectedUpdatedAtMs: replaced.body.library.updatedAtMs});
  assert.deepEqual(removed.body.library.designs, []);
  assert.equal(f.records.settings, undefined);
});

test("invalid names, settings, revisions, oversized UTF-8 input and unknown designs fail without writes", async (t) => {
  const f = fixture(t);
  for (const body of [
    {action: "saveDesign", name: "\nBad", appearance},
    {action: "saveDesign", name: "x".repeat(61), appearance},
    {action: "draft", draft: {appearance: {}, baseUpdatedAtMs: 0}},
    {action: "draft", draft: {appearance, baseUpdatedAtMs: -1}},
    {action: "draft"},
    {action: "saveDesign", name: "Valid", appearance: {...appearance, extra: "😀".repeat(3100)}},
    {action: "deleteDesign", id: "../outside"},
  ]) assert.equal((await f.studio("PUT", {...body, expectedUpdatedAtMs: 0})).statusCode, 400);
  assert.equal((await f.studio("PUT", {action: "draft", draft: null})).statusCode, 400);
  assert.equal((await f.studio("PUT", {action: "deleteDesign", id: "missing", expectedUpdatedAtMs: 0})).statusCode, 404);
  assert.deepEqual(f.writes, []);
});

test("library size is bounded but an existing design can be replaced at capacity", async (t) => {
  const designs = Array.from({length: MAX_DESIGNS}, (_, i) => ({id: String(i), name: "Design", appearance, updatedAtMs: 1}));
  const f = fixture(t, {studio: {updatedAtMs: 1, designs, draft: null}});
  assert.equal((await f.studio("PUT", {action: "saveDesign", name: "New", appearance, expectedUpdatedAtMs: 1})).statusCode, 400);
  assert.equal((await f.studio("PUT", {action: "saveDesign", id: "0", name: "Replacement", appearance, expectedUpdatedAtMs: 1})).statusCode, 200);
  assert.equal(f.records.studio.designs.length, MAX_DESIGNS);
});

test("publish atomically captures the previous settings, records the caller, and advances revisions", async (t) => {
  t.mock.method(Date, "now", () => 42);
  const f = fixture(t, {settings: {appearance, updatedAtMs: 42}});
  const next = {...appearance, palette: "forest"};
  const res = await f.publish({appearance: next, expectedUpdatedAtMs: 42});
  assert.equal(res.statusCode, 200);
  assert.equal(f.records.settings.updatedAtMs, 43);
  assert.deepEqual(f.writes, ["settings", "history"]);
  assert.deepEqual(f.records.history.revisions.map((r) => [r.updatedAtMs, r.source, r.changedBy]), [[43, "web", "owner-a"], [42, "previous", "owner-a"]]);
  assert.deepEqual(f.records.history.revisions[1].appearance, appearance);
});

test("TV publishes join bounded history and cannot access the owner library", async (t) => {
  const revisions = Array.from({length: MAX_REVISIONS}, (_, i) => ({appearance, updatedAtMs: 100 - i, source: "web", changedBy: "owner-a"}));
  const f = fixture(t, {settings: {appearance, updatedAtMs: 100}, history: {revisions}}, "custom");
  for (const method of ["GET", "PUT"]) assert.equal((await f.studio(method, {})).statusCode, 403);
  assert.deepEqual(f.writes, []);
  assert.equal((await f.publish({appearance: {...appearance, palette: "forest"}, source: "web"})).statusCode, 200);
  assert.equal(f.records.history.revisions.length, MAX_REVISIONS);
  assert.equal(f.records.history.revisions[0].source, "tv", "source cannot spoof the verified caller");
  assert.equal(f.records.history.revisions.at(-1).updatedAtMs, 72);
});

test("identical TV saves keep the revision and history unchanged, regardless of object key order", async (t) => {
  const f = fixture(t, {settings: {appearance, updatedAtMs: 42, seededFromWeb: true}}, "custom");
  const reordered = Object.fromEntries(Object.entries(appearance).reverse());
  const result = await f.publish({appearance: reordered});
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.updatedAtMs, 42);
  assert.deepEqual(f.writes, []);
  assert.equal((await f.publish({appearance: {...appearance, palette: "forest"}, expectedUpdatedAtMs: 42})).statusCode, 200,
    "a duplicate TV save does not invalidate the companion's draft revision");
});

test("identical legacy TV saves preserve newer framing and card styles without advancing the revision", async (t) => {
  const stored = {...appearance, backgroundZoom: 1.25, cardStyles: {}};
  const f = fixture(t, {settings: {appearance: stored, updatedAtMs: 42, seededFromWeb: true}}, "custom");
  const result = await f.publish({appearance});
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.updatedAtMs, 42);
  assert.deepEqual(f.writes, []);
});

test("an identical web seed marks migration complete without creating a revision", async (t) => {
  const f = fixture(t, {settings: {appearance, updatedAtMs: 42}});
  assert.equal((await f.publish({appearance, source: "web", expectedUpdatedAtMs: 42})).statusCode, 200);
  assert.equal(f.records.settings.updatedAtMs, 42);
  assert.equal(f.records.settings.seededFromWeb, true);
  assert.deepEqual(f.writes, ["settings"]);
});
