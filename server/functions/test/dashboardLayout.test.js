const test = require("node:test");
const assert = require("node:assert/strict");
const {DASHBOARD_CARD_IDS: ids, gridFromCards, validGrid, findGridSpace, gridRect} = require("../lib/utils/dashboardLayout");
const {validAppearance, handleUserAppearance} = require("../lib/userAppearance");
const {auth, db} = require("../lib/utils/db");
const cards = ids.map((id) => ({id, visible: true, size: "standard"}));
const base = {layout: "custom", palette: "night", background: "photo", customAccent: "#38BDF8", backgroundColor: "#0F172A", cards};

test("every visibility/width combination of the six legacy cards migrates to a valid grid", () => {
  for (let shown = 1; shown < 64; shown++) {
    for (let wide = 0; wide < 64; wide++) {
      const input = ids.map((id, i) => ({id, visible: Boolean(shown & (1 << i)), size: wide & (1 << i) ? "wide" : "standard"}));
      assert.ok(validGrid(gridFromCards(input), input), `visible=${shown}, wide=${wide}`);
    }
  }
});

test("grid validation rejects unsupported versions, bounds, overlaps, undersized and missing/duplicate cards", () => {
  const grid = gridFromCards(cards);
  assert.ok(validAppearance({...base, grid}));
  for (const patch of [
    {version: 2}, {columns: 24}, {rows: 12}, {items: []},
    {items: [...grid.items, grid.items[0]]},
    {items: grid.items.map((item, i) => i ? item : {...item, x: -1})},
    {items: grid.items.map((item, i) => i ? item : {...item, y: 6})},
    {items: grid.items.map((item, i) => i ? item : {...item, width: 2})},
    {items: grid.items.map((item, i) => i ? item : {...item, height: 1})},
    {items: grid.items.map((item, i) => i ? item : {...item, x: 0.5})},
    {items: grid.items.map((item, i) => i ? item : {...item, id: "poll"})},
    {items: grid.items.map((item, i) => i === 1 ? {...item, x: 0} : item)},
  ]) assert.equal(validAppearance({...base, grid: {...grid, ...patch}}), false);
  assert.equal(validAppearance({...base, layout: "balanced", grid}), false);
  assert.ok(validAppearance({...base, grid: null}));
  assert.ok(validAppearance(base));
});

test("adding a hidden card finds empty space without moving other cards, or returns full", () => {
  const full = gridFromCards(cards);
  assert.equal(findGridSpace(full, "weather"), null);
  const room = {...full, items: full.items.filter((item) => item.id !== "weather")};
  const added = findGridSpace(room, "weather");
  assert.deepEqual(added, {id: "weather", x: 0, y: 0, width: 3, height: 2});
  assert.ok(validGrid({...room, items: [...room.items, added]}, cards));
});

test("scaled rectangles remain within both desktop and compact TV bounds", () => {
  for (const [width, height, gap] of [[900, 320, 8], [1800, 740, 12]]) {
    for (const item of gridFromCards(cards).items) {
      const rect = gridRect(item, width, height, gap);
      assert.ok(rect.width > 0 && rect.height > 0);
      assert.ok(rect.left >= 0 && rect.top >= 0);
      assert.ok(rect.left + rect.width <= width + 0.001);
      assert.ok(rect.top + rect.height <= height + 0.001);
    }
  }
});

function fixture(t, existing) {
  const writes = [];
  t.mock.method(auth, "verifyIdToken", async () => ({uid: "owner-a", firebase: {sign_in_provider: "google.com"}}));
  const ref = {get: async () => ({data: () => existing})};
  t.mock.method(db, "collection", () => ({doc: () => ({collection: () => ({doc: () => ref})})}));
  t.mock.method(db, "runTransaction", async (callback) => callback({get: () => ref.get(), set: (_ref, body) => writes.push(body)}));
  const res = {statusCode: 0, body: null, set() {}, status(code) {this.statusCode = code; return this;}, json(body) {this.body = body;}};
  const invoke = (body) => handleUserAppearance({method: "PUT", headers: {authorization: "Bearer test"}, body}, res);
  return {writes, res, invoke};
}

test("a stale companion save fails atomically and does not overwrite the newer layout", async (t) => {
  const {invoke, writes, res} = fixture(t, {appearance: base, updatedAtMs: 20});
  await invoke({appearance: {...base, grid: gridFromCards(cards)}, expectedUpdatedAtMs: 10, source: "web"});
  assert.equal(res.statusCode, 409);
  assert.equal(writes.length, 0);
});

test("a matching revision saves atomically and advances the revision even within one millisecond", async (t) => {
  t.mock.method(Date, "now", () => 20);
  const {invoke, writes, res} = fixture(t, {appearance: base, updatedAtMs: 20});
  await invoke({appearance: {...base, grid: gridFromCards(cards)}, expectedUpdatedAtMs: 20, source: "web"});
  assert.equal(res.statusCode, 200);
  assert.equal(writes[0].updatedAtMs, 21);
  assert.equal(writes[0].seededFromWeb, true);
});

test("legacy appearance saves preserve the canvas; incompatible visibility edits are rejected", async (t) => {
  const grid = gridFromCards(cards);
  const {invoke, writes, res} = fixture(t, {appearance: {...base, grid}, updatedAtMs: 20});
  await invoke({appearance: {...base, customAccent: "#112233"}});
  assert.equal(res.statusCode, 200);
  assert.deepEqual(writes[0].appearance.grid, grid);
  await invoke({appearance: {...base, cards: cards.map((card, i) => i ? card : {...card, visible: false})}});
  assert.equal(res.statusCode, 400);
  assert.equal(writes.length, 1);
});

test("explicit grid null clears an existing canvas", async (t) => {
  const {invoke, writes, res} = fixture(t, {appearance: {...base, grid: gridFromCards(cards)}, updatedAtMs: 20});
  await invoke({appearance: {...base, grid: null}, expectedUpdatedAtMs: 20, source: "web"});
  assert.equal(res.statusCode, 200);
  assert.equal(writes[0].appearance.grid, null);
});

test("initial revision zero creates new settings", async (t) => {
  const {invoke, writes, res} = fixture(t, undefined);
  await invoke({appearance: {...base, grid: null}, expectedUpdatedAtMs: 0, source: "web"});
  assert.equal(res.statusCode, 200);
  assert.equal(writes[0].appearance.grid, null);
});
