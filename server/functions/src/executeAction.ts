import { onRequest } from "firebase-functions/v2/https";
import { getStoredUserTokens, invalidateDashboardCache, recordUserQuota, saveUserTokens } from "./utils/db";
import { authenticatedUserId } from "./utils/requestAuth";
import {parsePreferences} from "./utils/validation";
import {logSafeError} from "./utils/safeLog";
import { markTaskCompleted } from "./services/googleTasks";

export const executeActionHandler = onRequest(
  {
    cors: true,
    maxInstances: 10,
    secrets: ["TOKEN_ENCRYPTION_KEY", "GOOGLE_CLIENT_SECRET"],
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

      const { action, payload } = req.body || {};

      switch (action) {
        case "completeTask": {
          const taskId = payload?.taskId;
          if (typeof taskId !== "string" || !taskId || taskId.length > 256 ||
            (payload?.tasklistId !== undefined &&
              (typeof payload.tasklistId !== "string" || payload.tasklistId.length > 256))) {
            res.status(400).json({ error: "Invalid task in payload" });
            return;
          }

          const userTokens = await getStoredUserTokens(userId);
          if (!await recordUserQuota(userId, "task_action", 60, 10 * 60 * 1000)) {
            res.status(429).json({error: "Too many task actions"}); return;
          }
          await markTaskCompleted(userTokens.google, taskId, payload?.tasklistId);
          await invalidateDashboardCache(userId);
          res.status(200).json({ success: true, message: `Task ${taskId} marked as completed` });
          return;
        }

        case "updatePreferences": {
          const preferences = parsePreferences(payload);
          if (!preferences) {
            res.status(400).json({error: "Invalid preferences"});
            return;
          }
          await saveUserTokens(userId, preferences);
          await invalidateDashboardCache(userId);
          res.status(200).json({ success: true, message: "Preferences updated successfully" });
          return;
        }


        default:
          res.status(400).json({ error: `Unsupported action: ${action}` });
          return;
      }
    } catch (error) {
      logSafeError("Error executing action", error);
      res.status(500).json({error: "Internal server error"});
    }
  }
);
