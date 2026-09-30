import {google} from "googleapis";
import type {fitness_v1 as FitnessV1} from "googleapis";
import {GoogleTokens, HealthDay, HealthSummary} from "../types";
import {getOAuth2Client} from "./googleAuth";

const METRICS = ["com.google.step_count.delta", "com.google.calories.expended",
  "com.google.distance.delta", "com.google.active_minutes"];
const MERGED_MOVE_MINUTES =
  "derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes";
const MERGED_BMR =
  "derived:com.google.calories.bmr:com.google.android.gms:merged";
const DAY_MILLIS = 86400000;

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
    calories: 0, activeMinutes: null, progress: 0, weekly: []};
}

function metricPoints(bucket: FitnessV1.Schema$AggregateBucket, metric: string):
  FitnessV1.Schema$DataPoint[] {
  const points: FitnessV1.Schema$DataPoint[] = [];
  for (const [index, dataset] of (bucket.dataset || []).entries()) {
    for (const point of dataset.point || []) {
      const type = point.dataTypeName ||
        METRICS.find((name) => dataset.dataSourceId?.includes(name)) || METRICS[index];
      if (type === metric) points.push(point);
    }
  }
  return points;
}

function sumFloatPoints(points: FitnessV1.Schema$DataPoint[]): number {
  return points.reduce((sum, point) => sum + (point.value?.[0]?.fpVal || 0), 0);
}

function parseBucket(bucket: FitnessV1.Schema$AggregateBucket): Omit<HealthDay, "date"> {
  return {steps: Math.round(metricPoints(bucket, METRICS[0])
    .reduce((sum, point) => sum + (point.value?.[0]?.intVal || 0), 0)),
  distance: Number((sumFloatPoints(metricPoints(bucket, METRICS[2])) / 1000).toFixed(2)),
  calories: Math.round(sumFloatPoints(metricPoints(bucket, METRICS[1]))),
  activeMinutes: moveMinutesFromBucket(bucket)};
}

function moveMinutesFromBucket(bucket: FitnessV1.Schema$AggregateBucket): number | null {
  let minutes = 0;
  let hasData = false;
  for (const point of metricPoints(bucket, METRICS[3])) {
    const duration = point.value?.[0]?.intVal;
    if (duration == null) continue;
    // The DataType reference and live Fit responses express this in minutes.
    minutes += duration;
    hasData = true;
  }
  return hasData ? Math.round(minutes) : null;
}

function pointEndMillis(point: FitnessV1.Schema$DataPoint): number | null {
  if (!point.endTimeNanos) return null;
  const milliseconds = Number(point.endTimeNanos) / 1000000;
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : null;
}

function latestPointEnd(points: FitnessV1.Schema$DataPoint[]): number | null {
  const times = points.map(pointEndMillis).filter((time): time is number => time != null);
  return times.length ? Math.max(...times) : null;
}

/** Fill only the unrecorded interval with the user's effective resting rate. */
async function restingCaloriesSince(fitness: FitnessV1.Fitness, from: number,
  to: number): Promise<number> {
  if (from >= to) return 0;
  const result = await fitness.users.dataSources.datasets.get({
    userId: "me", dataSourceId: MERGED_BMR,
    datasetId: `${Math.floor(Math.max(0, from - 365 * DAY_MILLIS))}000000-` +
      `${Math.floor(to)}000000`,
  });
  const rates = (result.data.point || []).map((point) => ({
    time: pointEndMillis(point), rate: point.value?.[0]?.fpVal,
  })).filter((sample): sample is {time: number; rate: number} =>
    sample.time != null && sample.time <= to &&
    sample.rate != null && Number.isFinite(sample.rate) && sample.rate > 0)
    .sort((a, b) => a.time - b.time);
  const initial = rates.filter((sample) => sample.time <= from).slice(-1)[0];
  if (!initial) return 0;
  let rate = initial.rate;
  let cursor = from;
  let calories = 0;
  for (const sample of rates.filter((sample) => sample.time > from)) {
    calories += rate * (sample.time - cursor) / DAY_MILLIS;
    cursor = sample.time;
    rate = sample.rate;
  }
  return calories + rate * (to - cursor) / DAY_MILLIS;
}

function needsMoveMinutes(day: Omit<HealthDay, "date"> | undefined):
  day is Omit<HealthDay, "date"> {
  return !!day && day.steps > 0 &&
    (day.activeMinutes == null || day.activeMinutes === 0);
}

