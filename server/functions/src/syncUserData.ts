import { onRequest } from "firebase-functions/v2/https";
import {getStoredUserTokens, recordUserQuota, saveDashboardCache} from "./utils/db";
import { authenticatedUserId } from "./utils/requestAuth";
import {boundSummary} from "./utils/summary";
import {logSafeError} from "./utils/safeLog";
import { fetchCalendarEvents } from "./services/googleCalendar";
import { fetchActiveTasks } from "./services/googleTasks";
import { fetchHealthData } from "./services/googleFit";
import { fetchLocalWeather } from "./services/weatherService";
import { fetchMealPlan } from "./services/mealSheet";
import { DashboardSummaryResponse } from "./types";

/**
 * Sync and cache dashboard data in Firestore for a given user
 */
export async function syncUserDashboard(userId: string, timeZone = "UTC"): Promise<DashboardSummaryResponse> {
  const userTokens = await getStoredUserTokens(userId);

  const [calendarResult, tasksResult, healthResult, weatherResult, mealsResult] =
    await Promise.allSettled([
      fetchCalendarEvents(userTokens.google),
      fetchActiveTasks(userTokens.google),
      fetchHealthData(userTokens.google, {
        stepGoal: userTokens.stepGoal,
        distanceGoal: userTokens.distanceGoal,
      }, timeZone),
      fetchLocalWeather(userTokens.location || userTokens.weatherCity),
      fetchMealPlan(userTokens.mealSheet),
    ]);

  const summary: DashboardSummaryResponse = boundSummary({
    schedule: calendarResult.status === "fulfilled" ? calendarResult.value.today : [],
    upcomingEvents: calendarResult.status === "fulfilled" ? calendarResult.value.upcoming : [],
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
  });

  await saveDashboardCache(userId, summary);
  return summary;
}

export const syncUserDataHandler = onRequest(
  {
    cors: true,
    maxInstances: 5,
    secrets: ["OPENWEATHER_API_KEY", "TOKEN_ENCRYPTION_KEY", "GOOGLE_CLIENT_SECRET"],
  },
  async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }
      const userId = await authenticatedUserId(req);
      if (!userId) {
        res.status(401).json({error: "Valid Firebase ID token required"});
        return;
      }
      if (!await recordUserQuota(userId, "sync", 2, 10 * 60 * 1000)) {
        res.status(429).json({error: "Please wait before synchronizing again"});
        return;
      }

      const summary = await syncUserDashboard(userId, req.header("X-Time-Zone") || "UTC");
      res.status(200).json({
        success: true,
        message: "User dashboard synchronized and cached successfully",
        data: summary,
      });
    } catch (error) {
      logSafeError("Error in syncUserDataHandler", error);
      res.status(500).json({error: "Internal server error"});
    }
  }
);
