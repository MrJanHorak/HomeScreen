const {test} = require('node:test');
const assert = require('node:assert/strict');
const {makeGoogleHealthSummary} = require('../lib/services/googleHealthSummary');

const day = (i, steps = {status: 'missing'}) => ({
  date: `2026-10-${String(20 + i).padStart(2, '0')}`, steps,
  distanceKm: {status: 'unavailable'}, calories: {status: 'missing'},
  activeMinutesByLevel: {status: 'ok', value: {LIGHT: 5, VIGOROUS: 2}},
});
const goals = {stepGoal: 10000, distanceGoal: 8};
const now = new Date('2026-10-27T12:00:00Z');

test('maps zero, missing and failures without conflating activity levels', () => {
  const days = Array.from({length: 7}, (_, i) => day(i, i === 6 ? {status: 'ok', value: 0} : undefined));
  const result = makeGoogleHealthSummary(days, goals, now);
  assert.deepEqual(result.progress, {status: 'ok', value: 0});
  assert.equal(result.today.distanceKm.status, 'unavailable');
  assert.equal(result.today.calories.status, 'missing');
  assert.deepEqual(result.today.activeMinutesByLevel.value, {LIGHT: 5, VIGOROUS: 2});
  assert.equal(result.weekly[0].steps.status, 'missing');
  assert.equal(result.fetchedAt, now.toISOString());
});

test('progress preserves availability and caps measured progress', () => {
  for (const steps of [{status: 'missing'}, {status: 'unavailable'}, {status: 'ok', value: 15000}]) {
    const days = Array.from({length: 7}, (_, i) => day(i, i === 6 ? steps : undefined));
    assert.deepEqual(makeGoogleHealthSummary(days, goals, now).progress,
      steps.status === 'ok' ? {status: 'ok', value: 1} : {status: steps.status});
  }
});

test('rejects ambiguous input and invalid goals', () => {
  const days = Array.from({length: 7}, (_, i) => day(i));
  assert.throws(() => makeGoogleHealthSummary(days.slice(1), goals, now));
  assert.throws(() => makeGoogleHealthSummary([...days.slice(0, 6), days[5]], goals, now));
  assert.throws(() => makeGoogleHealthSummary(days, {...goals, stepGoal: 0}, now));
  assert.throws(() => makeGoogleHealthSummary(days, goals, new Date('invalid')));
});
