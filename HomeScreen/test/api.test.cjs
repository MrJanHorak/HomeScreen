const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(path, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
  }).outputText;
  const module = {exports: {}};
  const requireMock = (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  };
  new Function('module', 'exports', 'require', code)(module, module.exports, requireMock);
  return module.exports;
}

const http = load('../shared/src/http.ts');
const transport = load('../shared/src/transport.ts');

function setup(t) {
  const previousApiUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
  t.after(() => {
    if (previousApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = previousApiUrl;
  });
  const events = [];
  const auth = {currentUser: {uid: 'owner', getIdToken: async () => 'fixture-token'}};
  const api = load('src/services/api.ts', {
    './firebase': {auth},
    'firebase/auth': {signOut: async () => {events.push('sign-out'); auth.currentUser = null;}},
    './localUserData': {clearLocalUserData: async (uid) => events.push(`clear:${uid}`)},
    '../../../shared/src/http': http,
    '../../../shared/src/transport': transport,
    'react-native': {Platform: {OS: 'android'}},
    '@react-native-async-storage/async-storage': {getItem: async () => null},
  });
  return {api, events, auth};
}

test('authenticated TV requests retain token, timezone and encoded city', async (t) => {
  const {api} = setup(t);
  const calls = [];
  t.mock.method(global, 'fetch', async (url, options) => {
    calls.push({url, options});
    return Response.json({weather: {temp: '72°'}});
  });
  await api.fetchDashboardSummary();
  await api.fetchLocationWeather('Denver, CO & US');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer fixture-token');
  assert.ok(calls[0].options.headers['X-Time-Zone']);
  assert.ok(calls[1].url.endsWith('city=Denver%2C%20CO%20%26%20US'));
});

test('a revoked TV session clears local user data before reporting the server error', async (t) => {
  const {api, events, auth} = setup(t);
  t.mock.method(global, 'fetch', async () => Response.json({error: 'TV removed'}, {status: 401}));
  await assert.rejects(api.getUserPreferences(), {message: 'TV removed', status: 401});
  assert.deepEqual(events, ['sign-out', 'clear:owner']);
  assert.equal(auth.currentUser, null);
});

test('a stale settings save reports the conflict without signing out', async (t) => {
  const {api, events} = setup(t);
  t.mock.method(global, 'fetch', async () => Response.json({error: 'Reload settings'}, {status: 409}));
  await assert.rejects(api.saveUserPreferences({}, 12), {message: 'Reload settings', status: 409});
  assert.deepEqual(events, []);
});

test('non-JSON server failures use the endpoint message and retain the status', async () => {
  await assert.rejects(http.readJsonResponse(new Response('<html>Bad gateway</html>', {status: 502}), 'Could not load settings'),
    {message: 'Could not load settings', status: 502});
});

test('public pairing expiry does not clear a signed-in TV session', async (t) => {
  const {api, events} = setup(t);
  t.mock.method(global, 'fetch', async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return Response.json({error: 'Expired'}, {status: 410});
  });
  assert.deepEqual(await api.pollDevicePairing({code: 'ABC234', pollSecret: 'secret'}), {status: 'expired'});
  assert.deepEqual(events, []);
});

test('production API URLs reject cleartext, embedded credentials and non-HTTPS schemes', () => {
  for (const url of ['http://api.example.test', 'http://localhost:5001', 'https://user:pass@api.example.test',
    'ftp://api.example.test', 'https://api.example.test?token=x', 'https://api.example.test#x']) {
    assert.throws(() => transport.validatedApiUrl(url), /HTTPS API URL/);
  }
  assert.equal(transport.validatedApiUrl('https://api.example.test/functions/'), 'https://api.example.test/functions');
  assert.equal(transport.validatedApiUrl('http://10.0.2.2:5001/functions', true), 'http://10.0.2.2:5001/functions');
  assert.throws(() => transport.validatedApiUrl('http://api.example.test', true), /HTTPS API URL/);
});

test('a late response from the previous account cannot clear or populate the new session', async (t) => {
  const {api, events, auth} = setup(t);
  t.mock.method(global, 'fetch', async () => {
    auth.currentUser = {uid: 'new-owner', getIdToken: async () => 'new-token'};
    return Response.json({error: 'Old TV removed'}, {status: 401});
  });
  await assert.rejects(api.getUserPreferences(), /account changed/);
  assert.equal(auth.currentUser.uid, 'new-owner');
  assert.deepEqual(events, []);
});

test('TV layout and available poll reads use the scoped authenticated endpoints and validate metadata', async (t) => {
  const {api} = setup(t);
  const calls = [];
  t.mock.method(global, 'fetch', async (url, options) => {
    calls.push({url, options});
    return Response.json(url.includes('appearanceStudio') ? {designs: [{id: 'evening', name: 'Evening', appearance: {}, updatedAtMs: 7}]} :
      {polls: [{id: 'a'.repeat(32), question: 'Dinner?'}]});
  });
  assert.equal((await api.getSavedDashboardLayouts())[0].name, 'Evening');
  assert.equal((await api.getAvailableDashboardPolls())[0].question, 'Dinner?');
  assert.ok(calls[0].url.endsWith('/appearanceStudio?designs=1'));
  assert.ok(calls[1].url.endsWith('/pollFeed?available=1'));
  assert.ok(calls.every((call) => call.options.headers.Authorization === 'Bearer fixture-token'));
  t.mock.method(global, 'fetch', async () => Response.json({designs: [{id: 'broken'}], polls: [{id: '../bad', question: 'Bad'}]}));
  await assert.rejects(api.getSavedDashboardLayouts(), /invalid saved layouts/);
  await assert.rejects(api.getAvailableDashboardPolls(), /invalid polls/);
});
