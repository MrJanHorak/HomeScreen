import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {db, invalidateDashboardCache} from "./utils/db";
import {authenticatedIdentity} from "./utils/requestAuth";
import {parsePreferences} from "./utils/validation";
import {logSafeError} from "./utils/safeLog";

/** Read only public preferences; never return stored OAuth credentials. */
export async function handleUserPreferences(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send(""); return;
  }
  if (!["GET", "PUT"].includes(req.method)) {
    res.status(405).json({error: "Method not allowed"}); return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Valid Firebase ID token required"}); return;
  }
  const ref = db.collection("users").doc(identity.userId);
  try {
    if (req.method === "GET") {
      const data = (await ref.get()).data() || {};
      const saved = data.savedLocations?.length ? data.savedLocations : [{
        id: "loc-default", name: data.weatherCity || data.location?.city || "New York",
        query: data.weatherCity || data.location?.city || "New York, US", isDefault: true,
      }];
      const defaultIndex = Math.max(0, saved.findIndex((loc: {isDefault?: boolean}) => loc.isDefault));
      const locations = saved.map((loc: Record<string, unknown>, index: number) => ({...loc, isDefault: index === defaultIndex}));
      const activeId = locations.some((loc: {id: string}) => loc.id === data.activeLocationId) ? data.activeLocationId : locations[defaultIndex].id;
      res.status(200).json({preferences: {
        savedLocations: locations,
        activeLocationId: activeId,
        stepGoal: data.stepGoal || 10000, distanceGoal: data.distanceGoal || 8,
      }, updatedAtMs: data.preferencesUpdatedAtMs || 0, hasSavedLocations: Boolean(data.savedLocations?.length)});
      return;
    }
    const value = req.body?.preferences;
    const parsed = parsePreferences(value);
    const expected = req.body?.expectedUpdatedAtMs;
    if (!parsed || !Array.isArray(parsed.savedLocations) ||
      !Number.isSafeInteger(expected) || expected < 0 ||
      parsed.savedLocations.filter((loc) => loc.isDefault).length !== 1 ||
      !parsed.savedLocations.some((loc) => loc.id === parsed.activeLocationId)) {
      res.status(400).json({error: "Choose one default city and a saved active city"}); return;
    }
    const result = await db.runTransaction(async (transaction) => {
      const data = (await transaction.get(ref)).data() || {};
      if ((data.preferencesUpdatedAtMs || 0) !== expected) return null;
      const updatedAtMs = Math.max(Date.now(), expected + 1);
      const weatherCity = parsed.savedLocations!.find((loc) => loc.isDefault)!.query;
      const update = {...parsed, weatherCity,
        // A legacy coordinate preference must not override the newly chosen city.
        location: {city: weatherCity, units: data.location?.units || "metric"},
        preferencesUpdatedAtMs: updatedAtMs};
      transaction.set(ref, update, {mergeFields: Object.keys(update)});
      return updatedAtMs;
    });
    if (result === null) {
      res.status(409).json({error: "Settings changed on another device. Reload settings before saving again."}); return;
    }
    await invalidateDashboardCache(identity.userId);
    res.status(200).json({updatedAtMs: result});
  } catch (error) {
    logSafeError("Could not update preferences", error);
    res.status(500).json({error: "Could not update TV settings"});
  }
}

export const userPreferencesHandler = onRequest({cors: true, maxInstances: 10}, handleUserPreferences);
