const test = require("node:test");
const assert = require("node:assert/strict");
const {validCardStyles, cardInk, cardSurface} = require("../lib/utils/cardStyle");
const {validAppearance, handleUserAppearance} = require("../lib/userAppearance");
const {auth, db} = require("../lib/utils/db");
const ids = ["weather", "schedule", "activity", "media", "meal", "todo"];
const base = {layout: "balanced", palette: "night", background: "photo", customAccent: "#38BDF8", backgroundColor: "#0F172A",
  cards: ids.map((id) => ({id, visible: true, size: "standard"}))};

test("per-card surfaces accept transparency and solid color without affecting the existing layout", () => {
  assert.ok(validAppearance({...base, cardStyles: {meal: {backgroundColor: "#fEfEfE", opacity: 1}, schedule: {backgroundColor: "#001122", opacity: 0}}}));
  assert.ok(validCardStyles({}));
  assert.ok(validCardStyles({meal: {backgroundColor: "#112233", opacity: 0.8, borderWidth: 0, borderRadius: 0}}));
  assert.ok(validCardStyles({meal: {backgroundColor: "#112233", opacity: 0.8, useThemeSurface: true, borderWidth: 0}}));
  assert.ok(validCardStyles({meal: {backgroundColor: "#112233", opacity: 0.8, borderWidth: 4, borderRadius: 32}}));
  for (const value of [null, [], {poll: {backgroundColor: "#112233", opacity: 0.8}},
    {meal: {backgroundColor: "red", opacity: 0.5}}, {meal: {backgroundColor: "#112233", opacity: -1}},
    {meal: {backgroundColor: "#112233", opacity: 1.1}}, {meal: {backgroundColor: "#112233", opacity: "0.5"}},
    {meal: {backgroundColor: "#112233", opacity: NaN}}, {meal: {backgroundColor: "#112233", opacity: Infinity}},
    {meal: {backgroundColor: "#112233", opacity: 0.8, borderWidth: -1}},
    {meal: {backgroundColor: "#112233", opacity: 0.8, useThemeSurface: "yes"}},
    {meal: {backgroundColor: "#112233", opacity: 0.8, borderRadius: 33}},
    {meal: {backgroundColor: "#112233", opacity: 0.5, css: "arbitrary"}},
  ]) assert.equal(validCardStyles(value), false);
});

test("surface alpha stays on the background and focused surfaces remain bounded", () => {
  assert.equal(cardSurface({backgroundColor: "#112233", opacity: 0.4}), "rgba(17, 34, 51, 0.4)");
  assert.equal(cardSurface({backgroundColor: "#112233", opacity: 1}, true), "rgba(17, 34, 51, 1)");
  assert.equal(cardSurface({backgroundColor: "#112233", opacity: 0}), "rgba(17, 34, 51, 0)");
});

test("light, dark and transparent surfaces choose readable text and adjust poor-contrast accents", () => {
  const dark = cardInk({backgroundColor: "#000000", opacity: 1}, "#0F172A", "#000011");
  assert.equal(dark.primary, "#F8FAFC"); assert.equal(dark.accent, dark.primary);
  const light = cardInk({backgroundColor: "#FFFFFF", opacity: 1}, "#0F172A", "#EEEEEE");
  assert.equal(light.primary, "#111827"); assert.equal(light.accent, light.primary);
  assert.equal(cardInk({backgroundColor: "#FFFFFF", opacity: 0}, "#0F172A", "#38BDF8").primary, "#F8FAFC");
});

test("all opaque grayscale surfaces have at least 4.5:1 primary and secondary text contrast", () => {
  const luminance = (hex) => {
    const values = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  };
  for (let channel = 0; channel < 256; channel++) {
    const background = "#" + channel.toString(16).padStart(2, "0").repeat(3);
    const ink = cardInk({backgroundColor: background, opacity: 1}, "#0F172A", "#38BDF8");
    for (const foreground of [ink.primary, ink.secondary, ink.accent]) {
      const a = luminance(background); const b = luminance(foreground);
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${background} / ${foreground}`);
    }
  }
});

test("an older client cannot erase card styles; an explicit empty map restores theme surfaces", async (t) => {
  const styles = {meal: {backgroundColor: "#112233", opacity: 0.6}};
  const writes = [];
  let stored = {appearance: {...base, cardStyles: styles, backgroundZoom: 1.12}, updatedAtMs: 1};
  t.mock.method(auth, "verifyIdToken", async () => ({uid: "owner-a", firebase: {sign_in_provider: "google.com"}}));
  const ref = {};
  t.mock.method(db, "collection", () => ({doc: () => ({collection: () => ({doc: () => ref})})}));
  t.mock.method(db, "runTransaction", async (callback) => callback({get: async () => ({data: () => stored}), set: (_ref, value) => {writes.push(value); stored = value;}}));
  const res = {statusCode: 0, set() {}, status(code) {this.statusCode = code; return this;}, json() {}};
  const request = (appearance) => ({method: "PUT", headers: {authorization: "Bearer test"}, body: {appearance}});
  await handleUserAppearance(request({...base, customAccent: "#AABBCC"}), res);
  assert.equal(res.statusCode, 200); assert.deepEqual(writes[0].appearance.cardStyles, styles);
  assert.equal(writes[0].appearance.backgroundZoom, 1.12);
  await handleUserAppearance(request({...base, cardStyles: {}}), res);
  assert.equal(res.statusCode, 200); assert.deepEqual(writes[1].appearance.cardStyles, {});
});

test("photo framing validates bounded zoom and supports older settings", () => {
  const {normalizePhotoZoom} = require('../lib/utils/photoFraming');
  assert.ok(validAppearance(base));
  assert.equal(normalizePhotoZoom(undefined), 1.05);
  for (const zoom of [1, 1.05, 1.5]) assert.ok(validAppearance({...base, backgroundZoom: zoom}));
  for (const zoom of [0.99, 1.51, NaN, Infinity, '1.05', null]) assert.equal(validAppearance({...base, backgroundZoom: zoom}), false);
});
