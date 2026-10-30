import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {authenticatedIdentity} from "./utils/requestAuth";
import {assertAuthorizationVersion, db, getAuthorizationVersion, recordUserQuota} from "./utils/db";
import {validTimeZone} from "./utils/zonedTime";
import {fetchGoogleHealthSummary} from "./services/googleHealthRead";
import {MetricResult} from "./services/googleHealthPrototype";

type Difference = {status: "compared"; percent: number} |
  {status: "missing" | "unavailable" | "baseline_missing" | "baseline_unavailable" | "baseline_zero"};
export function sourceDifference(value: MetricResult<number>, baseline: MetricResult<number>): Difference {
  if (baseline.status === "missing") return {status: "baseline_missing"};
  if (baseline.status === "unavailable") return {status: "baseline_unavailable"};
  if (value.status !== "ok") return {status: value.status};
  if (baseline.value === 0) return {status: "baseline_zero"};
  const percent = Math.round((value.value - baseline.value) / baseline.value * 1000) / 10;
  return Number.isFinite(percent) ? {status: "compared", percent} : {status: "unavailable"};
}

/** Owner-only diagnostic; report differences, never raw calorie values or source identities. */
export const googleHealthCalorieSourcesHandler = onRequest({cors: true, maxInstances: 5,
  secrets: ["GOOGLE_HEALTH_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"]}, handleGoogleHealthCalorieSources);
export async function handleGoogleHealthCalorieSources(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send(""); return;
  }
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"}); return;
  }
  if (process.env.GOOGLE_HEALTH_OAUTH_ENABLED !== "true") {
    res.status(404).json({error: "Google Health test is unavailable."}); return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Sign in to check sources."}); return;
  }
  if (!identity.owner) {
    res.status(403).json({error: "Check sources from your own account."}); return;
  }
  if (!validTimeZone(req.body?.timeZone)) {
    res.status(400).json({error: "A valid time zone is required."}); return;
  }
  try {
    const uid = identity.userId;
    if (!await recordUserQuota(uid, "health_calorie_sources", 3, 10 * 60 * 1000)) {
      res.status(429).json({error: "Please wait before checking sources again."}); return;
    }
    const version = await getAuthorizationVersion(uid);
    const ref = db.collection("users").doc(uid).collection("activity").doc("googleHealth");
    const revision = (await ref.get()).data()?.revision;
    if (typeof revision !== "string") {
      res.status(200).json({status: "not_connected"}); return;
    }
    const now = new Date();
    const goals = {stepGoal: 10000, distanceGoal: 8};
    const families = ["all-sources", "google-sources", "google-wearables"] as const;
    const results = await Promise.all(families.map((sourceFamily) =>
      fetchGoogleHealthSummary(uid, req.body.timeZone, goals, now, {caloriesOnly: true, sourceFamily})));
    await db.runTransaction(async (tx) => {
      await assertAuthorizationVersion(tx, uid, version);
      if ((await tx.get(ref)).data()?.revision !== revision) throw new Error("Health connection changed");
    });
    if (results.some((item) => item.status !== "ok")) {
      res.status(200).json({status: results.some((item) => item.status === "reconnect") ? "reconnect" : "unavailable"}); return;
    }
    const [all, google, wearable] = results;
    if (all.status !== "ok" || google.status !== "ok" || wearable.status !== "ok") throw new Error("Missing summary");
    const byDate = (days: typeof all.summary.weekly) => new Map(days.map((day) => [day.date, day.calories]));
    const googleDates = byDate(google.summary.weekly);
    const wearableDates = byDate(wearable.summary.weekly);
    const missing = {status: "missing"} as const;
    const days = all.summary.weekly.filter((day) => day.date < all.summary.today.date).map((day) => ({date: day.date,
      google: sourceDifference(googleDates.get(day.date) || missing, day.calories),
      wearables: sourceDifference(wearableDates.get(day.date) || missing, day.calories)}));
    res.status(200).json({status: "ok", days});
  } catch {
    res.status(503).json({error: "Source comparison is unavailable. Try again later."});
  }
}
