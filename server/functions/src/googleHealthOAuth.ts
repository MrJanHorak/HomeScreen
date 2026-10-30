import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {Timestamp} from "firebase-admin/firestore";
import {google} from "googleapis";
import {CodeChallengeMethod} from "google-auth-library";
import * as crypto from "crypto";
import {db, getAuthorizationVersion, recordUserQuota} from "./utils/db";
import {authenticatedIdentity} from "./utils/requestAuth";
import {logSafeError} from "./utils/safeLog";
import {completeGoogleHealthConsent, GOOGLE_HEALTH_ACTIVITY_SCOPE} from "./services/googleHealthConsent";

const LIFETIME = 10 * 60 * 1000;
interface HealthOAuthState {
  userId: string; authorizationVersion: number; authTimeSeconds: number;
  codeVerifier: string; expiresAt: number;
}
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
function setting(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}
function enabled(): boolean {
  return process.env.GOOGLE_HEALTH_OAUTH_ENABLED === "true";
}
function returnToPeople(res: Response, result: "connected" | "denied" | "error"): void {
  const url = new URL("/people", setting("PAIRING_URL"));
  url.searchParams.set("result", `health_test_${result}`);
  res.redirect(303, url.toString());
}

/** Optional test-only connection; this does not enable the dashboard provider. */
export const beginGoogleHealthHandler = onRequest({cors: true, maxInstances: 5}, handleBeginGoogleHealth);
export async function handleBeginGoogleHealth(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send(""); return;
  }
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"}); return;
  }
  if (!enabled()) {
    res.status(404).json({error: "Google Health connection is unavailable."}); return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Sign in to connect Google Health."}); return;
  }
  if (!identity.owner) {
    res.status(403).json({error: "Connect from your own Google account."}); return;
  }
  if (req.body?.consent !== true) {
    res.status(400).json({error: "Approve Google Health access to continue."}); return;
  }
  try {
    const clientId = setting("GOOGLE_HEALTH_CLIENT_ID");
    const redirect = setting("GOOGLE_HEALTH_REDIRECT_URI");
    if (!await recordUserQuota(identity.userId, "health_consent", 10, LIFETIME)) {
      res.status(429).json({error: "Please wait before starting consent again."}); return;
    }
    const state = crypto.randomBytes(32).toString("base64url");
    const codeVerifier = crypto.randomBytes(48).toString("base64url");
    const record: HealthOAuthState = {userId: identity.userId,
      authorizationVersion: await getAuthorizationVersion(identity.userId),
      authTimeSeconds: identity.authTimeSeconds || 0, codeVerifier, expiresAt: Date.now() + LIFETIME};
    await db.collection("health_oauth_states").doc(hash(state)).create({...record,
      deleteAt: Timestamp.fromMillis(record.expiresAt + 60 * 60 * 1000)});
    const client = new google.auth.OAuth2(clientId, undefined, redirect);
    res.status(200).json({authorizationUrl: client.generateAuthUrl({access_type: "offline", prompt: "consent",
      scope: ["openid", "email", GOOGLE_HEALTH_ACTIVITY_SCOPE], state,
      code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: crypto.createHash("sha256").update(codeVerifier).digest("base64url")})});
  } catch (error) {
    logSafeError("Could not start Google Health consent", error);
    res.status(500).json({error: "Google Health connection could not start."});
  }
}

export async function consumeHealthState(state: string): Promise<HealthOAuthState | null> {
  const ref = db.collection("health_oauth_states").doc(hash(state));
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    tx.delete(ref);
    const record = snapshot.data() as HealthOAuthState;
    return Number.isFinite(record.expiresAt) && Date.now() < record.expiresAt ? record : null;
  });
}

/** Separate callback and client keep the test project's grant apart from existing OAuth. */
export const googleHealthOAuthCallbackHandler = onRequest({maxInstances: 5,
  secrets: ["GOOGLE_HEALTH_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"]}, handleGoogleHealthOAuthCallback);
export async function handleGoogleHealthOAuthCallback(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if (req.method !== "GET") {
    res.status(405).send("Method not allowed"); return;
  }
  if (!enabled()) {
    res.status(404).send("Google Health connection is unavailable."); return;
  }
  const state = req.query.state;
  if (typeof state !== "string" || !/^[A-Za-z0-9_-]{40,64}$/.test(state)) {
    res.status(400).send("Google Health connection expired. Start again."); return;
  }
  try {
    const record = await consumeHealthState(state);
    if (!record || !Number.isSafeInteger(record.authTimeSeconds) || record.authTimeSeconds <= 0) {
      res.status(400).send("Google Health connection expired. Start again."); return;
    }
    if (req.query.error) {
      returnToPeople(res, "denied"); return;
    }
    if (typeof req.query.code !== "string" || !req.query.code) {
      returnToPeople(res, "error"); return;
    }
    const clientId = setting("GOOGLE_HEALTH_CLIENT_ID");
    const client = new google.auth.OAuth2(clientId, setting("GOOGLE_HEALTH_CLIENT_SECRET"),
      setting("GOOGLE_HEALTH_REDIRECT_URI"));
    const {tokens} = await client.getToken({code: req.query.code, codeVerifier: record.codeVerifier});
    const result = await completeGoogleHealthConsent(client, tokens, record.userId, clientId,
      record.authorizationVersion, record.authTimeSeconds);
    if (result !== "connected") {
      returnToPeople(res, "error"); return;
    }
    returnToPeople(res, "connected");
  } catch (error) {
    logSafeError("Could not finish Google Health consent", error);
    try {
      returnToPeople(res, "error");
    } catch {
      res.status(400).send("Google Health connection could not be completed. Start again.");
    }
  }
}
