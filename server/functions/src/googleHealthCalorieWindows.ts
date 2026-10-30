import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {authenticatedIdentity} from "./utils/requestAuth";
import {assertAuthorizationVersion, db, getAuthorizationVersion, recordUserQuota} from "./utils/db";
import {decryptToken} from "./utils/crypto";
import {validTimeZone, zonedDateKey, zonedMidnight} from "./utils/zonedTime";
import {makeHealthOAuthClient} from "./services/googleHealthRead";
import {compareCalorieWindows} from "./services/healthCalorieWindows";

export const googleHealthCalorieWindowsHandler = onRequest({cors: true, maxInstances: 5,
  secrets: ["GOOGLE_HEALTH_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"]}, handleGoogleHealthCalorieWindows);
export async function handleGoogleHealthCalorieWindows(req: Request, res: Response): Promise<void> {
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
    res.status(401).json({error: "Sign in to check activity."}); return;
  }
  if (!identity.owner) {
    res.status(403).json({error: "Check activity from your own account."}); return;
  }
  const {timeZone, date} = req.body || {};
  if (!validTimeZone(timeZone) || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({error: "Choose a completed date and valid time zone."}); return;
  }
  const dateMs = Date.parse(`${date}T00:00:00Z`);
  const today = zonedDateKey(new Date(), timeZone);
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(dateMs) || new Date(dateMs).toISOString().slice(0, 10) !== date ||
      dateMs >= todayMs || dateMs < todayMs - 13 * 86400000) {
    res.status(400).json({error: "Choose a completed date within the last 13 days."}); return;
  }
  try {
    if (!await recordUserQuota(identity.userId, "health_calorie_windows", 3, 10 * 60 * 1000)) {
      res.status(429).json({error: "Please wait before checking again."}); return;
    }
    const version = await getAuthorizationVersion(identity.userId);
    const ref = db.collection("users").doc(identity.userId).collection("activity").doc("googleHealth");
    const stored = (await ref.get()).data();
    if (typeof stored?.revision !== "string" || !stored?.google?.refreshToken) {
      res.status(200).json({status: "not_connected"}); return;
    }
    const tomorrow = new Date(dateMs + 86400000).toISOString().slice(0, 10);
    const start = zonedMidnight(date, timeZone); const end = zonedMidnight(tomorrow, timeZone);
    const clock = new Intl.DateTimeFormat("en-US", {timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"});
    if (zonedDateKey(new Date(start), timeZone) !== date || zonedDateKey(new Date(end), timeZone) !== tomorrow ||
        clock.format(new Date(start)) !== "00:00:00" || clock.format(new Date(end)) !== "00:00:00") {
      throw new Error("Local midnight is unavailable");
    }
    const client = makeHealthOAuthClient(decryptToken(stored.google.refreshToken),
      stored.google.accessToken ? decryptToken(stored.google.accessToken) : undefined, stored.google.expiryDate);
    const result = await compareCalorieWindows(client, start, end);
    await db.runTransaction(async (tx) => {
      await assertAuthorizationVersion(tx, identity.userId, version);
      if ((await tx.get(ref)).data()?.revision !== stored.revision) throw new Error("Health connection changed");
    });
    res.status(200).json({status: "ok", date, hours: Math.ceil((end - start) / 3600000), ...result});
  } catch {
    res.status(503).json({error: "Hourly source check is unavailable. Try again later."});
  }
}
