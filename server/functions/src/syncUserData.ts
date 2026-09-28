import { onRequest } from "firebase-functions/v2/https";
import { getStoredUserTokens, saveDashboardCache, auth } from "./utils/db";
import { fetchCalendarEvents } from "./services/googleCalendar";
import { fetchActiveTasks } from "./services/googleTasks";
import { fetchHealthData } from "./services/googleFit";
import { fetchLocalWeather } from "./services/weatherService";
import { DashboardSummaryResponse } from "./types";

/**
 * Sync and cache dashboard data in Firestore for a given user
 */
export async function syncUserDashboard(userId: string): Promise<DashboardSummaryResponse> {
  const userTokens = await getStoredUserTokens(userId);

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

  const summary: DashboardSummaryResponse = {
    schedule: calendarResult.status === "fulfilled" ? calendarResult.value : [],
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

  await saveDashboardCache(userId, summary);
  return summary;
}

export const syncUserDataHandler = onRequest(
  {
    cors: true,
    maxInstances: 5,
    secrets: ["OPENWEATHER_API_KEY"],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      let userId = req.body?.userId || (req.query.userId as string);

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1];
        try {
          const decoded = await auth.verifyIdToken(idToken);
          userId = decoded.uid;
        } catch {
          // Fallback to query/body
        }
      }

      if (!userId) {
        res.status(400).json({ error: "Missing userId parameter or valid Authorization header" });
        return;
      }

      const summary = await syncUserDashboard(userId);
      res.status(200).json({
        success: true,
        message: "User dashboard synchronized and cached successfully",
        data: summary,
      });
    } catch (error) {
      console.error("Error in syncUserDataHandler:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
);
