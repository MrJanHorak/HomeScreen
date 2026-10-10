const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX},
  }).outputText;
  const module = {exports: {}};
  new Function('module', 'exports', 'require', code)(module, module.exports, (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  });
  return module.exports;
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};
function summary(title = 'Dinner') {
  return {schedule: [], upcomingEvents: [], tasks: [{id: 'task', title, due: null}],
    meals: {status: 'not_connected', items: []}, weather: {temp: '72°', condition: 'Sunny'},
    health: {steps: 100, stepGoal: 10000, distance: 1, distanceGoal: 8, calories: 20, activeMinutes: null, progress: 1},
    updatedAt: new Date(Date.now() - 1000).toISOString(),
    savedLocations: [{id: 'denver', query: 'Denver, US', name: 'Denver', isDefault: true}]};
}
function storageSetup(overrides = {}) {
  const disk = new Map();
  const storage = {getItem: async (key) => disk.get(key) || null,
    setItem: async (key, value) => {disk.set(key, value);},
    removeItem: async (key) => {disk.delete(key);}, ...overrides};
  return {disk, storage, cache: load('src/services/dashboardCache.ts', {'@react-native-async-storage/async-storage': storage})};
}
test('cold start restores the entire successful summary only for its account', async () => {
  const {cache} = storageSetup();
  const data = summary();
  await cache.saveDashboardCache('owner', data);
  assert.deepEqual(await cache.loadDashboardCache('owner'), data);
  assert.equal(await cache.loadDashboardCache('another-owner'), null);
  assert.equal(await cache.loadDashboardCache(''), null);
});
test('expired, future-dated, incompatible and corrupted entries are ignored', async () => {
  const {cache, disk} = storageSetup();
  const key = `${cache.DASHBOARD_CACHE_KEY}:owner`;
  const data = summary();
  const entries = [
    '{broken', JSON.stringify({version: 2, uid: 'owner', summary: data}),
    JSON.stringify({version: 1, uid: 'other', summary: data}),
    ...[new Date(Date.now() - cache.DASHBOARD_CACHE_MAX_AGE_MS - 1000).toISOString(),
      new Date(Date.now() + 60000).toISOString(), 'invalid'].map((updatedAt) =>
      JSON.stringify({version: 1, uid: 'owner', summary: {...data, updatedAt}})),
    JSON.stringify({version: 1, uid: 'owner', summary: {...data, tasks: [{}]}}),
    JSON.stringify({version: 1, uid: 'owner', summary: {...data, weather: {...data.weather, forecast: [{}]}}}),
    'x'.repeat(1024 * 1024 + 1),
  ];
  for (const raw of entries) {disk.set(key, raw); assert.equal(await cache.loadDashboardCache('owner'), null);}
});
test('storage errors do not block restoration or refresh persistence', async () => {
  const fail = async () => {throw new Error('Disk unavailable');};
  const {cache} = storageSetup({getItem: fail, setItem: fail, removeItem: fail});
  assert.equal(await cache.loadDashboardCache('owner'), null);
  await cache.saveDashboardCache('owner', summary());
  await cache.clearDashboardCache('owner');
});
test('sign-out removal waits for an in-flight cache save and preserves other accounts', async () => {
  const write = deferred();
  const {cache, disk} = storageSetup({setItem: async (key, raw) => {await write.promise; disk.set(key, raw);}});
  const saved = cache.saveDashboardCache('owner', summary());
  const cleared = cache.clearDashboardCache('owner');
  const other = cache.saveDashboardCache('other', summary());
  write.resolve();
  await Promise.all([saved, cleared, other]);
  assert.equal(await cache.loadDashboardCache('owner'), null);
  assert.ok(await cache.loadDashboardCache('other'));
});
test('local account cleanup includes the dashboard snapshot', async () => {
  const events = [];
  const local = load('src/services/localUserData.ts', {
    '@react-native-async-storage/async-storage': {multiRemove: async () => events.push('preferences')},
    './dashboardCache': {clearDashboardCache: async (uid) => events.push(uid)},
    './weatherLocationService': {STORAGE_KEY_LOCATIONS: 'locations', STORAGE_KEY_ACTIVE_LOC: 'active'},
  });
  await local.clearLocalUserData('owner');
  assert.deepEqual(events, ['owner', 'preferences']);
});
const {createDashboardSession} = load('src/services/dashboardSession.ts');
function themeSetup({diskFails = false} = {}) {
  const states = [], refs = [], dependencies = [], cleanup = [];
  let stateIndex, refIndex, effectIndex, queued;
  const remote = deferred(), write = deferred();
  const local = {palette: 'forest', background: 'solid', backgroundColor: '#123456'};
  const defaults = {palette: 'midnight', background: 'solid'};
  const react = {
    createContext: () => ({Provider: 'provider'}),
    useState: (value) => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = value;
      return [states[index], (next) => {states[index] = typeof next === 'function' ? next(states[index]) : next;}];
    },
    useRef: (value) => {const index = refIndex++; return refs[index] ||= {current: value};},
    useMemo: (fn) => fn(),
    useEffect: (fn, deps) => {
      const index = effectIndex++;
      if (!dependencies[index] || deps.some((dep, i) => dep !== dependencies[index][i])) queued.push(fn);
      dependencies[index] = deps;
    },
  };
  const {ThemeProvider} = load('src/theme/ThemeContext.tsx', {
    react, 'react/jsx-runtime': {jsx: (_type, props) => props},
    './useReadingFonts': () => [true, null],
    '../../../server/functions/src/utils/reading': {normalizeReading: (value) => value},
    '../../../server/functions/src/utils/widgets': {},
    '@react-native-async-storage/async-storage': {
      getItem: async () => {if (diskFails) throw new Error('Disk unavailable'); return JSON.stringify(local);},
      setItem: async () => {},
    },
    'react-native': {Platform: {OS: 'android'}},
    '../context/AuthContext': {useAuth: () => ({user: {uid: 'owner'}})},
    '../services/api': {getUserAppearance: () => remote.promise, saveUserAppearance: () => write.promise,
      getSavedGooglePhoto: async () => null, getSavedGooglePhotos: async () => []},
    './appearance': {DEFAULT_APPEARANCE: defaults, normalizeAppearance: (value) => value},
    './tvTheme': {TVTheme: {}, themeForPalette: () => ({})},
  });
  const render = () => {
    stateIndex = refIndex = effectIndex = 0; queued = [];
    const value = ThemeProvider({children: null}).value;
    for (const fn of queued) {const result = fn(); if (typeof result === 'function') cleanup.push(result);}
    return value;
  };
  return {render, remote, write, local, defaults, dispose: () => cleanup.forEach((fn) => fn())};
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('startup appearance becomes ready from disk while the remote request is pending', async (t) => {
  const s = themeSetup(); t.after(s.dispose);
  assert.equal(s.render().ready, false);
  await flush();
  assert.equal(s.render().ready, true);
  assert.deepEqual(s.render().appearance, s.local);
  s.remote.resolve({appearance: {...s.local, palette: 'ocean'}}); await flush();
  assert.equal(s.render().appearance.palette, 'ocean');
});

