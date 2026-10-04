import {Request} from "firebase-functions/v2/https";
import {auth, db} from "./db";

export interface RequestIdentity {
  userId: string;
  deviceId: string | null;
  owner: boolean;
}

/** The caller's Firebase UID is the only accepted user identity. */
export async function authenticatedUserId(req: Request): Promise<string | null> {
  return (await authenticatedIdentity(req))?.userId || null;
}

export async function authenticatedIdentity(req: Request): Promise<RequestIdentity | null> {
  const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || "");
  if (!match) return null;
  return verifiedIdentity(match[1]);
}

export async function verifiedUserId(idToken: string): Promise<string | null> {
  return (await verifiedIdentity(idToken))?.userId || null;
}

async function verifiedIdentity(idToken: string): Promise<RequestIdentity | null> {
  try {
    // Rejected after sign-out-everywhere or account deletion, including an
    // otherwise unexpired one-hour ID token.
    const decoded = await auth.verifyIdToken(idToken, true);
    const deviceId = decoded.dashboardDeviceId;
    if (deviceId !== undefined) {
      if (typeof deviceId !== "string" || !/^[0-9a-f]{32}$/.test(deviceId)) return null;
      const ref = db.collection("users").doc(decoded.uid).collection("devices").doc(deviceId);
      const snapshot = await ref.get();
      const device = snapshot.data();
      if (!snapshot.exists || device?.revokedAtMs !== 0) return null;
      if (Date.now() - Number(device.lastSeenAtMs || 0) > 5 * 60 * 1000) {
        // Updating presence must never recreate a device removed by the owner.
        await ref.update({lastSeenAtMs: Date.now()}).catch(() => undefined);
      }
    }
    return {
      userId: decoded.uid,
      deviceId: deviceId || null,
      owner: deviceId === undefined && decoded.firebase?.sign_in_provider === "google.com",
    };
  } catch {
    return null;
  }
}
