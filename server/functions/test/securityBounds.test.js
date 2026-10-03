const test = require("node:test");
const assert = require("node:assert/strict");
const {parsePreferences} = require("../lib/utils/validation");
const {boundSummary} = require("../lib/utils/summary");

test("preferences reject invalid coordinates, goals, unknown fields and duplicate locations", () => {
  assert.equal(parsePreferences({location: {lat: 91, lon: 0}}), null);
  assert.equal(parsePreferences({stepGoal: -1}), null);
  assert.equal(parsePreferences({google: {refreshToken: "plain-text"}}), null);
  assert.equal(parsePreferences({savedLocations: [
    {id: "a", name: "Home", query: "New York"},
    {id: "a", name: "Other", query: "Boston"},
  ]}), null);
  assert.deepEqual(parsePreferences({weatherCity: " Boston ", stepGoal: 8000}),
    {weatherCity: "Boston", stepGoal: 8000});
});

test("dashboard cache payload caps large provider feeds", () => {
  const today = new Date().toISOString().slice(0, 10);
  const summary = {
    schedule: Array.from({length: 100}, (_, i) => ({id: String(i), title: "A", category: "Home"})),
    upcomingEvents: Array.from({length: 200}, (_, i) => ({id: String(i), title: "B", category: "Home"})),
    tasks: Array.from({length: 130}, (_, i) => ({id: String(i), title: "Task"})),
    meals: {status: "ok", items: Array.from({length: 90}, (_, i) => ({date: today, title: String(i)}))},
    health: {}, weather: {}, updatedAt: new Date().toISOString(),
  };
  const bounded = boundSummary(summary);
  assert.equal(bounded.schedule.length, 80);
  assert.equal(bounded.upcomingEvents.length, 160);
  assert.equal(bounded.tasks.length, 100);
  assert.equal(bounded.meals.items.length, 60);
});
