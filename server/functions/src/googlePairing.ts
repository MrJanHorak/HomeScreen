import {onRequest, Request} from "firebase-functions/v2/https";
import * as crypto from "crypto";
import {google} from "googleapis";
import {CodeChallengeMethod} from "google-auth-library";
import type {Response} from "express";
import {Timestamp} from "firebase-admin/firestore";
import {
  auth,
  authorizeDeviceWithGoogleTokens,
  db,
  getDeviceCode,
  getAuthorizationVersion,
  recordUserQuota,
  recordPairingAttempt,
  saveMealSheetTokens,
  savePhotosTokens,
} from "./utils/db";
import {authenticatedIdentity} from "./utils/requestAuth";
import {logSafeError} from "./utils/safeLog";
import {ACTIVITY_SCOPES, activityProfile, invitationHash, validInvitation} from "./utils/people";
import {readActivityInvitation, saveActivityConsent} from "./services/activitySharing";

const STATE_LIFETIME_MS = 10 * 60 * 1000;
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.location.read",
];
const PHOTOS_SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const MEALS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

interface OAuthState {
  userId: string;
  authorizationVersion: number;
  authTimeSeconds: number;
  deviceCode?: string;
  kind?: "device" | "photos" | "meals" | "activity";
  inviteHash?: string;
  activityProfile?: {name: string; stepGoal: number; distanceGoal: number};
  codeVerifier: string;
  expiresAt: number;
  deleteAt?: Timestamp;
}

function requiredSetting(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function pairingRedirect(result: "connected" | "denied" | "expired" | "error" |
  "meals_connected" | "meals_denied" | "meals_error" |
  "activity_connected" | "activity_denied" | "activity_error"): string {
  const url = new URL(requiredSetting("PAIRING_URL"));
  if (result.startsWith("meals_")) url.pathname = "/meals";
  if (result.startsWith("activity_")) url.pathname = "/people";
  url.searchParams.set("result", result);
  return url.toString();
}

export async function consumeState(state: string): Promise<OAuthState | null> {
  const ref = db.collection("oauth_states").doc(hash(state));
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    transaction.delete(ref);
    const record = snapshot.data() as OAuthState;
    return Date.now() <= record.expiresAt ? record : null;
  });
}

export const beginGoogleLinkHandler = onRequest(
  {cors: true, maxInstances: 10},
  handleBeginGoogleLink
);

/** A participant approves activity-only access from their own signed-in browser. */
export const beginGoogleActivityHandler = onRequest({cors: true, maxInstances: 5}, handleBeginGoogleActivity);
export async function handleBeginGoogleActivity(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send(""); return;
  }
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"}); return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Sign in to connect your activity."}); return;
  }
  if (!identity.owner) {
    res.status(403).json({error: "Connect activity from your own Google account on a phone or computer."}); return;
  }
  const profile = activityProfile(req.body);
  if (!profile || req.body?.consent !== true || (req.body.invite !== undefined && !validInvitation(req.body.invite))) {
    res.status(400).json({error: "Enter your name and goals and approve activity sharing."}); return;
  }
  try {
    const inviteHash = req.body.invite ? invitationHash(req.body.invite) : undefined;
    if (inviteHash && (await readActivityInvitation(inviteHash)).dashboardId === identity.userId) {
      res.status(400).json({error: "Use the other person’s Google account for this invitation."}); return;
    }
    if (!await recordUserQuota(identity.userId, "activity_consent", 10, STATE_LIFETIME_MS)) {
      res.status(429).json({error: "Please wait before starting activity consent again."}); return;
    }
    const state = crypto.randomBytes(32).toString("base64url");
    const codeVerifier = crypto.randomBytes(48).toString("base64url");
    const record: OAuthState = {kind: "activity", userId: identity.userId,
      authTimeSeconds: identity.authTimeSeconds || 0,
      authorizationVersion: await getAuthorizationVersion(identity.userId),
      activityProfile: profile, ...(inviteHash ? {inviteHash} : {}), codeVerifier,
      expiresAt: Date.now() + STATE_LIFETIME_MS};
    await db.collection("oauth_states").doc(hash(state)).create({...record,
      deleteAt: Timestamp.fromMillis(record.expiresAt + 60 * 60 * 1000)});
    const oauthClient = new google.auth.OAuth2(requiredSetting("GOOGLE_CLIENT_ID"), undefined, requiredSetting("GOOGLE_REDIRECT_URI"));
    res.status(200).json({authorizationUrl: oauthClient.generateAuthUrl({
      access_type: "offline", prompt: "consent", scope: ["openid", "email", ...ACTIVITY_SCOPES],
      state, code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: crypto.createHash("sha256").update(codeVerifier).digest("base64url"),
    })});
  } catch (error) {
    logSafeError("Could not start activity consent", error);
    res.status(400).json({error: "Activity connection could not start. Check the invitation or try again."});
  }
}

