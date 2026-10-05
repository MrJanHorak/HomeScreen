const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
  const result = {exports: {}};
  new Function('module', 'exports', code)(result, result.exports);
  return result.exports;
}
const {planCardContent, activityLayout, activitySummaryHeight, lineKey} = load('src/components/dashboard/shared/cardContentLayout.ts');
const {gridRect} = load('../server/functions/src/utils/dashboardLayout.ts');
const sizes = [[900, 340, 8, 12, 1], [1800, 740, 12, 20, 1.4]];
const lines = Array.from({length: 30}, (_, i) => ({title: `Upcoming dinner ${i + 1}`, detail: '10-05 · Serves 6'}));
test('all 50 legal footprints at compact and full size fit rows inside the content box', () => {
  for (const [areaWidth, areaHeight, gap, padding, scale] of sizes) {
    for (let w = 3; w <= 12; w++) for (let h = 2; h <= 6; h++) {
      const rect = gridRect({x: 0, y: 0, width: w, height: h}, areaWidth, areaHeight, gap);
      const width = rect.width - padding * 2 - 3; const height = rect.height - padding * 2 - 3;
      for (const title of ['Dinner', 'High-Protein Turkey & Beef Quick Chili', 'A very long dinner title that must wrap several times before its full description fits']) {
        const plan = planCardContent({width, height, scale, title, subtitle: 'Tonight · Serves 6', lines});
        assert.ok(plan.count >= 0 && plan.count <= lines.length);
        assert.ok(plan.used <= Math.max(0, height - plan.hero) + 0.01, `${w}x${h}: overflowing rows`);
        if (plan.count < lines.length) assert.ok(height - plan.hero - plan.used < plan.gap + plan.rowLine + 1, `${w}x${h}: unused room for another compact row`);
      }
    }
  }
});
test('the reported wide meal tile shows following dinners even before native measurements arrive', () => {
  const input = {width: 425, scale: 1, presentation: 'meal', title: 'High-Protein Turkey & Beef Quick Chili', subtitle: 'Tonight · Serves 6', lines};
  const plan = planCardContent({...input, height: 199});
  assert.equal(plan.count, 2);
  assert.equal(plan.columns, 1);
  assert.equal(plan.density, 'comfortable');
  assert.equal(plan.rowSize, 14);
  assert.ok(planCardContent({...input, height: 299}).count > plan.count);
  assert.equal(planCardContent({...input, height: 500}).count, 4);
});
test('media prioritizes large posters and readable previews over queue density', () => {
  const plan = planCardContent({width: 190, height: 340, scale: 1, presentation: 'media', title: 'Featured program',
    artWidth: 84, artHeight: 120, lines: lines.map((line) => ({...line, posterUri: null}))});
  assert.equal(plan.columns, 1);
  assert.equal(plan.density, 'comfortable');
  assert.equal(plan.posterHeight, 64);
  assert.equal(plan.posterWidth, 45);
  assert.equal(plan.count, 2);
});
test('weekly totals fit independently of the chart and persist as height grows', () => {
  for (const scale of [1, 1.4]) {
    assert.equal(activitySummaryHeight(43 * scale, scale, true), 0);
    assert.equal(activitySummaryHeight(44 * scale, scale, true), 44 * scale);
    assert.equal(activitySummaryHeight(90 * scale, scale, true), 62 * scale);
    assert.equal(activitySummaryHeight(90 * scale, scale, false), 0);
  }
});
test('measured one-line summaries reclaim space; measured rows prevent overflow', () => {
  const input = {width: 190, height: 135, scale: 1, title: 'Dinner with a long name', subtitle: 'Tonight', lines};
  const before = planCardContent(input);
  const measured = planCardContent({...input, measuredHero: 64});
  assert.ok(measured.count >= before.count);
  const measurements = Object.fromEntries(lines.map((line) => [lineKey(line, 190, 'compact', 1), 30]));
  const larger = planCardContent({...input, measuredHero: 64, measurements});
  assert.ok(larger.used <= 71); assert.ok(larger.count < measured.count);
});
test('the original-size Activity tile retains all metrics and the ring before weekly graphics', () => {
  assert.equal(activityLayout(190, 140, 1, false), 'ring');
  assert.equal(activityLayout(190, 140, 1, true), 'ring');
  assert.equal(activityLayout(190, 80, 1, true), 'metrics');
  assert.equal(activityLayout(500, 180, 1, true), 'weekly-wide');
  assert.equal(activityLayout(190, 300, 1, true), 'weekly-tall');
  assert.equal(activityLayout(190 * 1.4, 140 * 1.4, 1.4, true), 'ring');
});
