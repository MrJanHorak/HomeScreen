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
