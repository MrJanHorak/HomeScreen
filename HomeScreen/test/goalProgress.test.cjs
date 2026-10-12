const {test} = require('node:test');
const assert = require('node:assert/strict');
const {goalProgress, goalProgressLayers} = require('./loadPureModule.cjs')('src/helpers/goalProgress.ts');

test('step counts retain over-goal progress independently of capped summary data', () => {
  assert.equal(goalProgress(14083, 10000), 1.4083);
  assert.equal(goalProgress(7000, 5000), 1.4);
  assert.equal(goalProgress(10000, 10000), 1);
  assert.equal(goalProgress(0, 10000), 0);
  for (const [steps, goal] of [[1000, 0], [-1, 10000], [NaN, 10000], [1000, Infinity]]) {
    assert.equal(goalProgress(steps, goal), 0);
  }
});

test('completed goal stays full while excess fills a second layer and totals stay uncapped', () => {
  assert.deepEqual(goalProgressLayers(.5), {value: .5, percent: 50, base: .5, overflow: 0});
  assert.deepEqual(goalProgressLayers(1), {value: 1, percent: 100, base: 1, overflow: 0});
  const extra = goalProgressLayers(goalProgress(14083, 10000));
  assert.equal(extra.base, 1);
  assert.equal(extra.percent, 141);
  assert.ok(Math.abs(extra.overflow - .4083) < 1e-9);
  assert.deepEqual(goalProgressLayers(2), {value: 2, percent: 200, base: 1, overflow: 1});
  assert.deepEqual(goalProgressLayers(2.5), {value: 2.5, percent: 250, base: 1, overflow: 1});
  for (const invalid of [-1, NaN, Infinity]) {
    assert.deepEqual(goalProgressLayers(invalid), {value: 0, percent: 0, base: 0, overflow: 0});
  }
});
