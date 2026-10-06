import {Request} from "firebase-functions/v2/https";
import {auth, db} from "./db";

export interface RequestIdentity {
  userId: string;
  deviceId: string | null;
  owner: boolean;
  authTimeSeconds?: number;
}

/** A refresh is not a new sign-in; destructive controls use Firebase auth_time. */
export function recentlyAuthenticated(identity: RequestIdentity, maxAgeSeconds = 300): boolean {
  const age = Date.now() / 1000 - (identity.authTimeSeconds ?? 0);
  return Number.isSafeInteger(identity.authTimeSeconds) && age >= 0 && age <= maxAgeSeconds;
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
    const provider = decoded.firebase?.sign_in_provider;
    // A legacy token cannot be tied to a revocable installation. Require pairing
    // again instead of allowing it to mint arbitrarily many replacement devices.
    if (deviceId === undefined && provider !== "google.com") return null;
    if (deviceId !== undefined && provider !== "custom") return null;
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
      owner: deviceId === undefined && provider === "google.com",
      ...(Number.isSafeInteger(decoded.auth_time) ? {authTimeSeconds: decoded.auth_time} : {}),
    };
  } catch {
    return null;
  }
}
