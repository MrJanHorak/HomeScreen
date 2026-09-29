import {onRequest} from "firebase-functions/v2/https";
import * as crypto from "crypto";
import {google} from "googleapis";
import {CodeChallengeMethod} from "google-auth-library";
import type {Response} from "express";
import {
  auth,
  authorizeDeviceWithGoogleTokens,
  db,
  getDeviceCode,
  recordPairingAttempt,
  savePhotosTokens,
} from "./utils/db";
import {authenticatedUserId} from "./utils/requestAuth";

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

interface OAuthState {
  userId: string;
  deviceCode?: string;
  kind?: "device" | "photos";
  codeVerifier: string;
  expiresAt: number;
}

function requiredSetting(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function pairingRedirect(result: "connected" | "denied" | "expired" | "error"): string {
  const url = new URL(requiredSetting("PAIRING_URL"));
  url.searchParams.set("result", result);
  return url.toString();
}

async function consumeState(state: string): Promise<OAuthState | null> {
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
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }
    try {
      const userId = await authenticatedUserId(req);
      if (!userId) {
        res.status(401).json({error: "Valid Firebase ID token required"});
        return;
      }
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
        deviceCode,
        kind: "device",
        codeVerifier,
        expiresAt: Date.now() + STATE_LIFETIME_MS,
      };
      await db.collection("oauth_states").doc(hash(state)).create(stateRecord);

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
      console.error("Could not begin Google pairing:", error);
      res.status(500).json({error: "Internal server error"});
    }
  }
);

/** Incremental Photos consent for an already paired account. */
export const beginGooglePhotosHandler = onRequest(
  {cors: true, maxInstances: 10},
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
    try {
      const state = crypto.randomBytes(32).toString("base64url");
      const codeVerifier = crypto.randomBytes(48).toString("base64url");
      const codeChallenge = crypto.createHash("sha256")
        .update(codeVerifier).digest("base64url");
      await db.collection("oauth_states").doc(hash(state)).create({
        userId, kind: "photos", codeVerifier,
        expiresAt: Date.now() + STATE_LIFETIME_MS,
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
      console.error("Could not start Photos consent:", error);
      res.status(500).json({error: "Could not start Google Photos connection"});
    }
  }
);

function photosResult(res: Response, message: string): void {
  res.status(200).type("html").send(`<!doctype html><html><meta name="viewport" content="width=device-width"><body style="font:20px system-ui;padding:2rem;background:#0f172a;color:white"><h1>HomeScreen</h1><p>${message}</p><p>You can return to your TV.</p></body></html>`);
}

export const googleOAuthCallbackHandler = onRequest(
  {
    maxInstances: 10,
    secrets: ["GOOGLE_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"],
  },
  async (req, res) => {
    let photosFlow = false;
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
      photosFlow = record.kind === "photos";
      if (req.query.error) {
        if (record.kind === "photos") photosResult(res, "Google Photos access was cancelled.");
        else res.redirect(303, pairingRedirect("denied"));
        return;
      }
      const code = req.query.code;
      if (typeof code !== "string" || !code) {
        if (record.kind === "photos") photosResult(res, "Google Photos could not be connected.");
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
      if (!googleSubject || !firebaseUser.providerData.some(
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
        });
        photosResult(res, "Google Photos is connected.");
        return;
      }

      if (!record.deviceCode) throw new Error("Missing TV pairing code");

      const customToken = await auth.createCustomToken(record.userId);
      const paired = await authorizeDeviceWithGoogleTokens(
        record.deviceCode,
        record.userId,
        customToken,
        {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date ?? undefined,
          scope: tokens.scope,
        }
      );
      res.redirect(303, pairingRedirect(paired ? "connected" : "expired"));
    } catch (error) {
      console.error("Could not finish Google pairing:", error);
      if (photosFlow) photosResult(res, "Google Photos could not be connected. Please try again.");
      else res.redirect(303, pairingRedirect("error"));
    }
  }
);
