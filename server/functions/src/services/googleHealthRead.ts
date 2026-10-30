import {google} from "googleapis";
import {assertAuthorizationVersion, db, getAuthorizationVersion} from "../utils/db";
import {decryptToken, encryptToken} from "../utils/crypto";
import {healthRollupTransport, readHealthPrototypeThroughNow} from "./googleHealthPrototype";
import {GoogleHealthSummary, makeGoogleHealthSummary} from "./googleHealthSummary";

type HealthReadResult = {status: "ok"; summary: GoogleHealthSummary; refreshVerified?: boolean} |
  {status: "not_connected" | "reconnect" | "unavailable"};

/** Each request uses the Health OAuth client, never the existing Fit client. */
export function makeHealthOAuthClient(refreshToken: string, accessToken?: string, expiryDate?: number) {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const secret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_HEALTH_REDIRECT_URI;
  if (!clientId || !secret || !redirect || !refreshToken) throw new Error("Health OAuth configuration is incomplete");
  const client = new google.auth.OAuth2(clientId, secret, redirect);
  // Only use a cached access token when its expiration time is known.
  client.setCredentials({refresh_token: refreshToken,
    ...(accessToken && typeof expiryDate === "number" && Number.isFinite(expiryDate) ?
      {access_token: accessToken, expiry_date: expiryDate} : {})});
  return client;
}

function isExpiredGrant(error: unknown): boolean {
  const details = error as {response?: {status?: number; data?: {error?: unknown}}};
  return details?.response?.status === 401 || details?.response?.data?.error === "invalid_grant";
}

/** Isolated read: no client endpoint, cache, sharing or dashboard provider switch. */
export async function fetchGoogleHealthSummary(uid: string, timeZone: string,
  goals: {stepGoal: number; distanceGoal: number}, now = new Date(),
  options: {forceRefresh?: boolean} = {}): Promise<HealthReadResult> {
  try {
    const version = await getAuthorizationVersion(uid);
    const ref = db.collection("users").doc(uid).collection("activity").doc("googleHealth");
    const stored = (await ref.get()).data();
    if (!stored?.google?.refreshToken || typeof stored.revision !== "string" ||
        stored.provider !== "google-health") return {status: "not_connected"};
    const revision = stored.revision;
    const accessToken = stored.google.accessToken ? decryptToken(stored.google.accessToken) : undefined;
    const client = makeHealthOAuthClient(decryptToken(stored.google.refreshToken),
      options.forceRefresh ? undefined : accessToken, stored.google.expiryDate);
    const request = healthRollupTransport(client);
    let attempts = 0;
    let expired = 0;
    const days = await readHealthPrototypeThroughNow(now, timeZone, async (metric, body) => {
      attempts++;
      try {
        return await request(metric, body);
      } catch (error) {
        if (isExpiredGrant(error)) expired++;
        throw error;
      }
    });
    const summary = makeGoogleHealthSummary(days, goals, new Date());
    // Discard in-flight results after a disconnect or a new consent replaces the grant.
    await db.runTransaction(async (tx) => {
      await assertAuthorizationVersion(tx, uid, version);
      if ((await tx.get(ref)).data()?.revision !== revision) throw new Error("Health connection changed");
      const credentials = client.credentials;
      if (credentials.access_token && (credentials.access_token !== accessToken ||
          credentials.expiry_date !== stored.google.expiryDate) &&
          typeof credentials.expiry_date === "number" && Number.isFinite(credentials.expiry_date)) {
        tx.update(ref, {"google.accessToken": encryptToken(credentials.access_token),
          "google.expiryDate": credentials.expiry_date});
      }
    });
    if (attempts > 0 && expired === attempts) return {status: "reconnect"};
    return {status: "ok", summary, ...(options.forceRefresh ?
      {refreshVerified: Boolean(client.credentials.access_token)} : {})};
  } catch {
    // Never expose credential, provider, or encryption errors to callers.
    return {status: "unavailable"};
  }
}
