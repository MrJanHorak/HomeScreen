import {onRequest} from "firebase-functions/v2/https";
import {authenticatedUserId} from "./utils/requestAuth";
import {clearMealSheetConnection, getStoredUserTokens, invalidateDashboardCache,
  saveMealSheetSelection} from "./utils/db";
import {readMealSheet, spreadsheetIdFromUrl} from "./services/mealSheet";
import {logSafeError} from "./utils/safeLog";

export const mealSheetConfigHandler = onRequest(
  {cors: true, maxInstances: 10,
    secrets: ["GOOGLE_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"]},
  async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({error: "Valid Firebase ID token required"});
      return;
    }
    try {
      const connection = (await getStoredUserTokens(userId)).mealSheet;
      if (req.method === "GET") {
        res.status(200).json({
          authorized: Boolean(connection?.refreshToken),
          spreadsheetId: connection?.spreadsheetId || null,
          spreadsheetTitle: connection?.spreadsheetTitle || null,
        });
        return;
      }
      if (req.method === "DELETE") {
        if (connection) await clearMealSheetConnection(userId);
        await invalidateDashboardCache(userId);
        res.status(200).json({success: true});
        return;
      }
      if (req.method !== "PUT") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }
      if (!connection?.refreshToken) {
        res.status(409).json({error: "Allow Google Sheets access first"});
        return;
      }
      const spreadsheetId = typeof req.body?.url === "string" ?
        spreadsheetIdFromUrl(req.body.url) : null;
      if (!spreadsheetId) {
        res.status(400).json({error: "Paste a Google Sheets link"});
        return;
      }
      try {
        const result = await readMealSheet(connection, spreadsheetId);
        if (!result.foundHeader) {
          res.status(422).json({error: "The Sheet needs a Date column and a Main or Meal column."});
          return;
        }
        await saveMealSheetSelection(userId, spreadsheetId, result.title);
        await invalidateDashboardCache(userId);
        res.status(200).json({success: true, spreadsheetTitle: result.title,
          mealCount: result.items.length});
      } catch (error) {
        logSafeError("Meal Sheet selection failed", error);
        res.status(400).json({error: "Could not open that Sheet. Check the link and Google account."});
      }
    } catch (error) {
      logSafeError("Meal Sheet configuration failed", error);
      res.status(500).json({error: "Could not update meal Sheet connection"});
    }
  }
);
