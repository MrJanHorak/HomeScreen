import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { StoredUserTokens, DashboardSummaryResponse, DevicePairingCode } from "../types";
import { decryptToken, encryptToken } from "./crypto";

if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();
export const auth = getAuth();

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

  return {
    google: {
      accessToken: google.accessToken ? decryptToken(google.accessToken) : undefined,
      refreshToken: google.refreshToken ? decryptToken(google.refreshToken) : undefined,
      idToken: google.idToken,
      expiryDate: google.expiryDate,
      scope: google.scope,
    },
    location: data.location,
    weatherCity: data.weatherCity || data.location?.city || "New York",
    savedLocations: data.savedLocations,
    stepGoal: data.stepGoal || 10000,
    distanceGoal: data.distanceGoal || 8,
  };
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
  try {
    await db
      .collection("users")
      .doc(userId)
      .collection("cache")
      .doc("dashboard")
      .set({
        ...summary,
        cachedAt: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    console.warn("Failed to save dashboard cache to Firestore:", err);
  }
}

/**
 * Fetch cached dashboard summary if available
 */
export async function getDashboardCache(
  userId: string
): Promise<DashboardSummaryResponse | null> {
  const cacheDoc = await db
    .collection("users")
    .doc(userId)
    .collection("cache")
    .doc("dashboard")
    .get();

  if (!cacheDoc.exists) return null;
  return cacheDoc.data() as DashboardSummaryResponse;
}

/**
 * Device code pairing persistence for TV authentication
 */
export async function saveDeviceCode(codeData: DevicePairingCode): Promise<void> {
  await db.collection("device_codes").doc(codeData.code).set(codeData);
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
    });
    return true;
  });
}