test('startup uses default appearance when disk fails without waiting for the network', async (t) => {
  const s = themeSetup({diskFails: true}); t.after(s.dispose);
  s.render(); await flush();
  assert.equal(s.render().ready, true);
  assert.deepEqual(s.render().appearance, s.defaults);
  s.remote.reject(new Error('Offline')); await flush();
  assert.equal(s.render().ready, true);
});

test('late appearance synchronization does not overwrite settings edited after local startup', async (t) => {
  const s = themeSetup(); t.after(s.dispose);
  s.render(); await flush();
  s.render().setBackgroundColor('#abcdef');
  s.render(); await flush();
  s.remote.resolve({appearance: {...s.local, backgroundColor: '#000000'}}); await flush();
  assert.equal(s.render().appearance.backgroundColor, '#abcdef');
  s.write.resolve(); await flush();
});

function sessionSetup(options = {}) {
  const disk = deferred(), network = deferred();
  const applied = [], saved = [], failures = [];
  let settled = 0, requests = 0, signal;
  const session = createDashboardSession({restore: () => disk.promise,
    fetch: (value) => {requests++; signal = value; return network.promise;},
    save: async (data) => saved.push(data), apply: (data, cached) => applied.push({data, cached}),
    failed: (error) => failures.push(error), settled: () => settled++, ...options});
  return {session, disk, network, applied, saved, failures,
    get requests() {return requests;}, get settled() {return settled;}, get signal() {return signal;}};
}
test('saved dashboard appears while the network is still pending, then fresh data replaces it', async () => {
  const s = sessionSetup();
  const restore = s.session.restore(), refresh = s.session.refresh();
  s.disk.resolve(summary('Saved')); await restore;
  assert.equal(s.applied[0].cached, true);
  assert.equal(s.settled, 0);
  s.network.resolve(summary('Fresh')); await refresh;
  assert.deepEqual(s.applied.map((item) => item.data.tasks[0].title), ['Saved', 'Fresh']);
  assert.equal(s.applied[1].cached, false);
  assert.equal(s.saved[0].tasks[0].title, 'Fresh');
  s.session.dispose();
});
test('late disk restoration never overwrites a successful network response', async () => {
  const s = sessionSetup();
  const restore = s.session.restore(), refresh = s.session.refresh();
  s.network.resolve(summary('Fresh')); await refresh;
  s.disk.resolve(summary('Saved')); await restore;
  assert.equal(s.applied.length, 1);
  assert.equal(s.applied[0].cached, false);
  s.session.dispose();
});
test('offline launch retains saved data and recovers on the next refresh', async () => {
  let online = false;
  const s = sessionSetup({fetch: async () => {if (!online) throw new Error('Offline'); return summary('Recovered');}});
  s.disk.resolve(summary('Saved')); await s.session.restore();
  await s.session.refresh();
  assert.equal(s.applied.length, 1); assert.equal(s.failures.length, 1); assert.equal(s.saved.length, 0);
  online = true; await s.session.refresh();
  assert.equal(s.applied[1].data.tasks[0].title, 'Recovered');
  s.session.dispose();
});
test('first launch without cache settles cleanly on a network failure', async () => {
  const s = sessionSetup();
  s.disk.resolve(null); await s.session.restore();
  const refresh = s.session.refresh(); s.network.reject(new Error('Offline')); await refresh;
  assert.equal(s.applied.length, 0); assert.equal(s.settled, 1);
  s.session.dispose();
});
test('concurrent refreshes share one request; disposal aborts and ignores all late data', async () => {
  const s = sessionSetup();
  const restore = s.session.restore(), first = s.session.refresh(), second = s.session.refresh();
  assert.equal(s.requests, 1); assert.equal(first, second);
  s.session.dispose(); assert.equal(s.signal.aborted, true);
  s.disk.resolve(summary('Saved')); s.network.resolve(summary('Late'));
  await Promise.all([restore, first, second]);
  assert.equal(s.applied.length, 0); assert.equal(s.saved.length, 0); assert.equal(s.settled, 0);
});
test('a disk write failure leaves the successful network snapshot usable', async () => {
  const s = sessionSetup({save: async () => {throw new Error('Disk full');}});
  const refresh = s.session.refresh(); s.network.resolve(summary()); await refresh;
  assert.equal(s.applied[0].cached, false); assert.equal(s.failures.length, 0); assert.equal(s.settled, 1);
  s.session.dispose();
});
test('a hanging summary request is aborted after 15 seconds and can be retried', async (t) => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const s = sessionSetup({fetch: (signal) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Request timed out')));
  })});
  const refresh = s.session.refresh();
  t.mock.timers.tick(15000); await refresh;
  assert.equal(s.failures[0].message, 'Request timed out'); assert.equal(s.settled, 1);
  s.session.dispose();
});
test('DashboardProvider clears card loading from disk, maps default-city weather, and retains it offline', async (t) => {
  // Minimal hook runner exercises provider wiring; session behavior is tested above.
  const states = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, initial = true;
  const react = {
    createContext: () => ({Provider: 'provider'}),
    useState: (value) => {
      const index = stateIndex++;
      if (initial) states[index] = value;
      return [states[index], (next) => {states[index] = typeof next === 'function' ? next(states[index]) : next;}];
    },
    useRef: (value) => {const index = refIndex++; if (initial) refs[index] = {current: value}; return refs[index];},
    useCallback: (fn) => fn,
    useEffect: (fn) => {if (initial) effects.push(fn);},
  };
  const network = deferred();
  const data = summary('Saved task');
  const locations = data.savedLocations;
  const {DashboardProvider} = load('src/context/DashboardContext.tsx', {
    react,
    'react/jsx-runtime': {jsx: (_type, props) => props},
    './AuthContext': {useAuth: () => ({user: {uid: 'owner'}})},
    '../services/api': {fetchDashboardSummary: () => network.promise,
      getUserPreferences: async () => {throw new Error('Offline');},
      executeTVAction: async () => ({}), fetchLocationWeather: async () => data.weather},
    '../services/dashboardCache': {loadDashboardCache: async (uid) => {assert.equal(uid, 'owner'); return data;},
      saveDashboardCache: async () => {}},
    '../services/dashboardSession': {createDashboardSession},
    '../services/weatherLocationService': {DEFAULT_LOCATIONS: [{id: 'ny', name: 'New York', query: 'New York, US', isDefault: true}],
      loadStoredLocations: async () => ({locations, activeId: 'denver'}), persistLocations: async () => {},
      getWeatherForLocation: (loc, weather) => ({...weather, location: loc.query})},
  });
  const render = () => {stateIndex = 0; refIndex = 0; return DashboardProvider({children: null}).value;};
  assert.equal(render().isLoading, true);
  const cleanup = effects.map((fn) => fn()).filter((fn) => typeof fn === 'function');
  t.after(() => cleanup.forEach((fn) => fn()));
  initial = false;
  await new Promise((resolve) => setImmediate(resolve));
  const restored = render();
  assert.equal(restored.isLoading, false); assert.equal(restored.isCached, true); assert.equal(restored.isLive, false);
  assert.equal(restored.tasks[0].title, 'Saved task'); assert.equal(restored.lastUpdated, data.updatedAt);
  assert.equal(restored.weather.temp, '72°'); assert.equal(restored.weather.location, 'Denver, US');
  network.reject(new Error('Offline')); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(render().error, 'Offline'); assert.equal(render().tasks[0].title, 'Saved task');
});