export async function handleBeginGoogleLink(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }
  try {
    const identity = await authenticatedIdentity(req);
    if (!identity) {
      res.status(401).json({error: "Valid Firebase ID token required"});
      return;
    }
    if (!identity.owner) {
      res.status(403).json({error: "Sign in with Google on the companion site to pair a TV"});
      return;
    }
    const userId = identity.userId;
    const code = req.body?.code;
    if (typeof code !== "string" || !/^[A-HJ-NP-Z2-9]{6}$/.test(code.toUpperCase())) {
      res.status(400).json({error: "Invalid TV code"});
      return;
    }
    if (!await recordPairingAttempt(userId)) {
      res.status(429).json({error: "Too many pairing attempts"});
      return;
    }
    const deviceCode = code.toUpperCase();
    const device = await getDeviceCode(deviceCode);
    if (!device || device.status !== "pending" || Date.now() > device.expiresAt) {
      res.status(410).json({error: "TV code expired or already used"});
      return;
    }

    const state = crypto.randomBytes(32).toString("base64url");
    const codeVerifier = crypto.randomBytes(48).toString("base64url");
    const codeChallenge = crypto.createHash("sha256")
      .update(codeVerifier).digest("base64url");
    const stateRecord: OAuthState = {
      userId,
      authTimeSeconds: identity.authTimeSeconds || 0,
      authorizationVersion: await getAuthorizationVersion(userId),
      deviceCode,
      kind: "device",
      codeVerifier,
      expiresAt: Date.now() + STATE_LIFETIME_MS,
    };
    await db.collection("oauth_states").doc(hash(state)).create({
      ...stateRecord, deleteAt: Timestamp.fromMillis(stateRecord.expiresAt + 60 * 60 * 1000),
    });

    const oauthClient = new google.auth.OAuth2(
      requiredSetting("GOOGLE_CLIENT_ID"),
      undefined,
      requiredSetting("GOOGLE_REDIRECT_URI")
    );
    const authorizationUrl = oauthClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: GOOGLE_SCOPES,
      state,
      code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: codeChallenge,
    });

    res.status(200).json({authorizationUrl});
  } catch (error) {
    logSafeError("Could not begin Google pairing", error);
    res.status(500).json({error: "Internal server error"});
  }
}

/** Incremental Photos consent for an already paired account. */
export const beginGooglePhotosHandler = onRequest(
  {cors: true, maxInstances: 10},
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }
    const identity = await authenticatedIdentity(req);
    if (!identity) {
      res.status(401).json({error: "Valid Firebase ID token required"});
      return;
    }
    const userId = identity.userId;
    try {
      if (!await recordUserQuota(userId, "photos_consent", 10, STATE_LIFETIME_MS)) {
        res.status(429).json({error: "Please wait before starting Google consent again"}); return;
      }
      const state = crypto.randomBytes(32).toString("base64url");
      const codeVerifier = crypto.randomBytes(48).toString("base64url");
      const codeChallenge = crypto.createHash("sha256")
        .update(codeVerifier).digest("base64url");
      await db.collection("oauth_states").doc(hash(state)).create({
        userId, kind: "photos", codeVerifier,
        authTimeSeconds: identity.authTimeSeconds || 0,
        authorizationVersion: await getAuthorizationVersion(userId),
        expiresAt: Date.now() + STATE_LIFETIME_MS,
        deleteAt: Timestamp.fromMillis(Date.now() + STATE_LIFETIME_MS + 60 * 60 * 1000),
      } satisfies OAuthState);
      const oauthClient = new google.auth.OAuth2(
        requiredSetting("GOOGLE_CLIENT_ID"), undefined,
        requiredSetting("GOOGLE_REDIRECT_URI")
      );
      const authorizationUrl = oauthClient.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["openid", "email", PHOTOS_SCOPE],
        state,
        code_challenge_method: CodeChallengeMethod.S256,
        code_challenge: codeChallenge,
      });
      res.status(200).json({authorizationUrl});
    } catch (error) {
      logSafeError("Could not start Photos consent", error);
      res.status(500).json({error: "Could not start Google Photos connection"});
    }
  }
);

