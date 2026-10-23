const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {SCENARIO, parseApp} = require('../scripts/benchmark-tv.cjs');
const {compare, markdown, summarize} = require('../scripts/compare-tv-benchmarks.cjs');
function fixture() {
  return {schema: 2, label: 'before', buildId: 'old-revision', package: 'com.anonymous.mytvapp',
    device: {model: 'Test TV', android: '11', firmware: 'test-firmware'},
    app: {versionCode: 1, versionName: '1.0.0', debuggable: false},
    scenario: {...SCENARIO, component: 'com.anonymous.mytvapp/.MainActivity'},
    cold: [100, 110, 1000].map((totalTimeMs) => ({totalTimeMs})),
    resume: [{totalTimeMs: 1000, waitTimeMs: 20}, {totalTimeMs: 1000, waitTimeMs: 30}],
    navigation: [{sampledFrames: 10, p50Ms: 10, p95Ms: 20, totalFrames: 10, jankyFrames: 1},
      {sampledFrames: 100, p50Ms: 12, p95Ms: 24, totalFrames: 100, jankyFrames: 0}], memoryPssKb: 1000};
}
test('reports medians and retains named outliers without overstating frame distributions', () => {
  const before = fixture(), after = structuredClone(before);
  after.label = 'after'; after.buildId = 'new-revision';
  after.cold = [80, 100, 100].map((totalTimeMs) => ({totalTimeMs}));
  const report = compare(before, after), cold = report.rows.find((row) => row.id === 'cold');
  assert.equal(cold.before.value, 110); assert.equal(cold.after.value, 100);
  assert.equal(cold.delta, -10); assert.deepEqual(cold.before.outlierRuns, [3]);
  assert.equal(cold.before.samples, 3); assert.ok(cold.changePercent < 0);
  const text = markdown(report);
  assert.match(text, /Cold launch median, before: run 3/);
  assert.match(text, /Median of per-run frame p95/);
  assert.match(text, /do not establish statistical significance/);
  assert.match(text, /fewer than five/);
});
test('jank is weighted by frame count and its delta is in percentage points', () => {
  const before = fixture(), after = structuredClone(before);
  after.navigation[0].jankyFrames = 0;
  const row = compare(before, after).rows.find((item) => item.id === 'jank');
  assert.ok(Math.abs(row.before.value - 100 / 110) < 1e-9);
  assert.equal(row.after.value, 0);
  assert.ok(Math.abs(row.delta + 100 / 110) < 1e-9);
  assert.equal(row.before.totalFrames, 110);
  assert.match(markdown(compare(before, after)), /percentage points/);
});
test('missing metrics and zero baselines are never turned into fabricated percentage changes', () => {
  const before = fixture(), after = structuredClone(before);
  before.cold = [{totalTimeMs: 0}, null]; after.cold = [{totalTimeMs: 10}];
  before.navigation = [{sampledFrames: 0, p50Ms: 0, p95Ms: 0, totalFrames: 0, jankyFrames: 0}];
  before.memoryPssKb = null;
  const report = compare(before, after);
  assert.equal(report.rows[0].changePercent, null);
  assert.equal(report.rows.find((row) => row.id === 'navigationP95').before.value, null);
  assert.equal(report.rows.find((row) => row.id === 'jank').before.value, null);
  assert.equal(report.rows.find((row) => row.id === 'memory').delta, null);
  assert.match(markdown(report), /Unavailable metrics/);
  assert.doesNotMatch(markdown(report), /NaN|Infinity/);
});
test('known device, scenario, package and build-mode mismatches are rejected', () => {
  for (const change of [
    (record) => {record.device.firmware = 'other';},
    (record) => {record.device.model = 'Other TV';},
    (record) => {record.scenario = {...record.scenario, keySettleMs: 1};},
    (record) => {record.package = 'other.package';},
    (record) => {record.app.debuggable = true;},
  ]) {
    const before = fixture(), after = structuredClone(before); change(after);
    assert.throws(() => compare(before, after), /differ|debuggable/);
  }
});
test('legacy recordings can be summarized with explicit metadata limitations', () => {
  const legacy = fixture(); legacy.schema = 1; delete legacy.scenario; delete legacy.app; delete legacy.buildId;
  const report = compare(legacy, fixture());
  assert.ok(report.warnings.some((warning) => warning.includes('Legacy')));
  assert.ok(report.warnings.some((warning) => warning.includes('Build mode')));
  assert.throws(() => compare({...fixture(), schema: 99}, fixture()), /unsupported/);
});
test('malformed or impossible frame samples are omitted from aggregate counts', () => {
  const record = fixture();
  record.navigation = [{sampledFrames: 0, totalFrames: 10, jankyFrames: 20, p50Ms: -1, p95Ms: '10'}];
  record.resume = [{waitTimeMs: '20'}, {waitTimeMs: -1}, {waitTimeMs: NaN}];
  const summary = summarize(record);
  assert.equal(summary.navigationP50.samples, 0); assert.equal(summary.jank.samples, 0);
  assert.equal(summary.resume.value, null);
});
test('resume reports fresh WaitTime instead of a cached cold-launch TotalTime', () => {
  const record = fixture();
  record.resume = [{totalTimeMs: 2491, waitTimeMs: 54}, {totalTimeMs: 2491, waitTimeMs: 120}];
  const row = compare(record, record).rows.find((item) => item.id === 'resume');
  assert.equal(row.before.value, 87);
  assert.equal(row.label, 'Resume command wait median');
  record.resume = [{totalTimeMs: 2491}];
  assert.equal(summarize(record).resume.value, null);
});
test('selected-package metadata identifies debug builds and handles unavailable fields', () => {
  assert.deepEqual(parseApp('versionCode=1 minSdk=24\nversionName=1.0.0\npkgFlags=[ HAS_CODE DEBUGGABLE ]'),
    {versionCode: 1, versionName: '1.0.0', debuggable: true});
  assert.deepEqual(parseApp('versionCode=2\nversionName=1.0.1\nflags=[ HAS_CODE ]'),
    {versionCode: 2, versionName: '1.0.1', debuggable: false});
  assert.deepEqual(parseApp('Unavailable'), {versionCode: null, versionName: null, debuggable: null});
});
test('CLI reads files with spaces, writes a report and refuses to overwrite it', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tv-report-'));
  const files = ['before build.json', 'after build.json', 'comparison.md'].map((name) => path.join(directory, name));
  t.after(() => {for (const file of files) {if (fs.existsSync(file)) fs.unlinkSync(file);} fs.rmdirSync(directory);});
  fs.writeFileSync(files[0], JSON.stringify(fixture()));
  fs.writeFileSync(files[1], '\uFEFF' + JSON.stringify({...fixture(), label: 'after'}));
  const cli = path.resolve(__dirname, '../scripts/compare-tv-benchmarks.cjs');
  execFileSync(process.execPath, [cli, files[0], files[1], '--out', files[2]], {windowsHide: true});
  assert.match(fs.readFileSync(files[2], 'utf8'), /TV benchmark comparison/);
  assert.throws(() => execFileSync(process.execPath, [cli, files[0], files[1], '--out', files[2]], {stdio: 'pipe', windowsHide: true}), /EEXIST/);
  const json = JSON.parse(execFileSync(process.execPath, [cli, files[0], files[1], '--format', 'json'], {encoding: 'utf8', windowsHide: true}));
  assert.equal(json.rows.length, 6);
});
test('report labels cannot introduce raw HTML or additional table rows', () => {
  const record = fixture(); record.label = '<img src=x>|\n**after**';
  const text = markdown(compare(record, fixture()));
  assert.doesNotMatch(text, /<img|\n\*\*after/);
  assert.match(text, /&lt;img/);
});
