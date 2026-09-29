import { onRequest } from "firebase-functions/v2/https";
import { getStoredUserTokens, saveUserTokens } from "./utils/db";
import { authenticatedUserId } from "./utils/requestAuth";
import { markTaskCompleted } from "./services/googleTasks";

export const executeActionHandler = onRequest(
  {
    cors: true,
    maxInstances: 10,
    secrets: ["TOKEN_ENCRYPTION_KEY", "GOOGLE_CLIENT_SECRET"],
  },
  async (req, res) => {
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
          if (!taskId) {
            res.status(400).json({ error: "Missing taskId in payload" });
            return;
          }

          const userTokens = await getStoredUserTokens(userId);
          await markTaskCompleted(userTokens.google, taskId, payload?.tasklistId);
          res.status(200).json({ success: true, message: `Task ${taskId} marked as completed` });
          return;
        }

        case "updatePreferences": {
          const { weatherCity, stepGoal, distanceGoal, location, savedLocations } = payload || {};
          await saveUserTokens(userId, {
            weatherCity,
            stepGoal,
            distanceGoal,
            location,
            savedLocations,
          });
          res.status(200).json({ success: true, message: "Preferences updated successfully" });
          return;
        }


        default:
          res.status(400).json({ error: `Unsupported action: ${action}` });
          return;
      }
    } catch (error) {
      console.error("Error executing action:", error);
      res.status(500).json({error: "Internal server error"});
    }
  }
);
