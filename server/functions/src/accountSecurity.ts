import {onRequest} from "firebase-functions/v2/https";
import {FieldValue} from "firebase-admin/firestore";
import {auth, db, invalidateDashboardCache} from "./utils/db";
import {authenticatedUserId} from "./utils/requestAuth";

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

/** Account controls are available from the signed-in pairing site. */
export const accountSecurityHandler = onRequest(
  {cors: true, maxInstances: 5},
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({error: "Valid Firebase ID token required"});
      return;
    }
    const action = req.body?.action;
    const userRef = db.collection("users").doc(userId);
    try {
      if (action === "disconnectPhotos") {
        const appearance = userRef.collection("appearance");
        await db.recursiveDelete(appearance.doc("background"));
        await appearance.doc("picker").delete();
        await userRef.set({googlePhotos: FieldValue.delete()}, {merge: true});
        await auth.revokeRefreshTokens(userId);
        res.status(200).json({success: true});
        return;
      }
      if (action === "disconnectGoogle") {
        await userRef.set({google: FieldValue.delete()}, {merge: true});
        await invalidateDashboardCache(userId);
        await auth.revokeRefreshTokens(userId);
        res.status(200).json({success: true});
        return;
      }
      if (action === "signOutEverywhere") {
        await auth.revokeRefreshTokens(userId);
        res.status(200).json({success: true});
        return;
      }
      if (action === "deleteAccount") {
        // Remove nested photos, appearance and cache before deleting Auth.
        await auth.revokeRefreshTokens(userId);
        await db.recursiveDelete(userRef);
        await Promise.all([
          deleteUserRecords("oauth_states", userId),
          deleteUserRecords("device_codes", userId),
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
);
