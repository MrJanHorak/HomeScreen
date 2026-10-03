import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as crypto from "crypto";
import { StoredUserTokens, DashboardSummaryResponse, DevicePairingCode, GoogleTokens } from "../types";
import { decryptToken, encryptToken } from "./crypto";

if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();
export const auth = getAuth();

/** Photos Picker consent is stored separately from Calendar, Tasks, and Fit consent. */
export async function getStoredPhotosTokens(userId: string): Promise<GoogleTokens | null> {
  const snapshot = await db.collection("users").doc(userId).get();
  const stored = snapshot.data()?.googlePhotos;
  if (!stored?.refreshToken) return null;
  return {
    accessToken: stored.accessToken ? decryptToken(stored.accessToken) : undefined,
    refreshToken: decryptToken(stored.refreshToken),
    expiryDate: stored.expiryDate,
    scope: stored.scope,
  };
}

export async function savePhotosTokens(userId: string, tokens: GoogleTokens): Promise<void> {
  await db.collection("users").doc(userId).set({
    googlePhotos: {
      accessToken: tokens.accessToken ? encryptToken(tokens.accessToken) : null,
      refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      expiryDate: tokens.expiryDate ?? null,
      scope: tokens.scope ?? null,
    },
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
}

/**
 * Retrieve user OAuth tokens and configuration from Firestore
 */
export async function getStoredUserTokens(userId: string): Promise<StoredUserTokens> {
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    return {
      google: {},
      weatherCity: "New York",
      stepGoal: 10000,
      distanceGoal: 8,
    };
  }

  const data = userDoc.data() || {};
  const google = data.google || {};
  const mealSheet = data.mealSheet;

  return {
    google: {
      accessToken: google.accessToken ? decryptToken(google.accessToken) : undefined,
      refreshToken: google.refreshToken ? decryptToken(google.refreshToken) : undefined,
      idToken: google.idToken,
      expiryDate: google.expiryDate,
      scope: google.scope,
    },
    mealSheet: mealSheet ? {
      accessToken: mealSheet.accessToken ? decryptToken(mealSheet.accessToken) : undefined,
      refreshToken: mealSheet.refreshToken ? decryptToken(mealSheet.refreshToken) : undefined,
      expiryDate: mealSheet.expiryDate,
      scope: mealSheet.scope,
      spreadsheetId: mealSheet.spreadsheetId,
      spreadsheetTitle: mealSheet.spreadsheetTitle,
    } : undefined,
    location: data.location,
    weatherCity: data.weatherCity || data.location?.city || "New York",
    savedLocations: data.savedLocations,
    stepGoal: data.stepGoal || 10000,
    distanceGoal: data.distanceGoal || 8,
  };
}

/** Keep optional meal consent separate from the TV's other Google grants. */
export async function saveMealSheetTokens(userId: string, tokens: GoogleTokens): Promise<void> {
  await db.collection("users").doc(userId).set({
    mealSheet: {
      accessToken: tokens.accessToken ? encryptToken(tokens.accessToken) : null,
      refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      expiryDate: tokens.expiryDate ?? null,
      scope: tokens.scope ?? null,
    },
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
}

export async function saveMealSheetSelection(
  userId: string, spreadsheetId: string, spreadsheetTitle: string
): Promise<void> {
  await db.collection("users").doc(userId).set({
    mealSheet: {spreadsheetId, spreadsheetTitle},
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
}

export async function clearMealSheetConnection(userId: string): Promise<void> {
  await db.collection("users").doc(userId).update({
    mealSheet: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Persist or update user OAuth tokens and preferences with encryption
 */
export async function saveUserTokens(
  userId: string,
  tokens: Partial<StoredUserTokens>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (tokens.google) {
    updateData.google = {
      ...tokens.google,
      ...(tokens.google.accessToken ? { accessToken: encryptToken(tokens.google.accessToken) } : {}),
      ...(tokens.google.refreshToken ? { refreshToken: encryptToken(tokens.google.refreshToken) } : {}),
    };
  }

  if (tokens.location !== undefined) {
    updateData.location = tokens.location;
  }
  if (tokens.weatherCity !== undefined) {
    updateData.weatherCity = tokens.weatherCity;
  }
  if (tokens.savedLocations !== undefined) {
    updateData.savedLocations = tokens.savedLocations;
  }
  if (tokens.stepGoal !== undefined) {
    updateData.stepGoal = tokens.stepGoal;
  }
  if (tokens.distanceGoal !== undefined) {
    updateData.distanceGoal = tokens.distanceGoal;
  }

  await db.collection("users").doc(userId).set(updateData, { merge: true });
}


/**
 * Cache computed dashboard summary for high-performance retrieval and offline resilience
 */
export async function saveDashboardCache(
  userId: string,
  summary: DashboardSummaryResponse
): Promise<void> {
  if (Buffer.byteLength(JSON.stringify(summary), "utf8") > 750_000) {
    throw new Error("Dashboard summary exceeds cache size limit");
  }
  await db
    .collection("users")
    .doc(userId)
    .collection("cache")
    .doc("dashboard")
    .set({
      ...summary,
      cachedAtMs: Date.now(),
      deleteAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
}

/**
 * Fetch cached dashboard summary if available
 */
export async function getDashboardCache(
  userId: string
): Promise<{summary: DashboardSummaryResponse; cachedAtMs: number} | null> {
  const cacheDoc = await db
    .collection("users")
    .doc(userId)
    .collection("cache")
    .doc("dashboard")
    .get();

  if (!cacheDoc.exists) return null;
  const data = cacheDoc.data() as DashboardSummaryResponse & {
    cachedAtMs?: number; cachedAt?: unknown; deleteAt?: Timestamp;
  };
  const summary = {...data};
  delete summary.cachedAtMs;
  delete summary.cachedAt;
  delete summary.deleteAt;
  return {summary, cachedAtMs: data.cachedAtMs || 0};
}

export async function invalidateDashboardCache(userId: string): Promise<void> {
  await db.collection("users").doc(userId).collection("cache").doc("dashboard").delete();
}

/**
 * Device code pairing persistence for TV authentication
 */
export async function saveDeviceCode(codeData: DevicePairingCode): Promise<void> {
  await db.collection("device_codes").doc(codeData.code).create({
    ...codeData,
    deleteAt: Timestamp.fromMillis(codeData.expiresAt + 60 * 60 * 1000),
  });
}

export async function getDeviceCode(code: string): Promise<DevicePairingCode | null> {
  const doc = await db.collection("device_codes").doc(code).get();
  if (!doc.exists) return null;
  return doc.data() as DevicePairingCode;
}

export async function updateDeviceCode(
  code: string,
  updates: Partial<DevicePairingCode>
): Promise<void> {
  await db.collection("device_codes").doc(code).update(updates);
}

export async function consumeDeviceToken(code: string, pollSecretHash: string): Promise<{
  status: "pending" | "authorized" | "expired";
  customToken?: string;
} | null> {
  const ref = db.collection("device_codes").doc(code);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const record = snapshot.data() as DevicePairingCode;
    if (record.pollSecretHash !== pollSecretHash) return null;
    if (Date.now() > record.expiresAt) {
      transaction.update(ref, {status: "expired", customToken: FieldValue.delete()});
      return {status: "expired"};
    }
    if (record.status === "authorized" && record.customToken) {
      transaction.update(ref, {customToken: FieldValue.delete()});
      return {status: "authorized", customToken: decryptToken(record.customToken)};
    }
    return {status: record.status};
  });
}

/** Link a Google account and release the TV token only while its code is pending. */
export async function authorizeDeviceWithGoogleTokens(
  code: string,
  userId: string,
  customToken: string,
  googleTokens: StoredUserTokens["google"]
): Promise<boolean> {
  const codeRef = db.collection("device_codes").doc(code);
  const userRef = db.collection("users").doc(userId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(codeRef);
    if (!snapshot.exists) return false;
    const record = snapshot.data() as DevicePairingCode;
    if (record.status !== "pending" || Date.now() > record.expiresAt) return false;

    transaction.set(userRef, {
      google: {
        accessToken: encryptToken(googleTokens.accessToken || ""),
        refreshToken: encryptToken(googleTokens.refreshToken || ""),
        expiryDate: googleTokens.expiryDate,
        scope: googleTokens.scope,
      },
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    transaction.update(codeRef, {
      status: "authorized",
      userId,
      customToken: encryptToken(customToken),
    });
    transaction.delete(userRef.collection("cache").doc("dashboard"));
    return true;
  });
}

/** Limit guesses of the short TV code per signed-in account. */
export async function recordPairingAttempt(userId: string): Promise<boolean> {
  const ref = db.collection("pair_attempts").doc(userId);
  const now = Date.now();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    const inWindow = typeof data?.expiresAt === "number" && data.expiresAt > now;
    const count = inWindow ? Number(data?.count || 0) : 0;
    if (count >= 10) return false;
    transaction.set(ref, {
      count: count + 1,
      expiresAt: inWindow ? data?.expiresAt : now + 15 * 60 * 1000,
      deleteAt: Timestamp.fromMillis((inWindow ? data?.expiresAt : now + 15 * 60 * 1000) + 60 * 60 * 1000),
    });
    return true;
  });
}

/** Best-effort per-IP limit for the unauthenticated code issuance endpoint. */
export async function recordCodeRequest(address: string): Promise<boolean> {
  const id = crypto.createHash("sha256").update(address).digest("hex");
  const ref = db.collection("code_request_limits").doc(id);
  const now = Date.now();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    const inWindow = typeof data?.expiresAt === "number" && data.expiresAt > now;
    const count = inWindow ? Number(data?.count || 0) : 0;
    if (count >= 60) return false;
    const expiresAt = inWindow ? data?.expiresAt : now + 15 * 60 * 1000;
    transaction.set(ref, {count: count + 1, expiresAt,
      deleteAt: Timestamp.fromMillis(expiresAt + 60 * 60 * 1000)});
    return true;
  });
}

export async function recordUserQuota(
  userId: string, resource: string, limit: number, windowMs: number
): Promise<boolean> {
  const ref = db.collection("user_request_limits").doc(`${userId}_${resource}`);
  const now = Date.now();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    const inWindow = typeof data?.expiresAt === "number" && data.expiresAt > now;
    const count = inWindow ? Number(data?.count || 0) : 0;
    if (count >= limit) return false;
    const expiresAt = inWindow ? data?.expiresAt : now + windowMs;
    transaction.set(ref, {count: count + 1, expiresAt,
      deleteAt: Timestamp.fromMillis(expiresAt + 60 * 60 * 1000)});
    return true;
  });
}
