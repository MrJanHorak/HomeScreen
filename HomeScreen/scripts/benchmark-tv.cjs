#!/usr/bin/env node
// Scenarios inspired by CleanYourTV; see ../THIRD_PARTY_NOTICES.md.
// This dashboard is launched explicitly: KEYCODE_HOME would benchmark the stock launcher.
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const SCENARIO = Object.freeze({version: 1, coldSettleMs: 3000, settingsSettleMs: 1000,
  resumeSettleMs: 2000, keySettleMs: 300, memorySettleMs: 5000,
  keys: Object.freeze([22, 22, 21, 20, 22, 21, 19, 21])});

function parseApp(text) {
  const code = text.match(/\bversionCode=(\d+)/);
  const name = text.match(/\bversionName=([^\r\n]+)/);
  const flags = text.match(/\b(?:pkgFlags|flags)=\[([^\]]*)\]/);
  return {versionCode: code ? Number(code[1]) : null, versionName: name ? name[1].trim().slice(0, 100) : null,
    debuggable: flags ? /\bDEBUGGABLE\b/.test(flags[1]) : null};
}

function parseLaunch(text) {
  if (!/^Status:\s*ok\s*$/m.test(text) || /Error:|Exception|unable to resolve/i.test(text)) {
    throw new Error('Android did not report a successful activity launch. Check the package/component.');
  }
  const field = (name) => {
    const match = text.match(new RegExp(`^${name}:\\s*(\\d+)\\s*$`, 'm'));
    return match ? Number(match[1]) : null;
  };
  return {totalTimeMs: field('TotalTime'), waitTimeMs: field('WaitTime')};
}

function parseFrames(text) {
  const durations = [];
  let columns;
  for (const line of text.split(/\r?\n/)) {
    const values = line.split(',').map((item) => item.trim());
    if (values[0] === 'Flags') {columns = values; continue;}
    if (!columns || !/^\d+$/.test(values[0]) || Number(values[0]) !== 0) continue;
    const start = Number(values[columns.indexOf('IntendedVsync')]);
    const end = Number(values[columns.indexOf('FrameCompleted')]);
    if (Number.isFinite(start) && start > 0 && Number.isFinite(end) && end >= start && end < 9e18) {
      durations.push((end - start) / 1e6);
    }
  }
  durations.sort((a, b) => a - b);
  const percentile = (p) => durations.length ? durations[Math.ceil(durations.length * p) - 1] : null;
  const total = text.match(/^\s*Total frames rendered:\s*(\d+)/m);
  const janky = text.match(/^\s*Janky frames:\s*(\d+)/m);
  return {sampledFrames: durations.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95),
    totalFrames: total ? Number(total[1]) : null, jankyFrames: janky ? Number(janky[1]) : null};
}

function parseMemory(text) {
  const match = text.match(/TOTAL PSS:\s*(\d+)/) || text.match(/^\s*TOTAL\s+(\d+)/m);
  return match ? Number(match[1]) : null;
}

