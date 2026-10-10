import type { DashboardSummaryResponse } from '../../../shared/src/types';

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
  const restore = async () => {
    try {
      const cached = await options.restore();
      if (active && !liveReceived && cached) options.apply(cached, true);
    } catch { /* A cache read is optional. */ }
  };
  const refresh = (): Promise<void> => {
    if (!active) return Promise.resolve();
    if (pending) return pending;
    const request = new AbortController();
    controller = request;
    const timer = setTimeout(() => request.abort(), 15000);
    pending = (async () => {
      try {
        const data = await options.fetch(request.signal);
        if (!active || request.signal.aborted) return;
        liveReceived = true;
        options.apply(data, false);
        // Persist only successful responses; disk errors leave live data usable.
        void options.save(data).catch(() => undefined);
      } catch (error) {
        if (active) options.failed(error);
      } finally {
        clearTimeout(timer);
        pending = null;
        if (active) options.settled();
      }
    })();
    return pending;
  };
  return { restore, refresh, dispose: () => { active = false; controller?.abort(); } };
}
