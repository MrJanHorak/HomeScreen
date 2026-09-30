import { onRequest } from "firebase-functions/v2/https";
import { getStoredUserTokens, saveDashboardCache } from "./utils/db";
import { authenticatedUserId } from "./utils/requestAuth";
import { fetchCalendarEvents } from "./services/googleCalendar";
import { fetchActiveTasks } from "./services/googleTasks";
import { fetchHealthData } from "./services/googleFit";
import { fetchLocalWeather } from "./services/weatherService";
import { fetchMealPlan } from "./services/mealSheet";
import { DashboardSummaryResponse } from "./types";

export const getDashboardSummaryHandler = onRequest(
  {
    cors: true,
    maxInstances: 10,
    secrets: ["OPENWEATHER_API_KEY", "TOKEN_ENCRYPTION_KEY", "GOOGLE_CLIENT_SECRET"],
  },
  async (req, res) => {
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

      // 1. Fetch user credentials & preferences from Firestore
      const userTokens = await getStoredUserTokens(userId);

      // 2. Execute upstream requests in parallel with graceful error isolation
      const [calendarResult, tasksResult, healthResult, weatherResult, mealsResult] =
        await Promise.allSettled([
          fetchCalendarEvents(userTokens.google),
          fetchActiveTasks(userTokens.google),
          fetchHealthData(userTokens.google, {
            stepGoal: userTokens.stepGoal,
            distanceGoal: userTokens.distanceGoal,
          }, req.header("X-Time-Zone") || "UTC"),
          fetchLocalWeather(userTokens.location || userTokens.weatherCity),
          fetchMealPlan(userTokens.mealSheet),
        ]);

      // 3. Assemble response payload
      const responsePayload: DashboardSummaryResponse = {
        schedule:
          calendarResult.status === "fulfilled" ? calendarResult.value : [],
        meals: mealsResult.status === "fulfilled" ? mealsResult.value :
          {status: "unavailable", items: [], message: "Meal plan is unavailable."},
        tasks: tasksResult.status === "fulfilled" ? tasksResult.value : [],
        health:
          healthResult.status === "fulfilled"
            ? healthResult.value
            : {
              status: "unavailable",
              message: "Google Fit activity is unavailable right now. Try refreshing later.",
              steps: 0,
              stepGoal: userTokens.stepGoal || 10000,
              distance: 0,
              distanceGoal: userTokens.distanceGoal || 8,
              calories: 0,
              activeMinutes: null,
              progress: 0,
              weekly: [],
            },
        weather:
          weatherResult.status === "fulfilled"
            ? weatherResult.value
            : { temp: "--", condition: "Unknown" },
        savedLocations: userTokens.savedLocations,
        updatedAt: new Date().toISOString(),
      };


      // 4. Save cache asynchronously in background for fast TV bootstrap
      saveDashboardCache(userId, responsePayload).catch((cacheErr) =>
        console.warn("Failed to update dashboard cache:", cacheErr)
      );

      res.status(200).json(responsePayload);
    } catch (error) {
      console.error("Error handling getDashboardSummary request:", error);
      res.status(500).json({error: "Internal server error"});
    }
  }
);
