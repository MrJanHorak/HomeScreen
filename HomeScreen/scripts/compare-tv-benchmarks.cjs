#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const valid = (number) => typeof number === 'number' && Number.isFinite(number) && number >= 0;
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function samples(runs, key, requireFrames = false) {
  const values = runs.flatMap((run, index) => run && valid(run[key]) && (!requireFrames || run.sampledFrames > 0)
    ? [{run: index + 1, value: run[key]}] : []);
  const value = median(values.map((sample) => sample.value));
  return {value, samples: values.length, outlierRuns: value > 0 ? values.filter((sample) => sample.value > 2 * value).map((sample) => sample.run) : []};
}
function validate(record, label) {
  if (!record || ![1, 2].includes(record.schema) || typeof record.package !== 'string' || !record.device ||
    !['cold', 'resume', 'navigation'].every((field) => Array.isArray(record[field]) && record[field].length <= 30)) {
    throw new Error(`${label}: unsupported or malformed benchmark record.`);
  }
  if (record.schema === 2 && (!record.scenario || record.scenario.version !== 1)) throw new Error(`${label}: unsupported benchmark scenario.`);
}
function summarize(record) {
  const navigation = record.navigation.filter((run) => run && valid(run.totalFrames) && run.totalFrames > 0 &&
    valid(run.jankyFrames) && run.jankyFrames <= run.totalFrames);
  const total = navigation.reduce((sum, run) => sum + run.totalFrames, 0);
  const janky = navigation.reduce((sum, run) => sum + run.jankyFrames, 0);
  return {
    // Reused activities can repeat their previous cold TotalTime. WaitTime is the fresh command wait.
    cold: samples(record.cold, 'totalTimeMs'), resume: samples(record.resume, 'waitTimeMs'),
    navigationP50: samples(record.navigation, 'p50Ms', true), navigationP95: samples(record.navigation, 'p95Ms', true),
    jank: {value: total ? 100 * janky / total : null, samples: navigation.length, totalFrames: total, jankyFrames: janky},
    memory: {value: valid(record.memoryPssKb) ? record.memoryPssKb : null, samples: valid(record.memoryPssKb) ? 1 : 0},
  };
}
function compare(before, after) {
  validate(before, 'Before'); validate(after, 'After');
  const warnings = [];
  if (before.package !== after.package) throw new Error('Package names differ; record both builds of the same app.');
  for (const field of ['model', 'android', 'firmware']) {
    if (before.device[field] && after.device[field]) {
      if (before.device[field] !== after.device[field]) throw new Error(`Device ${field} differs; the measurements are not comparable.`);
    } else warnings.push(`Device ${field} is missing; compatibility could not be checked.`);
  }
  if (before.scenario && after.scenario) {
    const keys = ['version', 'component', 'coldSettleMs', 'settingsSettleMs', 'resumeSettleMs', 'keySettleMs', 'memorySettleMs', 'keys'];
    for (const key of keys) {
      if (before.scenario[key] === undefined || after.scenario[key] === undefined) throw new Error(`Scenario ${key} is missing.`);
      if (JSON.stringify(before.scenario[key]) !== JSON.stringify(after.scenario[key])) throw new Error(`Benchmark scenario ${key} differs.`);
    }
  } else warnings.push('Legacy results omit scenario metadata; matching timing/key settings could not be checked.');
  if (typeof before.app?.debuggable === 'boolean' && typeof after.app?.debuggable === 'boolean') {
    if (before.app.debuggable !== after.app.debuggable) throw new Error('One app is debuggable and the other is not; use the same build mode.');
  } else warnings.push('Build mode is unknown for at least one recording.');
  if (!before.buildId || !after.buildId) warnings.push('At least one build ID is missing. Installed app versions may not identify the source revision.');
  const a = summarize(before), b = summarize(after);
  const rows = [
    ['cold', 'Cold launch median', 'ms'], ['resume', 'Resume command wait median', 'ms'],
    ['navigationP50', 'Median of per-run frame p50', 'ms'], ['navigationP95', 'Median of per-run frame p95', 'ms'],
    ['jank', 'Janky frames (weighted)', '%'], ['memory', 'Final PSS snapshot', 'KiB'],
  ].map(([id, label, unit]) => {
    const first = a[id], last = b[id];
    const delta = first.value !== null && last.value !== null ? last.value - first.value : null;
    return {id, label, unit, before: first, after: last, delta,
      changePercent: delta !== null && first.value > 0 ? 100 * delta / first.value : null};
  });
  if (rows.slice(0, 4).some((row) => row.before.samples < 5 || row.after.samples < 5)) warnings.push('At least one timing metric has fewer than five valid runs.');
  if (rows.some((row) => row.before.value === null || row.after.value === null)) warnings.push('Unavailable metrics are shown as missing, not zero.');
  return {schema: 1, before: {label: before.label, buildId: before.buildId || null, app: before.app || null, recordedAt: before.recordedAt},
    after: {label: after.label, buildId: after.buildId || null, app: after.app || null, recordedAt: after.recordedAt},
    device: before.device, package: before.package, rows, warnings};
}
const escape = (value) => String(value ?? 'unknown').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\\/g, '\\\\').replace(/[|`*_[\]]/g, '\\$&').replace(/[\r\n]+/g, ' ');
const number = (value, signed = false) => value === null ? '—' : `${signed && value > 0 ? '+' : ''}${value.toFixed(2)}`;
function markdown(report) {
  const text = ['# TV benchmark comparison', '',
    `Device: ${escape(report.device.model)} · Android ${escape(report.device.android)} · Firmware ${escape(report.device.firmware)}`,
    `Before: ${escape(report.before.label)} (${escape(report.before.buildId)}) · After: ${escape(report.after.label)} (${escape(report.after.buildId)})`, '',
    '| Metric | Before | After | Delta | Change | Valid runs before/after |',
    '| --- | ---: | ---: | ---: | ---: | ---: |'];
  for (const row of report.rows) {
    text.push(`| ${row.label} (${row.unit}) | ${number(row.before.value)} | ${number(row.after.value)} | ${number(row.delta, true)} | ${row.id === 'jank' ? '—' : number(row.changePercent, true) + (row.changePercent === null ? '' : '%')} | ${row.before.samples}/${row.after.samples} |`);
  }
  text.push('', 'Delta is after minus before. Negative values mean a lower measured cost. Jank delta is percentage points. Memory is one snapshot per recording.', '',
    'Outliers above twice the median remain in the calculations:');
  const outliers = report.rows.flatMap((row) => ['before', 'after'].flatMap((side) => row[side].outlierRuns?.length
    ? [`- ${row.label}, ${side}: run ${row[side].outlierRuns.join(', ')}`] : []));
  text.push(...(outliers.length ? outliers : ['- None flagged.']));
  if (report.warnings.length) text.push('', 'Comparison notes:', ...report.warnings.map((warning) => `- ${warning}`));
  text.push('', 'Cold launch uses Android TotalTime; resume uses Android WaitTime because reused activities can report a cached TotalTime. Resume command wait is not a first-frame or key-to-focus measurement. Activity launch time does not measure populated dashboard readiness. Frame duration does not measure key-to-focus latency. Frame percentiles summarize each run’s ring-buffer sample. Matching metadata does not verify the same physical TV, household data, layout, wallpaper, or motion setting. These measurements do not establish statistical significance.', '');
  return text.join('\n');
}
function read(file) {
  if (fs.statSync(file).size > 1024 * 1024) throw new Error('Benchmark record exceeds 1 MiB.');
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}
function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write('Usage: node scripts/compare-tv-benchmarks.cjs BEFORE.json AFTER.json [--format markdown|json] [--out FILE]\nCreates a comparison without contacting the TV. Existing output files are never overwritten.\n'); return;
  }
  if (args.length < 2 || args[0].startsWith('--') || args[1].startsWith('--')) throw new Error('Supply BEFORE.json and AFTER.json; use --help for usage.');
  let format = 'markdown', out;
  for (let index = 2; index < args.length; index += 2) {
    if (args[index] === '--format' && ['markdown', 'json'].includes(args[index + 1])) format = args[index + 1];
    else if (args[index] === '--out' && args[index + 1] && !args[index + 1].startsWith('--')) out = args[index + 1];
    else throw new Error(`Unknown option or missing value: ${args[index]}`);
  }
  const report = compare(read(args[0]), read(args[1]));
  const output = format === 'json' ? JSON.stringify(report, null, 2) + '\n' : markdown(report);
  if (out) {fs.writeFileSync(out, output, {flag: 'wx'}); process.stdout.write(`Saved ${path.resolve(out)}\n`);}
  else process.stdout.write(output);
}
if (require.main === module) {try {main(process.argv.slice(2));} catch (error) {process.stderr.write(`${error.message}\n`); process.exitCode = 1;}}
module.exports = {median, summarize, compare, markdown, main};
