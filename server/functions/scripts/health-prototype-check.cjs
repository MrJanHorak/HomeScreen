// Local, read-only feasibility check. Never logs the access token or health values.
const {OAuth2Client} = require('google-auth-library');
const {healthRollupTransport, readHealthPrototypeThroughNow} = require('../lib/services/googleHealthPrototype');
const {checkGoogleHealthConnection} = require('../lib/services/googleHealthConnection');

function readToken() {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      reject(new Error('Run this command in an interactive terminal.')); return;
    }
    process.stdout.write('Paste the Playground access token and press Enter (input is hidden): ');
    let token = '';
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    const cleanup = () => {process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.removeListener('data', onData);};
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\u0003') {cleanup(); reject(new Error('Cancelled.')); return;}
        if (char === '\r' || char === '\n') {cleanup(); process.stdout.write('\n'); resolve(token.trim()); return;}
        if (char === '\u007f' || char === '\b') token = token.slice(0, -1);
        else if (char >= ' ') token += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  const timeZone = process.argv[2] || Intl.DateTimeFormat().resolvedOptions().timeZone;
  new Intl.DateTimeFormat('en-US', {timeZone});
  const token = await readToken();
  if (!token) throw new Error('No token provided.');
  const client = new OAuth2Client();
  client.setCredentials({access_token: token});
  const connection = await checkGoogleHealthConnection(client);
  console.log(`Google Health account: ${connection}.`);
  if (connection !== 'linked') {process.exitCode = 1; return;}
  const request = healthRollupTransport(client);
  const failures = new Map();
  const days = await readHealthPrototypeThroughNow(new Date(), timeZone, async (metric, body) => {
    try {return await request(metric, body);} catch (error) {
      const code = Number(error?.response?.status || error?.code);
      failures.set(metric, Number.isInteger(code) && code >= 100 && code <= 599 ? code : 'request failed');
      throw error;
    }
  });
  console.log(`Time zone: ${timeZone}. Seven days including today (partial).`);
  for (const [label, field, metric] of [
    ['Steps', 'steps', 'steps'], ['Distance', 'distanceKm', 'distance'],
    ['Calories', 'calories', 'total-calories'], ['Activity levels', 'activeMinutesByLevel', 'active-minutes'],
  ]) {
    const count = (status) => days.filter((day) => day[field].status === status).length;
    const failure = failures.has(metric) ? ` (HTTP/status: ${failures.get(metric)})` : '';
    console.log(`${label}: ${count('ok')} days with data, ${count('missing')} missing, ${count('unavailable')} unavailable${failure}. Today: ${days[6][field].status}.`);
  }
  console.log('No health values or credentials were written to disk.');
  if (days.some((day) => ['steps', 'distanceKm', 'calories', 'activeMinutesByLevel']
    .some((field) => day[field].status === 'unavailable'))) process.exitCode = 1;
}

main().catch((error) => {
  // Avoid printing request errors: they can include credentials or response data.
  console.error(error instanceof RangeError ? 'Invalid time zone.' :
    (['Cancelled.', 'No token provided.', 'Run this command in an interactive terminal.'].includes(error?.message) ? error.message : 'Check failed.'));
  process.exitCode = 1;
});
