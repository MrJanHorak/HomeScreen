import { onRequest } from "firebase-functions/v2/https";
import { getStoredUserTokens, saveDashboardCache, auth } from "./utils/db";
import { fetchCalendarEvents } from "./services/googleCalendar";
import { fetchActiveTasks } from "./services/googleTasks";
import { fetchHealthData } from "./services/googleFit";
import { fetchLocalWeather } from "./services/weatherService";
import { DashboardSummaryResponse } from "./types";

export const getDashboardSummaryHandler = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      let userId = req.query.userId as string;

      // Extract userId from Firebase Auth Bearer token if provided
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1];
        try {
          const decoded = await auth.verifyIdToken(idToken);
          userId = decoded.uid;
        } catch {
          // If bearer verification fails, fallback to query param if present
        }
      }

      if (!userId) {
        res.status(400).json({ error: "Missing required userId or valid Authorization header" });
        return;
      }

      // 1. Fetch user credentials & preferences from Firestore
      const userTokens = await getStoredUserTokens(userId);

      // 2. Execute upstream requests in parallel with graceful error isolation
      const [calendarResult, tasksResult, healthResult, weatherResult] =
        await Promise.allSettled([
          fetchCalendarEvents(userTokens.google),
          fetchActiveTasks(userTokens.google),
          fetchHealthData(userTokens.google, {
            stepGoal: userTokens.stepGoal,
            distanceGoal: userTokens.distanceGoal,
          }),
          fetchLocalWeather(userTokens.location || userTokens.weatherCity),
        ]);

      // 3. Assemble response payload
      const responsePayload: DashboardSummaryResponse = {
        schedule:
          calendarResult.status === "fulfilled" ? calendarResult.value : [],
        tasks: tasksResult.status === "fulfilled" ? tasksResult.value : [],
        health:
          healthResult.status === "fulfilled"
            ? healthResult.value
            : {
              steps: 0,
              stepGoal: userTokens.stepGoal || 10000,
              distance: 0,
              distanceGoal: userTokens.distanceGoal || 8,
              calories: 0,
              activeMinutes: 0,
              progress: 0,
            },
        weather:
          weatherResult.status === "fulfilled"
            ? weatherResult.value
            : { temp: "--", condition: "Unknown" },
        updatedAt: new Date().toISOString(),
      };

      // 4. Save cache asynchronously in background for fast TV bootstrap
      saveDashboardCache(userId, responsePayload).catch((cacheErr) =>
        console.warn("Failed to update dashboard cache:", cacheErr)
      );

      res.status(200).json(responsePayload);
    } catch (error) {
      console.error("Error handling getDashboardSummary request:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
);
