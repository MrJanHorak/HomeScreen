/** Isolated read-only feasibility adapter. Not connected to dashboard or OAuth. */
export type HealthMetric = "steps" | "distance" | "active-minutes" | "total-calories";
export type RollupRequest = (metric: HealthMetric, body: Record<string, unknown>) => Promise<unknown>;
export type MetricResult<T> = {status: "ok"; value: T} | {status: "missing"} | {status: "unavailable"};
export interface PrototypeDay {
  date: string;
  steps: MetricResult<number>;
  distanceKm: MetricResult<number>;
  calories: MetricResult<number>;
  activeMinutesByLevel: MetricResult<Record<string, number>>;
}

/** The supplied client must hold separately consented Google Health credentials. */
export function healthRollupTransport(client: {request: (options: {
  url: string; method: "POST"; data: Record<string, unknown>; timeout: number;
}) => Promise<{data: unknown}>}): RollupRequest {
  return async (metric, body) => {
    if (!metrics.includes(metric)) throw new Error("Unsupported health metric");
    const response = await client.request({url: `https://health.googleapis.com/v4/users/me/dataTypes/${metric}/dataPoints:dailyRollUp`,
      method: "POST", data: body, timeout: 15000});
    return response.data;
  };
}

type Json = Record<string, unknown>;
const metrics: HealthMetric[] = ["steps", "distance", "active-minutes", "total-calories"];
const object = (value: unknown): Json | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Json : undefined;

function dateParts(date: string): {year: number; month: number; day: number} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Expected an ISO calendar date");
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.toISOString().slice(0, 10) !== date) throw new Error("Invalid calendar date");
  return {year, month, day};
}

function nextDate(date: string, days: number): string {
  const {year, month, day} = dateParts(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function numberValue(value: unknown): number | undefined {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+(\.\d+)?$/.test(value))) return;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function valueFor(metric: HealthMetric, point: Json): number | Record<string, number> | undefined {
  if (metric === "steps") return numberValue(object(point.steps)?.countSum);
  if (metric === "distance") {
    const millimeters = numberValue(object(point.distance)?.millimetersSum);
    return millimeters === undefined ? undefined : millimeters / 1000000;
  }
  if (metric === "total-calories") return numberValue(object(point.totalCalories)?.kcalSum);
  const levels = object(point.activeMinutes)?.activeMinutesRollupByActivityLevel;
  if (!Array.isArray(levels) || !levels.length) return;
  const result: Record<string, number> = Object.create(null);
  for (const level of levels) {
    const item = object(level);
    const name = item?.activityLevel;
    const minutes = numberValue(item?.activeMinutesSum);
    if (typeof name !== "string" || !/^[A-Z_]+$/.test(name) || minutes === undefined || name in result) return;
    result[name] = minutes;
  }
  return result;
}

async function readDates(dates: string[], endDateExclusive: string, endTime: Record<string, number>,
  request: RollupRequest): Promise<PrototypeDay[]> {
  const body = {range: {start: {date: dateParts(dates[0]), time: {}},
    end: {date: dateParts(endDateExclusive), time: endTime}}, windowSizeDays: 1};
  const results = await Promise.allSettled(metrics.map((metric) => request(metric, body)));
  const perMetric = results.map((result, index) => {
    const values = new Map<string, number | Record<string, number> | undefined>();
    if (result.status !== "fulfilled") return {failed: true, values};
    const response = object(result.value);
    if (!response || (response.rollupDataPoints !== undefined && !Array.isArray(response.rollupDataPoints)) ||
        response.nextPageToken) return {failed: true, values};
    for (const raw of (response.rollupDataPoints || []) as unknown[]) {
      const point = object(raw);
      const date = object(object(point?.civilStartTime)?.date);
      const key = date && typeof date.year === "number" && typeof date.month === "number" && typeof date.day === "number" ?
        `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}` : "";
      if (!point || !dates.includes(key) || values.has(key)) return {failed: true, values};
      values.set(key, valueFor(metrics[index], point));
    }
    return {failed: false, values};
  });
  const get = <T>(index: number, date: string): MetricResult<T> => {
    const result = perMetric[index];
    if (result.failed) return {status: "unavailable"};
    const value = result.values.get(date);
    return value === undefined ? {status: "missing"} : {status: "ok", value: value as T};
  };
  return dates.map((date) => ({date, steps: get(0, date), distanceKm: get(1, date),
    activeMinutesByLevel: get(2, date), calories: get(3, date)}));
}

/** Seven completed civil days; caller supplies an authorized, isolated transport. */
export async function readHealthPrototype(endDateExclusive: string, request: RollupRequest): Promise<PrototypeDay[]> {
  dateParts(endDateExclusive);
  const dates = Array.from({length: 7}, (_, i) => nextDate(endDateExclusive, i - 7));
  return readDates(dates, endDateExclusive, {}, request);
}

/** Six completed days and today through now in the requested viewer time zone. */
export async function readHealthPrototypeThroughNow(now: Date, timeZone: string,
  request: RollupRequest): Promise<PrototypeDay[]> {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid current time");
  const formatter = new Intl.DateTimeFormat("en-CA", {timeZone, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"});
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  dateParts(today);
  const dates = Array.from({length: 7}, (_, i) => nextDate(today, i - 6));
  const hours = Number(parts.hour); const minutes = Number(parts.minute); const seconds = Number(parts.second);
  // At exact midnight, there is no positive interval for today's bucket.
  if (hours === 0 && minutes === 0 && seconds === 0) {
    const prior = await readDates(dates.slice(0, 6), today, {}, request);
    return [...prior, {date: today, steps: {status: "missing"}, distanceKm: {status: "missing"},
      calories: {status: "missing"}, activeMinutesByLevel: {status: "missing"}}];
  }
  return readDates(dates, today, {hours, minutes, seconds}, request);
}
