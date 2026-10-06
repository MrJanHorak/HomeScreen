const {test} = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadPureModule.cjs');
const {planCardContent, activityLayout, activitySummaryHeight, activityMiniChartWidth, lineKey} = load('src/components/dashboard/shared/cardContentLayout.ts');
const {mediaArtworkLayout} = load('src/components/dashboard/media/mediaArtworkLayout.ts');
const {gridRect} = load('../server/functions/src/utils/dashboardLayout.ts');
const sizes = [[900, 340, 8, 12, 1], [1800, 740, 12, 20, 1.4]];
const lines = Array.from({length: 30}, (_, i) => ({title: `Upcoming dinner ${i + 1}`, detail: '10-05 · Serves 6'}));
test('short Media cards fit a supplied poster and text-column progress in every reference footprint', () => {
  for (const [A,B,g,p,scale] of sizes) for (let w=3;w<=12;w++) for (let h=2;h<=6;h++) {
    const r=gridRect({x:0,y:0,width:w,height:h},A,B,g);
    const width=r.width-p*2-3, height=r.height-p*2-3;
    const art=mediaArtworkLayout(width,height,scale);
    assert.ok(art.artHeight>=40*scale&&art.artHeight<=120*scale);
    const plan=planCardContent({width,height,scale,presentation:'media',title:'Agent P Under C',subtitle:'Disney+ · Perry Hawaiian Style',
      lines:[],...art,extraHeight:5});
    assert.ok(plan.hero<=height,`${w}x${h} hero overflows`);
    assert.ok(plan.heroWidth-art.artWidth-plan.gap>=120*scale-0.01);
  }
  assert.equal(mediaArtworkLayout(265,80,1).artHeight,48);
  assert.equal(mediaArtworkLayout(170,80,1).artHeight,0);
  assert.equal(mediaArtworkLayout(265,60,1).artHeight,0);
});

test('miniature weekly bars fit beside totals within the existing summary reservation', () => {
  for(const scale of [1,1.4]) {
    assert.equal(activityMiniChartWidth(219*scale,scale,true),0);
    assert.equal(activityMiniChartWidth(346*scale,scale,false),0);
    const width=activityMiniChartWidth(346*scale,scale,true);
    assert.ok(width>=98*scale&&width<=140*scale);
    assert.ok(346*scale-width-10*scale>=112*scale);
    assert.equal(activitySummaryHeight(62*scale,scale,true),62*scale);
  }
});
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
  const input = {width: 425, scale: 1, presentation: 'meal', title: 'High-Protein Turkey & Beef Quick Chili', subtitle: 'Tonight · Serves 6', lines:lines.map(line=>({...line,section:'Next dinners'}))};
  const plan = planCardContent({...input, height: 199});
  assert.equal(plan.count, 2);
  assert.equal(plan.columns, 1);
  assert.equal(plan.density, 'comfortable');
  assert.equal(plan.rowSize, 14);
  assert.ok(planCardContent({...input, height: 299}).count > plan.count);
  assert.equal(planCardContent({...input, height: 500}).count, 4);
});

test('grouped meal/media previews keep their entries as dimensions and emphasis grow', () => {
  for (const presentation of ['meal','media']) for (const title of ['Dinner','A long featured title with important names and details to preserve']) {
    const input={scale:1,presentation,title,subtitle:'Primary information with additional context',lines:lines.map(line=>({...line,section:'Next',...(presentation==='media'?{posterUri:null}:{})}))};
    for (const width of [192,284,419,649,650,873,1255]) {
      let previous=0;
      for(let height=81;height<=500;height++) {
        const plan=planCardContent({...input,width,height});
        assert.ok(plan.count>=previous,`${presentation} ${width}x${height} lost a preview`);
        previous=plan.count;
      }
    }
  }
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
