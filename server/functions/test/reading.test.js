const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validReading, normalizeReading, DEFAULT_READING, DYSLEXIA_READING, readingColors, contrastRatio, readingInk} = require('../lib/utils/reading');
const {validAppearance} = require('../lib/userAppearance');
const {cardInk} = require('../lib/utils/cardStyle');
const base = {layout: 'balanced', palette: 'night', customAccent: '#38BDF8', background: 'photo', backgroundColor: '#0F172A',
  cards: ['weather', 'schedule', 'activity', 'media', 'meal', 'todo'].map((id) => ({id, visible: true, size: 'standard'}))};
test('older clients retain reading preferences and an explicit reset restores defaults', async (t) => {
  const {auth, db} = require('../lib/utils/db');
  const {handleUserAppearance} = require('../lib/userAppearance');
  let stored = {appearance: {...base, reading: DYSLEXIA_READING}, updatedAtMs: 1};
  const ref = {}, historyRef = {};
  t.mock.method(auth, 'verifyIdToken', async () => ({uid: 'owner', firebase: {sign_in_provider: 'google.com'}}));
  t.mock.method(db, 'collection', () => ({doc: () => ({collection: () => ({doc: (id) => id === 'history' ? historyRef : ref})})}));
  t.mock.method(db, 'runTransaction', async (callback) => callback({get: async (target) => ({data: () => target === ref ? stored : undefined}), set: (target, value) => {if (target === ref) stored = value;}}));
  const res = {code: 0, set() {}, status(code) {this.code = code; return this;}, json() {}};
  const req = (appearance) => ({method: 'PUT', headers: {authorization: 'Bearer test'}, body: {appearance}});
  await handleUserAppearance(req({...base, customAccent: '#AABBCC'}), res);
  assert.equal(res.code, 200); assert.deepEqual(stored.appearance.reading, DYSLEXIA_READING);
  await handleUserAppearance(req({...base, reading: DEFAULT_READING}), res);
  assert.equal(res.code, 200); assert.deepEqual(stored.appearance.reading, DEFAULT_READING);
});
test('legacy appearance stays valid; unknown reading settings cannot publish', () => {
  assert.equal(validAppearance(base), true);
  assert.deepEqual(normalizeReading(undefined), DEFAULT_READING);
  assert.equal(validAppearance({...base, reading: DYSLEXIA_READING}), true);
  for (const patch of [{font: 'url(font)'}, {spacing: 20}, {weight: 'italic'}, {textColor: '#123'}, {colors: 'unknown'}, {script: true}]) {
    assert.equal(validAppearance({...base, reading: {...DYSLEXIA_READING, ...patch}}), false);
  }
  assert.equal(validReading([]), false); assert.equal(validReading(null), false);
});
test('reading palettes and custom colors preserve normal text contrast on focused surfaces', () => {
  for (const colors of ['warm', 'contrast']) {
    const scheme = readingColors({...DYSLEXIA_READING, colors});
    for (const surface of [scheme.background, scheme.surface, scheme.focused]) {
      for (const ink of [scheme.primary, scheme.secondary, scheme.accent]) assert.ok(contrastRatio(ink, surface) >= 4.5);
    }
    assert.equal(readingInk('#222222', scheme.focused, scheme.primary), scheme.primary);
  }
  assert.equal(readingInk('#FFF1D6', '#242424', '#FFFFFF'), '#FFF1D6');
  const surface = {backgroundColor: '#FFFFFF', opacity: 1};
  const ink = cardInk(surface, '#0F172A', '#38BDF8', '#FFF1D6');
  assert.ok(contrastRatio(ink.primary, '#FFFFFF') >= 4.5);
});
