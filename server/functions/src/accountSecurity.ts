import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {FieldValue} from "firebase-admin/firestore";
import {auth, db, invalidateDashboardCache, invalidatePendingAuthorizations, runUserTransaction} from "./utils/db";
import {authenticatedIdentity, recentlyAuthenticated} from "./utils/requestAuth";
import {clearActivitySharing} from "./services/activitySharing";

async function deleteUserRecords(collection: string, userId: string): Promise<void> {
  const query = db.collection(collection).where("userId", "==", userId).limit(100);
  for (;;) {
    const snapshot = await query.get();
    if (snapshot.empty) return;
    const batch = db.batch();
    for (const doc of snapshot.docs) batch.delete(doc.ref);
    await batch.commit();
  }
}

async function revokeAccountSessions(userId: string): Promise<void> {
  await auth.revokeRefreshTokens(userId);
  const devices = await db.collection("users").doc(userId).collection("devices")
    .where("revokedAtMs", "==", 0).get();
  const revokedAtMs = Date.now();
  for (let offset = 0; offset < devices.docs.length; offset += 500) {
    const batch = db.batch();
    for (const doc of devices.docs.slice(offset, offset + 500)) batch.update(doc.ref, {revokedAtMs});
    await batch.commit();
  }
}

async function removeConnection(userId: string, field: "google" | "googlePhotos"): Promise<void> {
  const ref = db.collection("users").doc(userId);
  await runUserTransaction(userId, async (transaction) => {
    if ((await transaction.get(ref)).exists) transaction.update(ref, {[field]: FieldValue.delete()});
  });
}

/** Account controls are available from the signed-in pairing site. */
export const accountSecurityHandler = onRequest(
  {cors: true, maxInstances: 5},
  handleAccountSecurity
);

export async function handleAccountSecurity(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Valid Firebase ID token required"});
    return;
  }
  if (!identity.owner) {
    res.status(403).json({error: "Sign in with Google on the companion site to manage your account"});
    return;
  }
  const userId = identity.userId;
  const action = req.body?.action;
  if (req.method === "POST" && action === "deleteAccount" && !recentlyAuthenticated(identity)) {
    res.status(403).json({error: "Sign out and sign in with Google again before deleting your account (within five minutes)."});
    return;
  }
  const userRef = db.collection("users").doc(userId);
  try {
    if (req.method === "GET") {
      const snapshot = await userRef.get();
      const data = snapshot.data();
      res.status(200).json({
        connections: {
          dashboardGoogle: Boolean(data?.google?.refreshToken),
          mealSheet: Boolean(data?.mealSheet?.refreshToken),
          photos: Boolean(data?.googlePhotos?.refreshToken),
        },
        sharing: "account-only",
      });
      return;
    }
    if (["disconnectPhotos", "disconnectGoogle", "signOutEverywhere", "deleteAccount"].includes(action)) {
      // Cancel both unconsumed and already-exchanging consent before cleanup.
      await invalidatePendingAuthorizations(userId, action === "deleteAccount", true);
    }
    if (action === "disconnectPhotos") {
      const appearance = userRef.collection("appearance");
      await db.recursiveDelete(appearance.doc("background"));
      await appearance.doc("picker").delete();
      await removeConnection(userId, "googlePhotos");
      await revokeAccountSessions(userId);
      res.status(200).json({success: true});
      return;
    }
    if (action === "disconnectGoogle") {
      await removeConnection(userId, "google");
      await invalidateDashboardCache(userId);
      await revokeAccountSessions(userId);
      res.status(200).json({success: true});
      return;
    }
    if (action === "signOutEverywhere") {
      await revokeAccountSessions(userId);
      res.status(200).json({success: true});
      return;
    }
    if (action === "deleteAccount") {
      await auth.updateUser(userId, {disabled: true});
      await clearActivitySharing(userId, true);
      // Remove nested photos, appearance and cache before deleting Auth.
      await auth.revokeRefreshTokens(userId);
      await db.recursiveDelete(userRef);
      await Promise.all([
        deleteUserRecords("oauth_states", userId),
        deleteUserRecords("device_codes", userId),
        deleteUserRecords("user_request_limits", userId),
        deleteUserRecords("poll_links", userId),
        db.collection("pair_attempts").doc(userId).delete(),
        db.collection("user_request_limits").doc(`${userId}_sync`).delete(),
        db.collection("user_request_limits").doc(`${userId}_weather`).delete(),
      ]);
      await auth.deleteUser(userId);
      res.status(200).json({success: true});
      return;
    }
    res.status(400).json({error: "Unsupported account action"});
  } catch (error) {
    console.error("Account security action failed", {
      action, code: (error as {code?: unknown}).code || "unknown",
    });
    res.status(500).json({error: "Account action failed"});
  }
}
