const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync('src/helpers/activitySummary.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
}).outputText;
const loaded = {exports: {}};
new Function('module', 'exports', code)(loaded, loaded.exports);
const {summarizeActivityWeek, activityChartPeak, activityBarPercent} = loaded.exports;

const day = (steps, activeMinutes) => ({date: '2026-10-05', steps, distance: 1.25, calories: 100.5, activeMinutes});

test('weekly summaries count recorded zero minutes and exclude missing days from their coverage', () => {
  const weekly = [day(1000, null), day(2000, 0), day(3000, 15)];
  assert.deepEqual(summarizeActivityWeek(weekly), {
    steps: 6000, averageSteps: 2000, distance: 3.75, calories: 301.5,
    moveMinutes: 15, daysWithMoveMinutes: 2,
  });
  assert.equal(summarizeActivityWeek([day(0, 0)]).moveMinutes, 0);
  assert.equal(summarizeActivityWeek([day(0, null)]).moveMinutes, null);
});

test('empty weekly data produces finite totals without inventing Move Minutes', () => {
  assert.deepEqual(summarizeActivityWeek([]), {
    steps: 0, averageSteps: 0, distance: 0, calories: 0,
    moveMinutes: null, daysWithMoveMinutes: 0,
  });
});

test('activity bars use the larger of the goal and recorded steps and preserve true zero days', () => {
  assert.equal(activityChartPeak([day(12000, 0)], 10000), 12000);
  assert.equal(activityChartPeak([day(3000, 0)], 10000), 10000);
  const emptyPeak = activityChartPeak([], 0);
  assert.equal(activityBarPercent(0, emptyPeak), 0);
  assert.equal(activityBarPercent(1, 10000), 3);
  assert.equal(activityBarPercent(5000, 10000), 50);
});
