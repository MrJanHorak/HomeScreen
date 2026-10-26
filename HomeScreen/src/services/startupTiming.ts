// Process-local cold-start milestones. Never log account IDs, tokens or content.
const startedAt = performance.now();
const recorded = new Set<string>();
type Phase = 'js-entry' | 'app-effect' | 'auth-init' | 'auth-listener' | 'auth-ready'
  | 'auth-user-read-1' | 'auth-user-ready-1' | 'auth-user-read-2' | 'auth-user-ready-2'
  | 'auth-user-write' | 'auth-user-written'
  | 'appearance-read' | 'appearance-ready' | 'dashboard-effect'
  | 'cache-read' | 'cache-read-resolved' | 'cache-validated' | 'cache-applied' | 'live-applied'
  | 'summary-request' | 'summary-token-ready' | 'summary-http-ready' | 'summary-json-ready'
  | 'summary-failed' | 'cached-content-effect' | 'live-content-effect'
  | 'cached-frame-callback' | 'live-frame-callback';

/** Once per phase during the first two minutes; true only for the recorded call. */
export function markStartup(phase: Phase): boolean {
  const elapsedMs = Math.round(performance.now() - startedAt);
  if (elapsedMs > 120000 || recorded.has(phase)) return false;
  recorded.add(phase);
  console.info('TV startup', JSON.stringify({phase, elapsedMs, atMs: Date.now()}));
  return true;
}

markStartup('js-entry');