/** Ask for meal Sheet access only when a signed-in person enables meals. */
export const beginGoogleMealsHandler = onRequest(
  {cors: true, maxInstances: 10},
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }
    const identity = await authenticatedIdentity(req);
    if (!identity) {
      res.status(401).json({error: "Valid Firebase ID token required"});
      return;
    }
    const userId = identity.userId;
    try {
      if (!await recordUserQuota(userId, "meals_consent", 10, STATE_LIFETIME_MS)) {
        res.status(429).json({error: "Please wait before starting Google consent again"}); return;
      }
      const state = crypto.randomBytes(32).toString("base64url");
      const codeVerifier = crypto.randomBytes(48).toString("base64url");
      const codeChallenge = crypto.createHash("sha256")
        .update(codeVerifier).digest("base64url");
      await db.collection("oauth_states").doc(hash(state)).create({
        userId, kind: "meals", codeVerifier,
        authTimeSeconds: identity.authTimeSeconds || 0,
        authorizationVersion: await getAuthorizationVersion(userId),
        expiresAt: Date.now() + STATE_LIFETIME_MS,
        deleteAt: Timestamp.fromMillis(Date.now() + STATE_LIFETIME_MS + 60 * 60 * 1000),
      } satisfies OAuthState);
      const oauthClient = new google.auth.OAuth2(
        requiredSetting("GOOGLE_CLIENT_ID"), undefined,
        requiredSetting("GOOGLE_REDIRECT_URI")
      );
      const authorizationUrl = oauthClient.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["openid", "email", MEALS_SCOPE],
        state,
        code_challenge_method: CodeChallengeMethod.S256,
        code_challenge: codeChallenge,
      });
      res.status(200).json({authorizationUrl});
    } catch (error) {
      logSafeError("Could not start meal Sheet consent", error);
      res.status(500).json({error: "Could not start meal Sheet connection"});
    }
  }
);