/** Fetch the current day and seven-day history in the viewer's local time zone. */
export async function fetchHealthData(tokens: GoogleTokens,
  goals: {stepGoal?: number; distanceGoal?: number} = {},
  requestedTimeZone = "UTC", now = new Date()): Promise<HealthSummary> {
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

  const dates = datesEndingToday(now, timeZone);
  try {
    const fitness = google.fitness({version: "v1", auth: getOAuth2Client(tokens)});
    const startTimeMillis = String(zonedMidnight(dates[0], timeZone));
    const endTimeMillis = String(now.getTime());
    const bucketByTime = {period: {type: "day", value: 1, timeZoneId: timeZone}};
    const response = await fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: {
        aggregateBy: [
          {dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"},
          {dataTypeName: METRICS[1]},
          {dataTypeName: METRICS[2]},
          {dataTypeName: METRICS[3]},
        ],
        bucketByTime,
        startTimeMillis,
        endTimeMillis,
      },
    });
    const byDate = new Map<string, Omit<HealthDay, "date">>();
    let todayBucket: FitnessV1.Schema$AggregateBucket | undefined;
    for (const bucket of response.data.bucket || []) {
      const start = Number(bucket.startTimeMillis);
      if (!Number.isFinite(start)) continue;
      const date = dateKey(new Date(start), timeZone);
      byDate.set(date, parseBucket(bucket));
      if (date === dates[dates.length - 1]) todayBucket = bucket;
    }
    // A zero from the type-wide aggregate can coexist with Move Minutes in
    // Google's merged stream, so verify zeroes as well as missing datasets.
    if (dates.some((date) => needsMoveMinutes(byDate.get(date)))) {
      try {
        const merged = await fitness.users.dataset.aggregate({
          userId: "me",
          requestBody: {
            aggregateBy: [{dataSourceId: MERGED_MOVE_MINUTES}],
            bucketByTime,
            startTimeMillis,
            endTimeMillis,
          },
        });
        for (const bucket of merged.data.bucket || []) {
          const start = Number(bucket.startTimeMillis);
          if (!Number.isFinite(start)) continue;
          const date = dateKey(new Date(start), timeZone);
          const day = byDate.get(date);
          const minutes = moveMinutesFromBucket(bucket);
          if (day && (day.activeMinutes == null || day.activeMinutes === 0) &&
              minutes != null) {
            day.activeMinutes = minutes;
          }
        }
      } catch (error) {
        console.warn("Merged Google Fit Move Minutes are unavailable", {
          status: (error as {code?: number; response?: {status?: number}}).code ||
            (error as {response?: {status?: number}}).response?.status,
        });
      }
    }
    const weekly = dates.map((date) => ({date, ...byDate.get(date) || {
      steps: 0, distance: 0, calories: 0, activeMinutes: null,
    }}));
    const today = weekly[weekly.length - 1];
    const stepPoints = todayBucket ? metricPoints(todayBucket, METRICS[0]) : [];
    const caloriePoints = todayBucket ? metricPoints(todayBucket, METRICS[1]) : [];
    const stepEnd = latestPointEnd(stepPoints);
    const calorieEnd = latestPointEnd(caloriePoints);
    const dayStart = zonedMidnight(today.date, timeZone);
    let estimatedRestingCalories = 0;
    // If an existing calorie point lacks timing, avoid filling a possibly
    // overlapping interval. Completed history days remain the recorded totals.
    if (caloriePoints.every((point) => pointEndMillis(point) != null)) {
      try {
        const estimate = await restingCaloriesSince(fitness,
          Math.max(dayStart, calorieEnd ?? dayStart), now.getTime());
        today.calories = Math.round(sumFloatPoints(caloriePoints) + estimate);
        estimatedRestingCalories = Math.round(estimate);
      } catch (error) {
        console.warn("Google Fit resting-calorie estimate is unavailable", {
          status: (error as {code?: number; response?: {status?: number}}).code ||
            (error as {response?: {status?: number}}).response?.status,
        });
      }
    }
    return {status: "ok", ...today, stepGoal, distanceGoal,
      progress: stepGoal > 0 ? Math.min(1, today.steps / stepGoal) : 0,
      weekly, fetchedAt: now.toISOString(), estimatedRestingCalories,
      ...(stepEnd ? {stepsRecordedThrough: new Date(stepEnd).toISOString()} : {}),
      ...(calorieEnd ? {caloriesRecordedThrough: new Date(calorieEnd).toISOString()} : {})};
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
