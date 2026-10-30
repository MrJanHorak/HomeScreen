// Read-only, unauthenticated deployment checks; never sends account or health data.
async function main() {
  const root = 'https://us-central1-tv-homescreen-backend.cloudfunctions.net';
  for (const [name, init, expected] of [
    ['beginGoogleHealth', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{"consent":true}'}, 401],
    ['googleHealthTest', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{"timeZone":"UTC"}'}, 401],
    ['googleHealthComparison', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{"timeZone":"UTC"}'}, 401],
    ['googleHealthOAuthCallback', {}, 400],
    ['people', {}, 401],
  ]) {
    const response = await fetch(`${root}/${name}`, init);
    console.log(`${name}: HTTP ${response.status} (expected ${expected})`);
    if (response.status !== expected) process.exitCode = 1;
  }
  const page = await fetch('https://tv-homescreen-backend.web.app/people');
  const html = await page.text();
  const entry = html.match(/src="([^"]+\.js)"/);
  if (!page.ok || !entry) throw new Error('Hosted companion bundle was not found');
  const bundle = await fetch(new URL(entry[1], page.url));
  const source = await bundle.text();
  const present = bundle.ok && source.includes('Check test data') && source.includes('Google Health test connection') && source.includes('Check token refresh') && source.includes('Compare completed days with Fit');
  console.log(`Hosted Health test controls present: ${present}`);
  if (!present) process.exitCode = 1;
}
main().catch(() => {console.error('Deployment smoke check failed.'); process.exitCode = 1;});
