import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import * as crypto from "crypto";
import {db, getAuthorizationVersion, recordUserQuota, runUserTransaction, assertAuthorizationVersion, invalidatePendingAuthorizations} from "./utils/db";
import {authenticatedIdentity} from "./utils/requestAuth";
import {activityProfile, invitationHash, validInvitation, validPersonId} from "./utils/people";
import {activityShares, ActivityShare, clearActivitySharing, createActivityInvitation,
  readActivityConnection, readActivityInvitation, removeActivityShare, activityTokens} from "./services/activitySharing";
import {fetchHealthData} from "./services/googleFit";
import {validTimeZone, zonedDateKey} from "./utils/zonedTime";
import type {HealthSummary} from "./types";
import {logSafeError} from "./utils/safeLog";

export const peopleHandler = onRequest({cors: true, maxInstances: 5}, handlePeople);
export async function handlePeople(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send(""); return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Sign in to manage people."}); return;
  }
  const uid = identity.userId;
  try {
    if (req.method === "GET") {
      if (req.query.invite !== undefined) {
        if (!identity.owner || !validInvitation(req.query.invite)) {
          res.status(400).json({error: "Invalid invitation."}); return;
        }
        const invite = await readActivityInvitation(invitationHash(req.query.invite));
        if (invite.dashboardId === uid) {
          res.status(400).json({error: "Open this invitation with the other person’s Google account."}); return;
        }
        res.status(200).json({dashboardName: invite.dashboardName, expiresAtMs: invite.expiresAtMs}); return;
      }
      const [members, sharing, connection] = await Promise.all([
        activityShares("dashboardId", uid),
        identity.owner ? activityShares("userId", uid) : Promise.resolve([]),
        identity.owner ? readActivityConnection(uid) : Promise.resolve(null),
      ]);
      res.status(200).json({people: members.map((doc) => ({id: doc.id, name: doc.data().name})),
        sharing: sharing.map((doc) => ({id: doc.id, name: doc.data().name, dashboardName: doc.data().dashboardName})),
        connection: identity.owner ? {connected: !!connection?.google?.refreshToken,
          name: connection?.name || "",
          stepGoal: connection?.stepGoal || 10000, distanceGoal: connection?.distanceGoal || 8} : null}); return;
    }
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"}); return;
    }
    const action = req.body?.action;
    if (action === "invite") {
      if (!await recordUserQuota(uid, "activity_invitation", 10, 30 * 60 * 1000)) {
        res.status(429).json({error: "Please wait before creating another invitation."}); return;
      }
      res.status(200).json(await createActivityInvitation(uid)); return;
    }
    if (action === "cancelInvitation" && typeof req.body.id === "string" && /^[a-f0-9]{64}$/.test(req.body.id)) {
      await db.runTransaction(async (tx) => {
        const ref = db.collection("activity_invitations").doc(req.body.id);
        if ((await tx.get(ref)).data()?.dashboardId !== uid) throw new Error("Invitation is unavailable.");
        tx.delete(ref);
      });
      res.status(200).json({success: true}); return;
    }
    if (action === "remove" && validPersonId(req.body.id)) {
      await removeActivityShare(req.body.id, uid, identity.owner);
      res.status(200).json({success: true}); return;
    }
    if (action === "disconnect" && identity.owner) {
      // Invalidate OAuth before deleting; a callback cannot restore disconnected data.
      await invalidatePendingAuthorizations(uid);
      await clearActivitySharing(uid);
      res.status(200).json({success: true}); return;
    }
    if (action === "goals" && identity.owner) {
      const profile = activityProfile({name: "Activity", ...req.body});
      if (!profile) {
        res.status(400).json({error: "Choose a step goal from 100–100,000 and a distance goal from 0.1–200 km."}); return;
      }
      await runUserTransaction(uid, async (tx) => {
        const ref = db.collection("users").doc(uid).collection("activity").doc("connection");
        if (!(await tx.get(ref)).exists) throw new Error("Connect activity first.");
        tx.update(ref, {stepGoal: profile.stepGoal, distanceGoal: profile.distanceGoal, revision: crypto.randomBytes(16).toString("hex")});
      });
      res.status(200).json({success: true}); return;
    }
    res.status(400).json({error: "Unsupported people action."});
  } catch (error) {
    logSafeError("People request failed", error);
    res.status(400).json({error: error instanceof Error ? error.message : "Could not manage people."});
  }
}

