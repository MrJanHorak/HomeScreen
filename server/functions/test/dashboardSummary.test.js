const {test} = require('node:test');
const assert = require('node:assert/strict');
const db = require('../lib/utils/db');
const requestAuth = require('../lib/utils/requestAuth');
const calendar = require('../lib/services/googleCalendar');
const tasks = require('../lib/services/googleTasks');
const health = require('../lib/services/googleFit');
const weather = require('../lib/services/weatherService');
const meals = require('../lib/services/mealSheet');
const {fetchUserDashboard} = require('../lib/services/dashboardSummary');
const {handleGetDashboardSummary} = require('../lib/getDashboardSummary');
const {syncUserDashboard} = require('../lib/syncUserData');

function setup(t, preferences = {}) {
  t.mock.method(db, 'getAuthorizationVersion', async () => 0);
  t.mock.method(db, 'getDashboardCache', async () => null);
  t.mock.method(db, 'recordUserQuota', async () => true);
  const tokens = {google: {accessToken: 'fixture'}, ...preferences};
  t.mock.method(db, 'getStoredUserTokens', async () => tokens);
  t.mock.method(calendar, 'fetchCalendarEvents', async () => ({today: [], upcoming: []}));
  t.mock.method(tasks, 'fetchActiveTasks', async () => []);
  t.mock.method(health, 'fetchHealthData', async () => ({status: 'not_connected'}));
  t.mock.method(weather, 'fetchLocalWeather', async () => ({temp: '72°', condition: 'Clear'}));
  t.mock.method(meals, 'fetchMealPlan', async () => ({status: 'not_connected', items: []}));
  return tokens;
}

test('shared dashboard fetching preserves timezone, goals, locations and feed bounds', async (t) => {
  const savedLocations = [{id: 'home', name: 'Home', query: 'Denver', isDefault: true}];
  const tokens = setup(t, {stepGoal: 8000, distanceGoal: 6, weatherCity: 'Denver', savedLocations});
  t.mock.method(tasks, 'fetchActiveTasks', async () => Array.from({length: 120}, (_, i) => ({id: String(i), title: 'Task', due: null})));

  const summary = await fetchUserDashboard('owner', 'America/New_York');

  assert.deepEqual(health.fetchHealthData.mock.calls[0].arguments,
    [tokens.google, {stepGoal: 8000, distanceGoal: 6}, 'America/New_York']);
  assert.deepEqual(weather.fetchLocalWeather.mock.calls[0].arguments, ['Denver']);
  assert.deepEqual(summary.savedLocations, savedLocations);
  assert.equal(summary.tasks.length, 100);
  assert.equal(summary.weather.temp, '72°');
  assert.ok(Number.isFinite(Date.parse(summary.updatedAt)));
});

test('a failing provider keeps other dashboard cards and configured health goals', async (t) => {
  setup(t, {stepGoal: 8000, distanceGoal: 6});
  t.mock.method(health, 'fetchHealthData', async () => {throw new Error('offline');});
  const summary = await fetchUserDashboard('owner');
  assert.equal(summary.health.status, 'unavailable');
  assert.equal(summary.health.stepGoal, 8000);
  assert.equal(summary.health.distanceGoal, 6);
  assert.equal(summary.health.activeMinutes, null);
  assert.equal(summary.weather.temp, '72°');
  assert.equal(summary.meals.status, 'not_connected');
});

test('all upstream failures produce bounded, usable defaults', async (t) => {
  setup(t);
  for (const [service, name] of [[calendar, 'fetchCalendarEvents'], [tasks, 'fetchActiveTasks'],
    [health, 'fetchHealthData'], [weather, 'fetchLocalWeather'], [meals, 'fetchMealPlan']]) {
    t.mock.method(service, name, async () => {throw new Error('offline');});
  }
  const summary = await fetchUserDashboard('owner');
  assert.deepEqual(summary.schedule, []);
  assert.deepEqual(summary.upcomingEvents, []);
  assert.deepEqual(summary.tasks, []);
  assert.equal(summary.health.stepGoal, 10000);
  assert.equal(summary.health.distanceGoal, 8);
  assert.deepEqual(summary.weather, {temp: '--', condition: 'Unknown'});
  assert.equal(summary.meals.status, 'unavailable');
  assert.equal(summary.sources.calendar.status, 'unavailable');
  assert.equal(summary.sources.tasks.status, 'unavailable');
});

test('partial outages preserve last-success feeds and timestamps; a successful empty read clears them', async (t) => {
  setup(t);
  const updatedAt = new Date(Date.now() - 3600000).toISOString();
  const previous = {schedule: [{id: 'event', title: 'Saved appointment'}], upcomingEvents: [],
    tasks: [{id: 'task', title: 'Saved task', due: null}], updatedAt};
  t.mock.method(calendar, 'fetchCalendarEvents', async () => {throw new Error('Calendar outage');});
  t.mock.method(tasks, 'fetchActiveTasks', async () => {throw new Error('Tasks outage');});
  const failed = await fetchUserDashboard('owner', 'UTC', previous);
  assert.equal(failed.schedule[0].title, 'Saved appointment');
  assert.equal(failed.tasks[0].title, 'Saved task');
  assert.deepEqual(failed.sources.tasks, {status: 'unavailable', updatedAt});
  assert.deepEqual(failed.sources.calendar, {status: 'unavailable', updatedAt});
  t.mock.method(calendar, 'fetchCalendarEvents', async () => ({today: [], upcoming: []}));
  t.mock.method(tasks, 'fetchActiveTasks', async () => []);
  const recovered = await fetchUserDashboard('owner', 'UTC', failed);
  assert.deepEqual(recovered.schedule, []); assert.deepEqual(recovered.tasks, []);
  assert.equal(recovered.sources.calendar.status, 'ok');
  assert.equal(recovered.sources.tasks.status, 'ok');
});

