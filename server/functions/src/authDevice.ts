import { onRequest } from "firebase-functions/v2/https";
import * as crypto from "crypto";
import {
  saveDeviceCode,
  getDeviceCode,
  updateDeviceCode,
  auth,
  saveUserTokens,
} from "./utils/db";
import { DevicePairingCode } from "./types";

/**
 * Generate a friendly alphanumeric 6-character pairing code (e.g., "7K9M2W")
 */
function generatePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Omits confusing chars like 0, O, 1, I
  let code = "";
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

export const authDeviceHandler = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const action = req.query.action || req.body?.action;

    try {
      // 1. TV asks for a new pairing code
      if (action === "request-code" || req.method === "POST" && !action) {
        const code = generatePairingCode();
        const now = Date.now();
        const expiresAt = now + 15 * 60 * 1000; // 15 minutes validity

        const codeRecord: DevicePairingCode = {
          code,
          status: "pending",
          createdAt: now,
          expiresAt,
        };

        await saveDeviceCode(codeRecord);

        res.status(200).json({
          code,
          verificationUrl: process.env.PAIRING_URL || "https://dashboard-smart-tv.web.app/pair",
          expiresIn: 900,
        });
        return;
      }

      // 2. TV polls to check if user authorized the pairing code
      if (action === "poll") {
        const code = (req.query.code as string) || req.body?.code;
        if (!code) {
          res.status(400).json({ error: "Missing code parameter" });
          return;
        }

        const record = await getDeviceCode(code.toUpperCase());
        if (!record) {
          res.status(404).json({ error: "Invalid pairing code" });
          return;
        }

        if (Date.now() > record.expiresAt) {
          await updateDeviceCode(code.toUpperCase(), { status: "expired" });
          res.status(410).json({ status: "expired", message: "Pairing code has expired" });
          return;
        }

        res.status(200).json({
          status: record.status,
          userId: record.userId || null,
          customToken: record.customToken || null,
        });
        return;
      }

      // 3. User enters pairing code on mobile/browser to authorize their TV
      if (action === "authorize-code") {
        const { code, idToken, googleTokens, location } = req.body;
        if (!code) {
          res.status(400).json({ error: "Missing pairing code" });
          return;
        }

        const normalizedCode = (code as string).toUpperCase();
        const record = await getDeviceCode(normalizedCode);

        if (!record || record.status !== "pending") {
          res.status(400).json({ error: "Invalid or already used pairing code" });
          return;
        }

        if (Date.now() > record.expiresAt) {
          res.status(410).json({ error: "Pairing code expired" });
          return;
        }

        let userId: string;

        // Verify user authentication
        if (idToken) {
          const decoded = await auth.verifyIdToken(idToken);
          userId = decoded.uid;
        } else if (req.body.userId) {
          userId = req.body.userId;
        } else {
          res.status(401).json({ error: "Authentication required to link device" });
          return;
        }

        // Store Google OAuth credentials if provided during web login
        if (googleTokens) {
          await saveUserTokens(userId, {
            google: googleTokens,
            location: location,
          });
        }

        // Generate custom Firebase token for TV client
        const customToken = await auth.createCustomToken(userId);

        await updateDeviceCode(normalizedCode, {
          status: "authorized",
          userId,
          customToken,
        });

        res.status(200).json({ success: true, userId });
        return;
      }

      // 4. Update / link Google OAuth credentials directly
      if (action === "link-tokens") {
        const { userId, googleTokens, location, weatherCity } = req.body;
        if (!userId || !googleTokens) {
          res.status(400).json({ error: "Missing userId or googleTokens" });
          return;
        }

        await saveUserTokens(userId, {
          google: googleTokens,
          location,
          weatherCity,
        });

        res.status(200).json({ success: true });
        return;
      }

      res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (error) {
      console.error("Error in authDeviceHandler:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
);
