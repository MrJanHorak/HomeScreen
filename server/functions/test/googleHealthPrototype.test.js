const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readHealthPrototype, healthRollupTransport} = require('../lib/services/googleHealthPrototype');

const point = (day, field, value) => ({civilStartTime: {date: {year: 2026, month: 11, day}}, [field]: value});

test('retains missing and measured zero independently and converts distance', async () => {
  const calls = [];
  const data = {
    steps: [point(1, 'steps', {countSum: '0'}), point(2, 'steps', {countSum: '12'})],
    distance: [point(2, 'distance', {millimetersSum: '1234567'})],
    'active-minutes': [point(2, 'activeMinutes', {activeMinutesRollupByActivityLevel: [
      {activityLevel: 'LIGHT', activeMinutesSum: '5'}, {activityLevel: 'VIGOROUS', activeMinutesSum: '2'},
    ]})],
    'total-calories': [point(2, 'totalCalories', {kcalSum: 123.5})],
  };
  const days = await readHealthPrototype('2026-11-03', async (metric, body) => {
    calls.push({metric, body}); return {rollupDataPoints: data[metric]};
  });
  assert.equal(days.length, 7);
  assert.equal(days[0].date, '2026-10-27');
  assert.deepEqual(days[5].steps, {status: 'ok', value: 0});
  assert.deepEqual(days[5].distanceKm, {status: 'missing'});
  assert.deepEqual(days[6].distanceKm, {status: 'ok', value: 1.234567});
  assert.deepEqual({...days[6].activeMinutesByLevel.value}, {LIGHT: 5, VIGOROUS: 2});
  assert.deepEqual(days[6].calories, {status: 'ok', value: 123.5});
  assert.deepEqual(calls[0].body.range, {
    start: {date: {year: 2026, month: 10, day: 27}, time: {}},
    end: {date: {year: 2026, month: 11, day: 3}, time: {}},
  });
});

test('isolates failures and rejects unexpected pagination or duplicate days', async () => {
  const days = await readHealthPrototype('2026-11-03', async (metric) => {
    if (metric === 'distance') throw new Error('private upstream error');
    if (metric === 'steps') return {nextPageToken: 'more'};
    if (metric === 'total-calories') return {rollupDataPoints: [point(2, 'totalCalories', {kcalSum: 1}), point(2, 'totalCalories', {kcalSum: 2})]};
    return {rollupDataPoints: []};
  });
  assert.equal(days[6].steps.status, 'unavailable');
  assert.equal(days[6].distanceKm.status, 'unavailable');
  assert.equal(days[6].calories.status, 'unavailable');
  assert.equal(days[6].activeMinutesByLevel.status, 'missing');
  await assert.rejects(readHealthPrototype('2026-02-30', async () => ({})), /Invalid calendar date/);
});

test('transport sends a bounded POST to the Health daily rollup endpoint', async () => {
  const requests = [];
  const request = healthRollupTransport({request: async (options) => {requests.push(options); return {data: {rollupDataPoints: []}};}});
  await request('steps', {windowSizeDays: 1});
  assert.equal(requests[0].url, 'https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp');
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].timeout, 15000);
});