function unavailable(stepGoal = 10000, distanceGoal = 8): HealthSummary {
  return {status: "unavailable", message: "Activity is unavailable. This person can reconnect from People on their phone.",
    steps: 0, distance: 0, calories: 0, activeMinutes: null, progress: 0, weekly: [], stepGoal, distanceGoal};
}

/** Provider-specific credentials stay behind this function; caches are scoped to person and time zone. */
export async function sharedPersonActivity(uid: string, timeZone: string): Promise<{health: HealthSummary; revision: string | null}> {
  const version = await getAuthorizationVersion(uid);
  const connection = await readActivityConnection(uid);
  if (!connection?.google?.refreshToken) return {health: unavailable(), revision: null};
  const revision = String(connection.revision);
  const day = zonedDateKey(new Date(), timeZone);
  const cacheRef = db.collection("users").doc(uid).collection("activity")
    .doc(`cache_${invitationHash(timeZone).slice(0, 32)}`);
  const cache = (await cacheRef.get()).data();
  if (cache?.revision === revision && cache.day === day && Date.now() - cache.cachedAtMs < 10 * 60 * 1000) return {health: cache.health, revision};
  if (!await recordUserQuota(uid, "shared_activity_refresh", 6, 10 * 60 * 1000)) {
    return {health: unavailable(connection.stepGoal, connection.distanceGoal), revision};
  }
  const health = await fetchHealthData(activityTokens(connection), connection, timeZone);
  await db.runTransaction(async (tx) => {
    await assertAuthorizationVersion(tx, uid, version);
    const current = await tx.get(db.collection("users").doc(uid).collection("activity").doc("connection"));
    if (current.data()?.revision !== revision) throw new Error("Activity connection changed.");
    tx.set(cacheRef, {health, revision, day, cachedAtMs: Date.now()});
  });
  return {health, revision};
}

export const peopleActivityHandler = onRequest({cors: true, maxInstances: 10,
  secrets: ["TOKEN_ENCRYPTION_KEY", "GOOGLE_CLIENT_SECRET"]}, handlePeopleActivity);
export async function handlePeopleActivity(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send(""); return;
  }
  if (req.method !== "GET") {
    res.status(405).json({error: "Method not allowed"}); return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Valid Firebase ID token required"}); return;
  }
  try {
    const uid = identity.userId;
    if (!await recordUserQuota(uid, "people_activity_feed", 120, 60000)) {
      res.status(429).json({error: "Please wait before refreshing shared activity again."}); return;
    }
    const version = await getAuthorizationVersion(uid);
    const requestedZone = req.header("X-Time-Zone");
    const timeZone = validTimeZone(requestedZone) ? requestedZone : "UTC";
    const docs = await activityShares("dashboardId", uid);
    const results = await Promise.all(docs.map(async (doc) => {
      const share = doc.data() as ActivityShare;
      try {
        return {id: doc.id, share, ...await sharedPersonActivity(share.userId, timeZone)};
      } catch {
        return {id: doc.id, share, health: unavailable(), revision: null};
      }
    }));
    // Recheck grants after upstream requests, including cache hits and account deletion.
    const people = await db.runTransaction(async (tx) => {
      await assertAuthorizationVersion(tx, uid, version);
      const visible = [];
      for (const result of results) {
        const current = (await tx.get(db.collection("activity_shares").doc(result.id))).data();
        const security = (await tx.get(db.collection("account_security").doc(result.share.userId))).data();
        const connection = (await tx.get(db.collection("users").doc(result.share.userId).collection("activity").doc("connection"))).data();
        if (current?.dashboardId === uid && current.revision === result.share.revision && !security?.deleted) {
          visible.push({id: result.id, name: current.name,
            health: connection?.revision === result.revision ? result.health : unavailable()});
        }
      }
      return visible;
    });
    res.status(200).json({people, updatedAt: new Date().toISOString()});
  } catch (error) {
    logSafeError("Shared activity refresh failed", error);
    res.status(503).json({error: "Could not refresh shared activity."});
  }
}
