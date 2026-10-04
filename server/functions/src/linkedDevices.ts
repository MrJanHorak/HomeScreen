import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {auth, db} from "./utils/db";
import {authenticatedIdentity} from "./utils/requestAuth";
import {logSafeError} from "./utils/safeLog";
import * as crypto from "crypto";

/** Only a Google owner session may rename or revoke linked TV sessions. */
export async function handleLinkedDevices(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method)) {
    res.status(405).json({error: "Method not allowed"});
    return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Valid Firebase ID token required"});
    return;
  }
  const devices = db.collection("users").doc(identity.userId).collection("devices");
  try {
    if (req.method === "POST" && req.query.current === "1") {
      // Older TV tokens predate device claims. Upgrade the session in place so
      // the owner can see and manage it without signing out or re-pairing.
      const installationKey = req.body?.installationKey;
      if (identity.owner || identity.deviceId || typeof installationKey !== "string" ||
        !/^[a-zA-Z0-9-]{16,80}$/.test(installationKey) || JSON.stringify(req.body || {}).length > 200) {
        res.status(400).json({error: "A legacy TV session and installation key are required"});
        return;
      }
      const id = crypto.createHash("sha256").update(`${identity.userId}:${installationKey}`).digest("hex").slice(0, 32);
      const ref = devices.doc(id);
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) {
          transaction.create(ref, {
            name: "HomeScreen TV", pairedAtMs: Date.now(), lastSeenAtMs: Date.now(), revokedAtMs: 0,
          });
        }
      });
      const snapshot = await ref.get();
      if (snapshot.data()?.revokedAtMs !== 0) {
        res.status(403).json({error: "This TV was removed. Pair it again to reconnect."});
        return;
      }
      res.status(200).json({customToken: await auth.createCustomToken(identity.userId, {dashboardDeviceId: id})});
      return;
    }
    if (req.query.current === "1" && (req.method === "GET" || req.method === "DELETE")) {
      const ref = identity.deviceId ? devices.doc(identity.deviceId) : null;
      if (req.method === "DELETE") {
        if (ref) await ref.update({revokedAtMs: Date.now()});
        res.status(200).json({success: true});
        return;
      }
      const device = ref ? (await ref.get()).data() : null;
      let companionUrl: string | null = null;
      try {
        if (process.env.PAIRING_URL) companionUrl = new URL("/dashboard", process.env.PAIRING_URL).toString();
      } catch {
        // The client can use its configured public site as a fallback.
      }
      res.status(200).json({
        device: device ? {name: device.name, pairedAtMs: device.pairedAtMs} : null,
        companionUrl,
      });
      return;
    }
    if (!identity.owner) {
      res.status(403).json({error: "Sign in with Google on the companion site to manage linked TVs"});
      return;
    }
    if (req.method === "GET") {
      const snapshot = await devices.where("revokedAtMs", "==", 0).limit(100).get();
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: String(doc.data().name || "HomeScreen TV"),
        pairedAtMs: Number(doc.data().pairedAtMs || 0),
        lastSeenAtMs: Number(doc.data().lastSeenAtMs || 0),
      })).sort((a, b) => b.pairedAtMs - a.pairedAtMs);
      res.status(200).json({devices: items});
      return;
    }
    const id = req.body?.id;
    const name: string = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (typeof id !== "string" || !/^[0-9a-f]{32}$/.test(id) ||
      JSON.stringify(req.body || {}).length > 1_000 ||
      (req.method === "PUT" && (!name || name.length > 40 ||
        Array.from(name).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)))) {
      res.status(400).json({error: "Use a valid TV and a name of 1–40 characters"});
      return;
    }
    const updated = await db.runTransaction(async (transaction) => {
      const ref = devices.doc(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.data()?.revokedAtMs !== 0) return false;
      transaction.update(ref, req.method === "DELETE" ? {revokedAtMs: Date.now()} : {name});
      return true;
    });
    res.status(updated ? 200 : 404).json(updated ? {success: true} : {error: "TV is no longer linked"});
  } catch (error) {
    logSafeError("Could not manage linked TV", error);
    res.status(500).json({error: "Could not update linked TVs"});
  }
}

export const linkedDevicesHandler = onRequest({cors: true, maxInstances: 5}, handleLinkedDevices);
