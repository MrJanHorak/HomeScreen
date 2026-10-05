import {Response} from "express";
import {onRequest, Request} from "firebase-functions/v2/https";
import {getDashboardCache, saveDashboardCache} from "./utils/db";
import { authenticatedUserId } from "./utils/requestAuth";
import {logSafeError} from "./utils/safeLog";
import {fetchUserDashboard} from "./services/dashboardSummary";

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
      res.status(200).json(cached.summary);
      return;
    }

    const responsePayload = await fetchUserDashboard(userId, req.header("X-Time-Zone") || "UTC");

    // Finish the write before returning; post-response work can be terminated.
    try {
      await saveDashboardCache(userId, responsePayload);
    } catch {
      console.warn("Dashboard cache write failed");
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    logSafeError("Error handling getDashboardSummary request", error);
    res.status(500).json({error: "Internal server error"});
  }
}
