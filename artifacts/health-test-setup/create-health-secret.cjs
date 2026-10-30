// Provision the authorized test OAuth secret without printing or writing it locally.
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const path = process.argv[2];
if (!path) throw new Error('A Google OAuth client JSON file path is required.');
const web = JSON.parse(fs.readFileSync(path, 'utf8')).web;
if (web?.project_id !== 'tv-health-test-20261028' || typeof web.client_secret !== 'string' || !web.client_secret) {
  throw new Error('Expected a web OAuth client from the Health test project.');
}
const args = ['/d', '/s', '/c', 'gcloud.cmd secrets create GOOGLE_HEALTH_CLIENT_SECRET --project=tv-homescreen-backend --replication-policy=automatic --data-file=-'];
const result = spawnSync(process.env.ComSpec || 'cmd.exe', args, {input: Buffer.from(web.client_secret, 'utf8'), encoding: 'utf8', windowsHide: true});
if (result.error || result.status !== 0) {
  process.stderr.write('Health secret creation failed. No secret value was printed.\n');
  process.exitCode = 1;
} else {
  process.stdout.write('Health test secret created in the dashboard project.\n');
}
