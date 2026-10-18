const {test} = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadPureModule.cjs');
const {preferWeather, weatherLocationKey, weatherRefreshInterval} = load('src/services/weatherState.ts');
const {formatWeatherRange, formatWeatherObservation, formatResolvedWeatherLocation} = load('src/helpers/weatherHelpers.ts');
const weather = {temp: '62°', condition: 'Clear', high: 65, low: 43,
  observedAt: '2026-10-17T22:00:00Z', fetchedAt: '2026-10-17T22:05:00Z', timezoneOffset: -14400};

test('failed, legacy and older weather cannot overwrite newer usable conditions', () => {
  for (const next of [{temp: '--', condition: 'Unknown'}, {temp: '82°', condition: 'Rain'},
    {...weather, observedAt: '2026-10-17T21:00:00Z', fetchedAt: '2026-10-17T22:10:00Z'},
    {...weather, fetchedAt: '2026-10-17T22:01:00Z'}]) {
    assert.equal(preferWeather(weather, next), weather);
  }
  const next = {...weather, temp: '61°', observedAt: '2026-10-17T22:10:00Z'};
  assert.equal(preferWeather(weather, next), next);
  assert.equal(preferWeather({temp: '--', condition: 'Unavailable'}, weather), weather);
});

test('unverified legacy H/L is hidden and a future sample range has an honest label', () => {
  assert.equal(formatWeatherRange(weather), '');
  assert.equal(formatWeatherRange({...weather, highLowPeriod: 'rest_of_day'}), 'Rest of day H 65° · L 43°');
  assert.equal(formatWeatherRange({...weather, highLowPeriod: 'rest_of_day', low: undefined}), '');
});

test('observation uses the weather location time, including a local date behind UTC', () => {
  assert.match(formatWeatherObservation({...weather, observedAt: '2026-10-18T02:00:00Z'}), /Oct 17.*10:00 PM.*location time/);
  assert.equal(formatWeatherObservation({temp: '--', condition: 'Unknown'}), 'Observation time unavailable');
  assert.match(formatResolvedWeatherLocation({...weather, resolvedLocation: {name: 'Harlem', country: 'US', lat: 33.414, lon: -82.312}}), /Harlem, US \(33.414, -82.312\)/);
});

test('city identity follows the query and large lists stay below the hourly lookup quota', () => {
  assert.equal(weatherLocationKey({id: 'home', name: 'Home', query: ' Boston, US '}), 'boston, us');
  assert.equal(weatherRefreshInterval(1), 600000);
  assert.ok(19 * 3600000 / weatherRefreshInterval(19) <= 48);
});
