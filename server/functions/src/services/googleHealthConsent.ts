import * as crypto from "crypto";
import {auth, assertAuthorizationVersion, db} from "../utils/db";
import {encryptToken} from "../utils/crypto";
import {checkGoogleHealthConnection, HealthConnectionStatus} from "./googleHealthConnection";

export const GOOGLE_HEALTH_ACTIVITY_SCOPE = "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly";

interface HealthConsentTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  id_token?: string | null;
  expiry_date?: number | null;
  scope?: string | null;
}

interface HealthConsentClient {
  verifyIdToken(options: {idToken: string; audience: string}): Promise<{getPayload(): {sub?: string} | undefined}>;
  setCredentials(tokens: HealthConsentTokens): void;
  request(options: {url: string; method: "GET"; timeout: number}): Promise<{data: unknown}>;
}

type ConsentResult = "connected" | "invalid_grant" | "account_mismatch" | Exclude<HealthConnectionStatus, "linked">;
interface ConsentDependencies {
  userMatches(uid: string, subject: string): Promise<boolean>;
  save(uid: string, tokens: HealthConsentTokens, version: number, authTimeSeconds: number): Promise<void>;
}

/** Completes a separately initiated, PKCE-protected consent after token exchange. */
export async function completeGoogleHealthConsent(client: HealthConsentClient, tokens: HealthConsentTokens,
  uid: string, clientId: string, version: number, authTimeSeconds: number,
  dependencies: ConsentDependencies = healthConsentDependencies): Promise<ConsentResult> {
  if (!tokens.access_token || !tokens.refresh_token || !tokens.id_token ||
      !tokens.scope?.split(/\s+/).includes(GOOGLE_HEALTH_ACTIVITY_SCOPE)) return "invalid_grant";
  const ticket = await client.verifyIdToken({idToken: tokens.id_token, audience: clientId});
  const subject = ticket.getPayload()?.sub;
  if (!subject || !await dependencies.userMatches(uid, subject)) return "account_mismatch";
  client.setCredentials(tokens);
  const connection = await checkGoogleHealthConnection(client);
  if (connection !== "linked") return connection;
  // The write must recheck authorization inside its transaction, after the network calls.
  await dependencies.save(uid, tokens, version, authTimeSeconds);
  return "connected";
}

const healthConsentDependencies: ConsentDependencies = {
  async userMatches(uid, subject) {
    const user = await auth.getUser(uid);
    return !user.disabled && user.providerData.some((provider) =>
      provider.providerId === "google.com" && provider.uid === subject);
  },
  async save(uid, tokens, version, authTimeSeconds) {
    const ref = db.collection("users").doc(uid).collection("activity").doc("googleHealth");
    await db.runTransaction(async (tx) => {
      await assertAuthorizationVersion(tx, uid, version, authTimeSeconds);
      tx.set(ref, {provider: "google-health", revision: crypto.randomBytes(16).toString("hex"),
        google: {accessToken: encryptToken(tokens.access_token!), refreshToken: encryptToken(tokens.refresh_token!),
          expiryDate: tokens.expiry_date ?? null, scope: tokens.scope}});
    });
  },
};
