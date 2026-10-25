export interface DashboardSourceState {
  status: "ok" | "unavailable" | "not_connected";
  /** Last successful provider read, never the time an outage response arrived. */
  updatedAt?: string;
}

export interface DashboardSources {
  calendar: DashboardSourceState;
  tasks: DashboardSourceState;
}

export const DASHBOARD_SOURCE_MAX_AGE_MS = 7 * 86400000;

interface FeedSummary {
  schedule: unknown[];
  upcomingEvents: unknown[];
  tasks: unknown[];
  sources?: DashboardSources;
  updatedAt: string;
}

/** Reconcile only failed feeds; a successful empty result must clear old items. */
export function mergeDashboardSources<T extends FeedSummary>(previous: T | null | undefined, next: T, now = Date.now()): T {
  if (!next.sources) return next; // Compatibility with older servers and snapshots.
  const sources = {...next.sources};
  const result = {...next, sources};
  for (const name of ["calendar", "tasks"] as const) {
    if (sources[name].status === "ok") continue;
    const successTime = (summary: T | null | undefined): string | undefined => {
      if (!summary || summary.sources?.[name].status === "not_connected") return undefined;
      const date = summary.sources ? summary.sources[name].updatedAt : summary.updatedAt;
      const age = now - Date.parse(date || "");
      return age >= 0 && age <= DASHBOARD_SOURCE_MAX_AGE_MS ? date : undefined;
    };
    const oldTime = successTime(previous);
    const newTime = successTime(next);
    const saved = sources[name].status === "not_connected" ? undefined :
      oldTime && (!newTime || Date.parse(oldTime) > Date.parse(newTime)) ? previous : newTime ? next : undefined;
    sources[name] = saved ? {status: "unavailable", updatedAt: successTime(saved)} : {status: sources[name].status};
    if (name === "calendar") {
      result.schedule = saved?.schedule || [];
      result.upcomingEvents = saved?.upcomingEvents || [];
    } else {
      result.tasks = saved?.tasks || [];
    }
  }
  return result;
}
