import { onRequest } from "firebase-functions/v2/https";
import { getStoredUserTokens, saveUserTokens, auth } from "./utils/db";
import { markTaskCompleted } from "./services/googleTasks";

export const executeActionHandler = onRequest(
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
      let userId = req.body?.userId;

      // Extract userId from Firebase Auth Bearer token if provided
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1];
        try {
          const decoded = await auth.verifyIdToken(idToken);
          userId = decoded.uid;
        } catch {
          // Fallback to body userId if token verification is not matching
        }
      }

      if (!userId) {
        res.status(401).json({ error: "Unauthorized: Missing userId or auth token" });
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
          const { weatherCity, stepGoal, distanceGoal, location } = payload || {};
          await saveUserTokens(userId, {
            weatherCity,
            stepGoal,
            distanceGoal,
            location,
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
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
);
