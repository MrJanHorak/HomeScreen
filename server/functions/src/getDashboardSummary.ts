import {Response} from "express";
import {onRequest, Request} from "firebase-functions/v2/https";
import {getAuthorizationVersion, getDashboardCache, getStoredUserTokens, recordUserQuota, saveDashboardCache} from "./utils/db";
import { authenticatedUserId } from "./utils/requestAuth";
import {logSafeError} from "./utils/safeLog";
import {fetchUserDashboard} from "./services/dashboardSummary";
import {fetchLocalWeather} from "./services/weatherService";

export const getDashboardSummaryHandler = onRequest(
  {
    cors: true,
    maxInstances: 10,
    secrets: ["OPENWEATHER_API_KEY", "TOKEN_ENCRYPTION_KEY", "GOOGLE_CLIENT_SECRET"],
  },
  handleGetDashboardSummary
);

export async function handleGetDashboardSummary(req: Request, res: Response): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    if (req.method !== "GET") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({error: "Valid Firebase ID token required"});
      return;
    }
    res.set("Cache-Control", "private, no-store");

    const cached = await getDashboardCache(userId);
    if (cached && Date.now() - cached.cachedAtMs < 10 * 60 * 1000) {
      // Weather has its own TTL. Reusing the summary must not extend that TTL.
      const locations = cached.summary.savedLocations;
      const city = locations?.find((loc) => loc.isDefault)?.query || locations?.[0]?.query;
      const tokens = city ? undefined : await getStoredUserTokens(userId);
      const weather = await fetchLocalWeather(city || tokens?.location || tokens?.weatherCity);
      const usable = Number.isFinite(parseFloat(weather.temp));
      res.status(200).json({...cached.summary, weather: usable ? weather : cached.summary.weather});
      return;
    }

    if (!await recordUserQuota(userId, "dashboard_refresh", 6, 10 * 60 * 1000)) {
      res.status(429).json({error: "Please wait before refreshing the dashboard again"}); return;
    }
    const authorizationVersion = await getAuthorizationVersion(userId);
    const responsePayload = await fetchUserDashboard(userId, req.header("X-Time-Zone") || "UTC");

    // Finish the write before returning; post-response work can be terminated.
    try {
      await saveDashboardCache(userId, responsePayload, authorizationVersion);
    } catch {
      console.warn("Dashboard cache write failed");
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    logSafeError("Error handling getDashboardSummary request", error);
    res.status(500).json({error: "Internal server error"});
  }
}
