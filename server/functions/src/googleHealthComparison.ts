import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {authenticatedIdentity} from "./utils/requestAuth";
import {assertAuthorizationVersion, db, getAuthorizationVersion, recordUserQuota} from "./utils/db";
import {validTimeZone} from "./utils/zonedTime";
import {decryptToken} from "./utils/crypto";
import {fetchHealthData} from "./services/googleFit";
import {fetchGoogleHealthSummary} from "./services/googleHealthRead";
import {compareCompletedHealthDays} from "./services/healthComparison";

/** Compare only the caller's accounts; do not save or log metric values. */
export const googleHealthComparisonHandler = onRequest({cors: true, maxInstances: 5,
  secrets: ["GOOGLE_CLIENT_SECRET", "GOOGLE_HEALTH_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"]}, handleGoogleHealthComparison);
export async function handleGoogleHealthComparison(req: Request, res: Response): Promise<void> {
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
    res.status(401).json({error: "Sign in to compare activity."}); return;
  }
  if (!identity.owner) {
    res.status(403).json({error: "Compare activity from your own account."}); return;
  }
  if (!validTimeZone(req.body?.timeZone)) {
    res.status(400).json({error: "A valid time zone is required."}); return;
  }
  try {
    const uid = identity.userId;
    if (!await recordUserQuota(uid, "health_compare", 5, 10 * 60 * 1000)) {
      res.status(429).json({error: "Please wait before comparing activity again."}); return;
    }
    const version = await getAuthorizationVersion(uid);
    const userRef = db.collection("users").doc(uid);
    const healthRef = userRef.collection("activity").doc("googleHealth");
    const [user, healthConnection] = await Promise.all([userRef.get(), healthRef.get()]);
    const google = user.data()?.google;
    const revision = healthConnection.data()?.revision;
    if (!google?.refreshToken) {
      res.status(200).json({status: "fit_not_connected"}); return;
    }
    if (typeof revision !== "string") {
      res.status(200).json({status: "health_not_connected"}); return;
    }
    const now = new Date();
    const [fit, health] = await Promise.all([
      fetchHealthData({refreshToken: decryptToken(google.refreshToken),
        accessToken: google.accessToken ? decryptToken(google.accessToken) : undefined,
        expiryDate: google.expiryDate, scope: google.scope}, {}, req.body.timeZone, now),
      fetchGoogleHealthSummary(uid, req.body.timeZone, {stepGoal: 10000, distanceGoal: 8}, now),
    ]);
    await db.runTransaction(async (tx) => {
      await assertAuthorizationVersion(tx, uid, version);
      const currentUser = await tx.get(userRef);
      const currentHealth = await tx.get(healthRef);
      if (currentUser.data()?.google?.refreshToken !== google.refreshToken || currentHealth.data()?.revision !== revision) {
        throw new Error("Activity connection changed");
      }
    });
    if (fit.status !== "ok") {
      res.status(200).json({status: "fit_unavailable"}); return;
    }
    if (health.status !== "ok") {
      res.status(200).json({status: health.status === "reconnect" ? "health_reconnect" : "health_unavailable"}); return;
    }
    res.status(200).json({status: "ok", days: compareCompletedHealthDays(health.summary.weekly,
      fit.weekly, health.summary.today.date)});
  } catch {
    res.status(503).json({error: "Activity comparison is unavailable. Try again later."});
  }
}
