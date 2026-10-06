import { onRequest } from "firebase-functions/v2/https";
import {getAuthorizationVersion, recordUserQuota, saveDashboardCache} from "./utils/db";
import { authenticatedUserId } from "./utils/requestAuth";
import {logSafeError} from "./utils/safeLog";
import {DashboardSummaryResponse} from "./types";
import {fetchUserDashboard} from "./services/dashboardSummary";

/**
 * Sync and cache dashboard data in Firestore for a given user
 */
export async function syncUserDashboard(userId: string, timeZone = "UTC"): Promise<DashboardSummaryResponse> {
  const authorizationVersion = await getAuthorizationVersion(userId);
  const summary = await fetchUserDashboard(userId, timeZone);

  await saveDashboardCache(userId, summary, authorizationVersion);
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
