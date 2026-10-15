import type { DashboardSummaryResponse } from '../../../shared/src/types';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;

/** One provider lifetime: disk and network race independently; network always wins. */
export function createDashboardSession(options: {
  restore: () => Promise<DashboardSummaryResponse | null>;
  fetch: (signal: AbortSignal) => Promise<DashboardSummaryResponse>;
  save: (data: DashboardSummaryResponse) => Promise<void>;
  apply: (data: DashboardSummaryResponse, cached: boolean) => void;
  failed: (error: unknown) => void;
  settled: () => void;
}) {
  let active = true;
  let liveReceived = false;
  let pending: Promise<void> | null = null;
  let controller: AbortController | null = null;
  let polling = false;
  let foreground = true;
  let failures = 0;
  let nextRefresh: ReturnType<typeof setTimeout> | undefined;
  const cancelScheduled = () => { clearTimeout(nextRefresh); nextRefresh = undefined; };
  const schedule = () => {
    cancelScheduled();
    if (active && polling && foreground) {
      // Retry sooner during recovery, backing off to the normal cadence.
      const delay = failures ? Math.min(60000 * 2 ** Math.min(failures - 1, 3), REFRESH_INTERVAL_MS) : REFRESH_INTERVAL_MS;
      nextRefresh = setTimeout(() => void refresh(), delay);
    }
  };
  const restore = async () => {
    try {
      const cached = await options.restore();
      if (active && !liveReceived && cached) options.apply(cached, true);
    } catch { /* A cache read is optional. */ }
  };
  const refresh = (): Promise<void> => {
    if (!active || !foreground) return Promise.resolve();
    if (pending) return pending;
    cancelScheduled();
    const request = new AbortController();
    controller = request;
    let timedOut = false;
    const startedAt = Date.now();
    // Race the whole operation, including token refresh: aborting fetch alone
    // cannot release a request still waiting for Firebase authentication.
    const canceled = new Promise<never>((_resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new Error('Dashboard refresh timed out. Will retry automatically.')), {once: true});
    });
    const timer = setTimeout(() => { timedOut = true; request.abort(); }, REQUEST_TIMEOUT_MS);
    pending = (async () => {
      try {
        const data = await Promise.race([options.fetch(request.signal), canceled]);
        if (!active || controller !== request || request.signal.aborted) return;
        failures = 0;
        liveReceived = true;
        options.apply(data, false);
        // Persist only successful responses; disk errors leave live data usable.
        void options.save(data).catch(() => undefined);
      } catch (error) {
        if (active && controller === request && foreground) {
          failures++;
          console.warn('Dashboard refresh failed', {at: new Date().toISOString(), elapsedMs: Date.now() - startedAt,
            reason: timedOut ? 'timeout' : 'request-failed', consecutiveFailures: failures});
          options.failed(error);
        }
      } finally {
        clearTimeout(timer);
        if (controller === request) {
          controller = null;
          pending = null;
          if (active) { options.settled(); schedule(); }
        }
      }
    })();
    return pending;
  };
  const setForeground = (value: boolean) => {
    if (foreground === value) return;
    foreground = value;
    cancelScheduled();
    if (!value) {
      const previous = controller;
      controller = null;
      pending = null;
      previous?.abort();
    } else if (polling) {
      failures = 0;
      void refresh();
    }
  };
  return { restore, refresh, setForeground,
    start: (isForeground = true) => {
      if (polling || !active) return;
      polling = true;
      foreground = isForeground;
      if (foreground) void refresh();
    },
    dispose: () => { active = false; cancelScheduled(); controller?.abort(); },
  };
}
