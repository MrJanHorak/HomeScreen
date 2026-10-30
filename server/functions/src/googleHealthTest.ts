import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {authenticatedIdentity} from "./utils/requestAuth";
import {recordUserQuota} from "./utils/db";
import {validTimeZone} from "./utils/zonedTime";
import {fetchGoogleHealthSummary} from "./services/googleHealthRead";
import {MetricResult, PrototypeDay} from "./services/googleHealthPrototype";

const metrics = ["steps", "distanceKm", "calories", "activeMinutesByLevel"] as const;
type MetricName = typeof metrics[number];

/** Report only coverage, not personal values, for the isolated consent test. */
export function coverage(days: PrototypeDay[]): Record<MetricName, {available: number; missing: number; unavailable: number; today: string}> {
  return Object.fromEntries(metrics.map((metric) => {
    const values: MetricResult<unknown>[] = days.map((day) => day[metric]);
    return [metric, {available: values.filter((item) => item.status === "ok").length,
      missing: values.filter((item) => item.status === "missing").length,
      unavailable: values.filter((item) => item.status === "unavailable").length,
      today: values[values.length - 1]?.status || "missing"}];
  })) as Record<MetricName, {available: number; missing: number; unavailable: number; today: string}>;
}

export const googleHealthTestHandler = onRequest({cors: true, maxInstances: 5,
  secrets: ["GOOGLE_HEALTH_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"]}, handleGoogleHealthTest);
export async function handleGoogleHealthTest(req: Request, res: Response): Promise<void> {
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
    res.status(401).json({error: "Sign in to check Google Health."}); return;
  }
  if (!identity.owner) {
    res.status(403).json({error: "Check Google Health from your own account."}); return;
  }
  if (!validTimeZone(req.body?.timeZone)) {
    res.status(400).json({error: "A valid time zone is required."}); return;
  }
  try {
    if (!await recordUserQuota(identity.userId, "health_test_read", 5, 10 * 60 * 1000)) {
      res.status(429).json({error: "Please wait before checking Google Health again."}); return;
    }
    const result = await fetchGoogleHealthSummary(identity.userId, req.body.timeZone, {stepGoal: 10000, distanceGoal: 8});
    if (result.status !== "ok") {
      res.status(200).json({status: result.status}); return;
    }
    res.status(200).json({status: "ok", coverage: coverage(result.summary.weekly)});
  } catch {
    res.status(503).json({error: "Google Health test is unavailable. Try again later."});
  }
}
