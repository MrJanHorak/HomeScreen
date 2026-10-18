const {test} = require('node:test');
const assert = require('node:assert/strict');
const {db} = require('../lib/utils/db');
const {buildWeatherSummary, fetchLocalWeather, weatherCacheKey} = require('../lib/services/weatherService');
const now = Date.parse('2026-10-18T00:30:00Z'); // October 17, 8:30 PM in Georgia
const current = {name: 'Harlem', dt: now / 1000 - 300, timezone: -14400,
  coord: {lat: 33.414, lon: -82.312}, sys: {country: 'US'},
  main: {temp: 62.2, feels_like: 61, temp_min: 62.2, temp_max: 62.2, pressure: 1013},
  weather: [{main: 'Clear', icon: '01n'}]};
const sample = (date, temp) => ({dt: Date.parse(date) / 1000, main: {temp}, weather: [{main: 'Clear', icon: '01n'}]});

test('today uses future samples in the city timezone, never current temp_min/temp_max', () => {
  const result = buildWeatherSummary(current, {list: [
    sample('2026-10-18T09:00:00Z', 43), sample('2026-10-17T21:00:00Z', 90),
    sample('2026-10-18T03:00:00Z', 54), sample('2026-10-18T01:00:00Z', 59),
    sample('2026-10-18T18:00:00Z', 65), sample('2026-10-18T02:00:00Z', NaN),
  ]}, now);
  assert.equal(result.temp, '62°');
  assert.equal(result.high, 59);
  assert.equal(result.low, 54);
  assert.equal(result.highLowPeriod, 'rest_of_day');
  assert.deepEqual(result.hourly.map((hour) => hour.time), ['9 PM', '11 PM', '5 AM', '2 PM']);
  assert.deepEqual(result.forecast.map((day) => [day.day, day.high, day.low]), [['Sun', 65, 43]]);
  assert.equal(result.observedAt, '2026-10-18T00:25:00.000Z');
  assert.equal(result.fetchedAt, '2026-10-18T00:30:00.000Z');
  assert.deepEqual(result.resolvedLocation, {name: 'Harlem', country: 'US', lat: 33.414, lon: -82.312});
});

test('missing forecasts or no remaining samples omit H/L instead of inventing a daily range', () => {
  for (const data of [null, {list: []}, {list: [sample('2026-10-18T09:00:00Z', 43)]}]) {
    const result = buildWeatherSummary(current, data, now);
    assert.equal(result.high, undefined);
    assert.equal(result.low, undefined);
    assert.equal(result.highLowPeriod, undefined);
    assert.equal(result.temp, '62°');
  }
  assert.throws(() => buildWeatherSummary({...current, main: {}}, null, now), /temperature is missing/);
});

test('cache identity shares city strings and legacy objects and retains coordinate identity', () => {
  assert.equal(weatherCacheKey(' Harlem, GA, US '), weatherCacheKey({city: 'harlem,GA,US', units: 'metric'}));
  assert.equal(weatherCacheKey({lat: 33, lon: -82, city: 'Home'}), weatherCacheKey({lat: 33, lon: -82}));
  assert.notEqual(weatherCacheKey('Harlem, GA, US'), weatherCacheKey('Harlem, NY, US'));
});

function setup(t, forecastResponse) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  process.env.OPENWEATHER_API_KEY = 'test-key';
  t.after(() => {if (apiKey === undefined) delete process.env.OPENWEATHER_API_KEY; else process.env.OPENWEATHER_API_KEY = apiKey;});
  const entries = new Map();
  t.mock.method(db, 'collection', (name) => {
    assert.equal(name, 'weather_cache');
    return {doc: (key) => ({get: async () => ({data: () => entries.get(key)}),
      set: async (value) => entries.set(key, value)})};
  });
  const requests = [];
  t.mock.method(global, 'fetch', async (url) => {
    requests.push(url);
    if (url.includes('/forecast?')) return forecastResponse();
    return {ok: true, json: async () => current};
  });
  return {entries, requests};
}

test('forecast network errors preserve current weather and concurrent city requests share one fetch', async (t) => {
  const {entries, requests} = setup(t, () => {throw new Error('forecast offline');});
  const [first, second] = await Promise.all([fetchLocalWeather('Harlem, GA, US'), fetchLocalWeather({city: 'Harlem, GA, US'})]);
  assert.equal(first.temp, '62°');
  assert.equal(first, second);
  assert.equal(first.high, undefined);
  assert.equal(requests.length, 2);
  await fetchLocalWeather('Harlem, GA, US');
  assert.equal(requests.length, 2, 'a cache hit must not consume more provider calls');
  entries.get(weatherCacheKey('Harlem, GA, US')).cachedAtMs -= 600001;
  await fetchLocalWeather('Harlem, GA, US');
  assert.equal(requests.length, 4, 'expired weather is fetched again');
});