function photosResult(res: Response, message: string): void {
  const url = process.env.PAIRING_URL ? new URL("/dashboard", process.env.PAIRING_URL).toString() : "";
  const escaped = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  res.status(200).type("html").send(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Google Photos · HomeScreen</title><body style="font:20px system-ui;padding:2rem;background:#0f172a;color:white"><h1>HomeScreen</h1><p>${message}</p><p>Return to the companion site or your TV to choose photos.</p>${escaped ? `<a style="color:#bcead8" href="${escaped}">Return to dashboard studio</a>` : ""}</body></html>`);
}

export const googleOAuthCallbackHandler = onRequest(
  {
    maxInstances: 10,
    secrets: ["GOOGLE_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"],
  },
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    let flow: OAuthState["kind"] = "device";
    if (req.method !== "GET") {
      res.status(405).send("Method not allowed");
      return;
    }
    const state = req.query.state;
    if (typeof state !== "string" || !/^[A-Za-z0-9_-]{40,64}$/.test(state)) {
      res.redirect(303, pairingRedirect("error"));
      return;
    }

    try {
      const record = await consumeState(state);
      if (!record) {
        res.redirect(303, pairingRedirect("expired"));
        return;
      }
      flow = record.kind;
      if (!Number.isSafeInteger(record.authTimeSeconds) || record.authTimeSeconds <= 0) {
        throw new Error("Start a new Google connection from a signed-in session");
      }
      if (req.query.error) {
        if (record.kind === "photos") photosResult(res, "Google Photos access was cancelled.");
        else if (record.kind === "activity") res.redirect(303, pairingRedirect("activity_denied"));
        else if (record.kind === "meals") res.redirect(303, pairingRedirect("meals_denied"));
        else res.redirect(303, pairingRedirect("denied"));
        return;
      }
      const code = req.query.code;
      if (typeof code !== "string" || !code) {
        if (record.kind === "photos") photosResult(res, "Google Photos could not be connected.");
        else if (record.kind === "activity") res.redirect(303, pairingRedirect("activity_error"));
        else if (record.kind === "meals") res.redirect(303, pairingRedirect("meals_error"));
        else res.redirect(303, pairingRedirect("error"));
        return;
      }

      const clientId = requiredSetting("GOOGLE_CLIENT_ID");
      const redirectUri = requiredSetting("GOOGLE_REDIRECT_URI");
      const oauthClient = new google.auth.OAuth2(
        clientId,
        requiredSetting("GOOGLE_CLIENT_SECRET"),
        redirectUri
      );
      const {tokens} = await oauthClient.getToken({code, codeVerifier: record.codeVerifier});
      if (!tokens.access_token || !tokens.refresh_token || !tokens.id_token) {
        throw new Error("Google did not return required tokens");
      }

      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId,
      });
      const googleSubject = ticket.getPayload()?.sub;
      const firebaseUser = await auth.getUser(record.userId);
      if (firebaseUser.disabled || !googleSubject || !firebaseUser.providerData.some(
        (provider) => provider.providerId === "google.com" && provider.uid === googleSubject
      )) {
        throw new Error("Google account did not match the signed-in Firebase user");
      }

      if (record.kind === "photos") {
        if (!tokens.scope?.split(" ").includes(PHOTOS_SCOPE)) {
          throw new Error("Google Photos permission was not granted");
        }
        await savePhotosTokens(record.userId, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date ?? undefined,
          scope: tokens.scope,
        }, record.authorizationVersion, record.authTimeSeconds);
        photosResult(res, "Google Photos is connected.");
        return;
      }

      if (record.kind === "activity") {
        if (!record.activityProfile) throw new Error("Activity profile is missing.");
        await saveActivityConsent(record.userId, {accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token, expiryDate: tokens.expiry_date ?? undefined, scope: tokens.scope},
        record.authorizationVersion, record.authTimeSeconds, record.activityProfile, record.inviteHash);
        res.redirect(303, pairingRedirect("activity_connected")); return;
      }

      if (record.kind === "meals") {
        if (!tokens.scope?.split(" ").includes(MEALS_SCOPE)) {
          throw new Error("Google Sheets permission was not granted");
        }
        await saveMealSheetTokens(record.userId, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date ?? undefined,
          scope: tokens.scope,
        }, record.authorizationVersion, record.authTimeSeconds);
        res.redirect(303, pairingRedirect("meals_connected"));
        return;
      }

      if (!record.deviceCode) throw new Error("Missing TV pairing code");

      const deviceId = crypto.randomBytes(16).toString("hex");
      const customToken = await auth.createCustomToken(record.userId, {dashboardDeviceId: deviceId});
      const paired = await authorizeDeviceWithGoogleTokens(
        record.deviceCode,
        record.userId,
        customToken,
        {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date ?? undefined,
          scope: tokens.scope,
        },
        deviceId,
        record.authorizationVersion,
        record.authTimeSeconds
      );
      res.redirect(303, pairingRedirect(paired ? "connected" : "expired"));
    } catch (error) {
      logSafeError("Could not finish Google pairing", error);
      if (flow === "photos") photosResult(res, "Google Photos could not be connected. Please try again.");
      else if (flow === "activity") res.redirect(303, pairingRedirect("activity_error"));
      else if (flow === "meals") res.redirect(303, pairingRedirect("meals_error"));
      else res.redirect(303, pairingRedirect("error"));
    }
  }
);
