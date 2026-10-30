const {test} = require('node:test');
const assert = require('node:assert/strict');
const {compareCompletedHealthDays} = require('../lib/services/healthComparison');
const ok = (value) => ({status: 'ok', value});
const health = (date, steps = ok(110), distanceKm = ok(2), calories = ok(300)) =>
  ({date, steps, distanceKm, calories, activeMinutesByLevel: {status: 'missing'}});
const fit = (date, steps = 100, distance = 1, calories = 400) => ({date, steps, distance, calories, activeMinutes: null});

test('compares matching completed days and returns relative differences without raw values', () => {
  const result = compareCompletedHealthDays([health('2026-10-27'), health('2026-10-28')],
    [fit('2026-10-27'), fit('2026-10-28')], '2026-10-28');
  assert.deepEqual(result, [{date: '2026-10-27', steps: {status: 'compared', percent: 10},
    distance: {status: 'compared', percent: 100}, calories: {status: 'compared', percent: -25}}]);
});

test('preserves health availability and treats Fit zero or missing as ambiguous', () => {
  const days = [health('2026-10-26', ok(0), {status: 'missing'}, {status: 'unavailable'}),
    health('2026-10-27')];
  const result = compareCompletedHealthDays(days, [fit('2026-10-26', 0)], '2026-10-28');
  assert.deepEqual(result[0].steps, {status: 'fit_zero_or_missing'});
  assert.deepEqual(result[0].distance, {status: 'health_missing'});
  assert.deepEqual(result[0].calories, {status: 'health_unavailable'});
  assert.deepEqual(result[1].steps, {status: 'fit_missing'});
});
