const {test} = require('node:test');
const assert = require('node:assert/strict');
const {compareCalorieWindows} = require('../lib/services/healthCalorieWindows');
const start = Date.parse('2026-10-29T04:00:00Z');
const end = start + 4 * 3600000;
const point = (index, kcalSum) => ({startTime: new Date(start + index * 3600000).toISOString(),
  endTime: new Date(start + (index + 1) * 3600000).toISOString(), totalCalories: {kcalSum}});

test('counts source differences, zeros and absent windows without exposing values', async () => {
  const requests = [];
  const data = {'all-sources': [point(0, 100), point(1, 50), point(2, 0), point(3, 10)],
    'google-sources': [point(0, 120), point(1, 40), point(2, 3)],
    'google-wearables': [point(0, 100), point(1, 50), point(2, 0), point(3, 10)]};
  const result = await compareCalorieWindows({request: async (options) => {
    requests.push(options); return {data: {rollupDataPoints: data[options.data.dataSourceFamily.split('/').at(-1)]}};
  }}, start, end);
  assert.deepEqual(result.google, {status: 'ok', higher: 1, lower: 1, similar: 0, missing: 1, baselineZero: 1});
  assert.deepEqual(result.wearables, {status: 'ok', higher: 0, lower: 0, similar: 3, missing: 0, baselineZero: 1});
  assert.equal(requests[0].data.windowSize, '3600s');
  assert.equal(JSON.stringify(result).includes('120'), false);
});

test('rejects pagination and malformed or duplicate buckets, while isolating failures', async () => {
  const data = {'all-sources': [point(0, 10)], 'google-sources': [point(0, 20), point(0, 30)], 'google-wearables': [point(0, 10)]};
  const result = await compareCalorieWindows({request: async (options) => ({data: {rollupDataPoints: data[options.data.dataSourceFamily.split('/').at(-1)]}})}, start, end);
  assert.equal(result.google.status, 'unavailable'); assert.equal(result.wearables.status, 'ok');
  const paginated = await compareCalorieWindows({request: async () => ({data: {nextPageToken: 'more'}})}, start, end);
  assert.equal(paginated.google.status, 'unavailable'); assert.equal(paginated.wearables.status, 'unavailable');
  await assert.rejects(compareCalorieWindows({request: async () => ({data: {}})}, start, start + 28 * 3600000));
});

test('accepts a truncated final bucket and compares partial physical windows', async () => {
  const partialEnd = start + 1.5 * 3600000;
  const last = {startTime: new Date(start + 3600000).toISOString(), endTime: new Date(partialEnd).toISOString(), totalCalories: {kcalSum: 10}};
  const result = await compareCalorieWindows({request: async () => ({data: {rollupDataPoints: [point(0, 10), last]}})}, start, partialEnd);
  assert.equal(result.google.similar, 2);
});
