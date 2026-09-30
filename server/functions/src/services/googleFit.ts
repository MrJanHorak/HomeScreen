import {google} from "googleapis";
import type {fitness_v1 as FitnessV1} from "googleapis";
import {GoogleTokens, HealthDay, HealthSummary} from "../types";
import {getOAuth2Client} from "./googleAuth";

const METRICS = ["com.google.step_count.delta", "com.google.calories.expended",
  "com.google.distance.delta", "com.google.active_minutes"];

function dayParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const get = (part: string) => Number(parts.find((item) => item.type === part)?.value);
  return {year: get("year"), month: get("month"), day: get("day"),
    hour: get("hour"), minute: get("minute"), second: get("second")};
}

function dateKey(instant: Date, timeZone: string): string {
  const {year, month, day} = dayParts(instant, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function zonedMidnight(date: string, timeZone: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const desired = Date.UTC(year, month - 1, day);
  let guess = desired;
  for (let i = 0; i < 3; i++) {
    const p = dayParts(new Date(guess), timeZone);
    const represented = Date.UTC(p.year, p.month - 1, p.day,
      p.hour, p.minute, p.second);
    guess += desired - represented;
  }
  return guess;
}

function datesEndingToday(now: Date, timeZone: string): string[] {
  const today = dateKey(now, timeZone);
  const [year, month, day] = today.split("-").map(Number);
  return Array.from({length: 7}, (_, index) =>
    new Date(Date.UTC(year, month - 1, day - 6 + index))
      .toISOString().slice(0, 10));
}

function emptySummary(stepGoal: number, distanceGoal: number,
  status: HealthSummary["status"], message: string): HealthSummary {
  return {status, message, steps: 0, stepGoal, distance: 0, distanceGoal,
    calories: 0, activeMinutes: 0, progress: 0, weekly: []};
}

function parseBucket(bucket: FitnessV1.Schema$AggregateBucket): Omit<HealthDay, "date"> {
  const totals = {steps: 0, distance: 0, calories: 0, activeMinutes: 0};
  for (const [index, dataset] of (bucket.dataset || []).entries()) {
    for (const point of dataset.point || []) {
      const type = point.dataTypeName ||
        METRICS.find((name) => dataset.dataSourceId?.includes(name)) || METRICS[index];
      const value = point.value?.[0];
      if (!value) continue;
      if (type === METRICS[0]) totals.steps += value.intVal || 0;
      if (type === METRICS[1]) totals.calories += value.fpVal || 0;
      if (type === METRICS[2]) totals.distance += value.fpVal || 0;
      if (type === METRICS[3]) totals.activeMinutes += (value.intVal || 0) / 60000;
    }
  }
  return {steps: Math.round(totals.steps),
    distance: Number((totals.distance / 1000).toFixed(1)),
    calories: Math.round(totals.calories),
    activeMinutes: Math.round(totals.activeMinutes)};
}

/** Fetch the current day and seven-day history in the viewer's local time zone. */
export async function fetchHealthData(tokens: GoogleTokens,
  goals: {stepGoal?: number; distanceGoal?: number} = {},
  requestedTimeZone = "UTC"): Promise<HealthSummary> {
  const stepGoal = goals.stepGoal || 10000;
  const distanceGoal = goals.distanceGoal || 8;
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return emptySummary(stepGoal, distanceGoal, "not_connected",
      "Connect your Google account to show activity.");
  }
  let timeZone = "UTC";
  try {
    new Intl.DateTimeFormat("en-US", {timeZone: requestedTimeZone});
    timeZone = requestedTimeZone;
  } catch {/* Invalid client time zone: use UTC. */}

  const now = new Date();
  const dates = datesEndingToday(now, timeZone);
  try {
    const fitness = google.fitness({version: "v1", auth: getOAuth2Client(tokens)});
    const response = await fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: {
        aggregateBy: [
          {dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"},
          {dataTypeName: METRICS[1]},
          {dataTypeName: METRICS[2]},
          {dataTypeName: METRICS[3]},
        ],
        bucketByTime: {period: {type: "day", value: 1, timeZoneId: timeZone}},
        startTimeMillis: String(zonedMidnight(dates[0], timeZone)),
        endTimeMillis: String(now.getTime()),
      },
    });
    const byDate = new Map<string, Omit<HealthDay, "date">>();
    for (const bucket of response.data.bucket || []) {
      const start = Number(bucket.startTimeMillis);
      if (!Number.isFinite(start)) continue;
      byDate.set(dateKey(new Date(start), timeZone), parseBucket(bucket));
    }
    const weekly = dates.map((date) => ({date, ...byDate.get(date) || {
      steps: 0, distance: 0, calories: 0, activeMinutes: 0,
    }}));
    const today = weekly[weekly.length - 1];
    return {status: "ok", ...today, stepGoal, distanceGoal,
      progress: stepGoal > 0 ? Math.min(1, today.steps / stepGoal) : 0,
      weekly};
  } catch (error) {
    const status = (error as {code?: number; response?: {status?: number}}).code ||
      (error as {response?: {status?: number}}).response?.status;
    console.error("Google Fit activity request failed", {status});
    return emptySummary(stepGoal, distanceGoal, "unavailable",
      status === 401 || status === 403 ?
        "Google Fit access has expired. Reconnect your Google account." :
        "Google Fit activity is unavailable right now. Try refreshing later.");
  }
}
