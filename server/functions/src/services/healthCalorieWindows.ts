type Client = {request(options: {url: string; method: "POST"; data: Record<string, unknown>; timeout: number}): Promise<{data: unknown}>};
type Rollup = Map<number, number> | null;
export interface WindowCounts {status: "ok" | "unavailable"; higher: number; lower: number; similar: number; missing: number; baselineZero: number}
const hour = 3600000;

function parseRollup(value: unknown, start: number, end: number): Rollup {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const response = value as {nextPageToken?: unknown; rollupDataPoints?: unknown};
  if (response.nextPageToken || (response.rollupDataPoints !== undefined && !Array.isArray(response.rollupDataPoints))) return null;
  const result = new Map<number, number>();
  for (const raw of (response.rollupDataPoints || []) as unknown[]) {
    const point = raw as {startTime?: unknown; endTime?: unknown; totalCalories?: {kcalSum?: unknown}} | null;
    if (typeof point?.startTime !== "string" || typeof point.endTime !== "string") return null;
    const from = Date.parse(point.startTime); const to = Date.parse(point.endTime);
    const calories = point.totalCalories?.kcalSum;
    if (!Number.isFinite(from) || from < start || from >= end || (from - start) % hour !== 0 ||
        to !== Math.min(from + hour, end) || result.has(from) || typeof calories !== "number" ||
        !Number.isFinite(calories) || calories < 0) return null;
    result.set(from, calories);
  }
  return result;
}

function countWindows(baseline: Rollup, filtered: Rollup, start: number, end: number): WindowCounts {
  const counts: WindowCounts = {status: baseline && filtered ? "ok" : "unavailable", higher: 0, lower: 0, similar: 0, missing: 0, baselineZero: 0};
  if (!baseline || !filtered) return counts;
  for (let time = start; time < end; time += hour) {
    const all = baseline.get(time); const group = filtered.get(time);
    if (all === undefined || group === undefined) counts.missing++;
    else if (all === 0) counts.baselineZero++;
    else {
      const change = (group - all) / all;
      if (change > 0.001) counts.higher++;
      else if (change < -0.001) counts.lower++;
      else counts.similar++;
    }
  }
  return counts;
}

/** Compare physical one-hour buckets, without returning individual calories or times. */
export async function compareCalorieWindows(client: Client, start: number, end: number): Promise<{google: WindowCounts; wearables: WindowCounts}> {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 27 * hour) throw new Error("Invalid diagnostic range");
  const families = ["all-sources", "google-sources", "google-wearables"] as const;
  const results = await Promise.allSettled(families.map((family) => client.request({
    url: "https://health.googleapis.com/v4/users/me/dataTypes/total-calories/dataPoints:rollUp", method: "POST", timeout: 15000,
    data: {range: {startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString()},
      windowSize: "3600s", dataSourceFamily: `users/me/dataSourceFamilies/${family}`},
  })));
  const parsed = results.map((result) => result.status === "fulfilled" ? parseRollup(result.value.data, start, end) : null);
  return {google: countWindows(parsed[0], parsed[1], start, end), wearables: countWindows(parsed[0], parsed[2], start, end)};
}