test('disconnected Google account does not retain old feeds', async (t) => {
  setup(t, {google: {}});
  const previous = {schedule: [], upcomingEvents: [], tasks: [{id: 'old', title: 'Old task', due: null}], updatedAt: new Date().toISOString()};
  const result = await fetchUserDashboard('owner', 'UTC', previous);
  assert.equal(result.sources.tasks.status, 'not_connected');
  assert.deepEqual(result.tasks, []);
});

test('outage cache entries retry providers instead of hiding recovery for ten minutes', async (t) => {
  setup(t);
  t.mock.method(requestAuth, 'authenticatedUserId', async () => 'owner');
  t.mock.method(db, 'getDashboardCache', async () => ({cachedAtMs: Date.now(), summary: {
    schedule: [], upcomingEvents: [], tasks: [], updatedAt: new Date().toISOString(),
    sources: {calendar: {status: 'unavailable'}, tasks: {status: 'unavailable'}},
  }}));
  t.mock.method(db, 'saveDashboardCache', async () => {});
  const response = {set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body;}};
  await handleGetDashboardSummary({method: 'GET', header: () => 'UTC'}, response);
  assert.equal(response.code, 200);
  assert.equal(calendar.fetchCalendarEvents.mock.calls.length, 1);
  assert.equal(response.body.sources.calendar.status, 'ok');
});

test('dashboard reads return fresh data even if the cache write fails', async (t) => {
  setup(t);
  t.mock.method(requestAuth, 'authenticatedUserId', async () => 'owner');
  t.mock.method(db, 'getDashboardCache', async () => null);
  t.mock.method(db, 'saveDashboardCache', async () => {throw new Error('cache unavailable');});
  t.mock.method(console, 'warn', () => {});
  const response = {set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body;}};
  await handleGetDashboardSummary({method: 'GET', header: () => 'UTC'}, response);
  assert.equal(response.code, 200);
  assert.equal(response.body.weather.temp, '72°');
});

test('explicit synchronization requires a successful cache write', async (t) => {
  setup(t);
  t.mock.method(db, 'saveDashboardCache', async () => {throw new Error('cache unavailable');});
  await assert.rejects(syncUserDashboard('owner'), /cache unavailable/);
});

test('explicit synchronization still fetches fresh data when its optional previous cache cannot be read', async (t) => {
  setup(t);
  t.mock.method(db, 'getDashboardCache', async () => {throw new Error('Cache read unavailable');});
  t.mock.method(db, 'saveDashboardCache', async () => {});
  const result = await syncUserDashboard('owner');
  assert.equal(result.sources.tasks.status, 'ok');
});

test('saved default query takes precedence over obsolete legacy coordinates', async (t) => {
  setup(t, {location: {lat: 40, lon: -74}, savedLocations: [
    {id: 'home', name: 'Home', query: 'Harlem, GA, US', isDefault: true},
  ]});
  await fetchUserDashboard('owner');
  assert.deepEqual(weather.fetchLocalWeather.mock.calls[0].arguments, ['Harlem, GA, US']);
});

test('a cached dashboard rechecks the independent weather cache without refreshing Google data', async (t) => {
  setup(t);
  t.mock.method(requestAuth, 'authenticatedUserId', async () => 'owner');
  const cached = {updatedAt: '2026-10-17T20:00:00Z', weather: {temp: '82°', condition: 'Rain'},
    savedLocations: [{id: 'home', query: 'Harlem, GA, US', isDefault: true}]};
  t.mock.method(db, 'getDashboardCache', async () => ({summary: cached, cachedAtMs: Date.now()}));
  const response = {set() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body;}};
  await handleGetDashboardSummary({method: 'GET', header: () => 'UTC'}, response);
  assert.equal(response.code, 200);
  assert.equal(response.body.weather.temp, '72°');
  assert.equal(response.body.updatedAt, cached.updatedAt, 'refreshing weather must not extend other data freshness');
  assert.equal(calendar.fetchCalendarEvents.mock.callCount(), 0);
  assert.deepEqual(weather.fetchLocalWeather.mock.calls[0].arguments, ['Harlem, GA, US']);
  t.mock.method(weather, 'fetchLocalWeather', async () => ({temp: '--', condition: 'Unknown'}));
  await handleGetDashboardSummary({method: 'GET', header: () => 'UTC'}, response);
  assert.equal(response.body.weather, cached.weather, 'weather failures preserve the last usable result');
});