function options(args) {
  const result = {package: 'com.anonymous.mytvapp', runs: 5, label: 'baseline', out: 'artifacts/tv-benchmarks', adb: process.env.ADB || 'adb'};
  const allowed = new Set(['serial', 'package', 'component', 'runs', 'label', 'out', 'adb', 'build-id']);
  for (let index = 0; index < args.length; index++) {
    const name = args[index].replace(/^--/, '');
    if (name === 'help' || name === 'dry-run') {result[name] = true; continue;}
    if (!args[index].startsWith('--') || !allowed.has(name) || !args[index + 1] || args[index + 1].startsWith('--')) {
      throw new Error(`Unknown option or missing value: ${args[index]}`);
    }
    result[name] = args[++index];
  }
  if (result.help) return result;
  if (!result.serial || !/^[a-zA-Z0-9._:[\]-]+$/.test(result.serial)) throw new Error('--serial is required (ADB device serial or IP:port).');
  if (!/^[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+$/.test(result.package)) throw new Error('Invalid Android package name.');
  result.component ||= `${result.package}/.MainActivity`;
  if (!new RegExp(`^${result.package.replace(/\./g, '\\.')}\\/[a-zA-Z.$_][a-zA-Z0-9.$_]*$`).test(result.component)) throw new Error('Component must belong to the target package.');
  result.runs = Number(result.runs);
  if (!Number.isInteger(result.runs) || result.runs < 1 || result.runs > 30) throw new Error('--runs must be an integer from 1 to 30.');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(result.label)) throw new Error('Use a short filename-safe label.');
  if (result['build-id'] && (!/^[\x20-\x7e]{1,100}$/.test(result['build-id']))) throw new Error('--build-id must be 1–100 printable characters.');
  return result;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function benchmark(config) {
  const commands = [];
  const adb = (...args) => {
    commands.push(args);
    if (config['dry-run']) return '';
    return execFileSync(config.adb, ['-s', config.serial, ...args], {encoding: 'utf8', timeout: 30_000, windowsHide: true});
  };
  const wait = config['dry-run'] ? async () => {} : sleep;
  const shell = (...args) => adb('shell', ...args);
  const launch = (...args) => {
    const output = shell('am', 'start', '-W', ...args);
    return config['dry-run'] ? null : parseLaunch(output);
  };
  if (!config['dry-run'] && adb('get-state').trim() !== 'device') throw new Error('The selected ADB device is not ready.');
  const result = {schema: 2, label: config.label, recordedAt: new Date().toISOString(), package: config.package,
    buildId: config['build-id'] || null, scenario: {...SCENARIO, component: config.component},
    app: parseApp(shell('dumpsys', 'package', config.package)),
    device: {model: shell('getprop', 'ro.product.model').trim(), android: shell('getprop', 'ro.build.version.release').trim(),
      firmware: shell('getprop', 'ro.build.display.id').trim()}, cold: [], resume: [], navigation: [], memoryPssKb: null};
  for (let run = 0; run < config.runs; run++) {
    process.stdout.write(`Run ${run + 1}/${config.runs}\n`);
    shell('am', 'force-stop', config.package);
    result.cold.push(launch('-n', config.component));
    await wait(SCENARIO.coldSettleMs);
    launch('-a', 'android.settings.SETTINGS');
    await wait(SCENARIO.settingsSettleMs);
    result.resume.push(launch('-n', config.component));
    await wait(SCENARIO.resumeSettleMs);
    shell('dumpsys', 'gfxinfo', config.package, 'reset');
    // Fixed sequence across row boundaries. No OK/Enter: never activate a household action.
    for (const key of SCENARIO.keys) {
      shell('input', 'keyevent', String(key));
      await wait(SCENARIO.keySettleMs);
    }
    const frames = shell('dumpsys', 'gfxinfo', config.package, 'framestats');
    result.navigation.push(parseFrames(frames));
  }
  await wait(SCENARIO.memorySettleMs);
  result.memoryPssKb = parseMemory(shell('dumpsys', 'meminfo', config.package));
  if (config['dry-run']) {process.stdout.write(JSON.stringify({commands}, null, 2) + '\n'); return;}
  const directory = path.resolve(config.out);
  fs.mkdirSync(directory, {recursive: true});
  const file = path.join(directory, `${config.label}-${result.recordedAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  process.stdout.write(`Saved ${file}\nAndroid launch times measure activity startup, not populated dashboard readiness. Frame timing is not remote input latency.\n`);
}

async function main() {
  const config = options(process.argv.slice(2));
  if (config.help) {
    process.stdout.write('Usage: node scripts/benchmark-tv.cjs --serial IP:PORT [--label before] [--build-id COMMIT] [--runs 5] [--out DIR] [--adb PATH] [--package NAME] [--component PACKAGE/ACTIVITY] [--dry-run]\nSwitches between HomeScreen and Android Settings, force-stops HomeScreen for cold starts, and sends arrow keys. Use a test TV with dialogs closed. Build ID is a label supplied by the operator.\n');
    return;
  }
  await benchmark(config);
}
if (require.main === module) main().catch((error) => {process.stderr.write(`${error.message}\n`); process.exitCode = 1;});
module.exports = {parseLaunch, parseFrames, parseMemory, parseApp, options, benchmark, SCENARIO};
