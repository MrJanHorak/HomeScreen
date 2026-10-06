import { onRequest } from "firebase-functions/v2/https";
import * as crypto from "crypto";
import {
  saveDeviceCode,
  consumeDeviceToken,
  recordCodeRequest,
} from "./utils/db";
import { DevicePairingCode } from "./types";
import {logSafeError} from "./utils/safeLog";

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
    secrets: ["TOKEN_ENCRYPTION_KEY"],
  },
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const action = req.query.action || req.body?.action;

    try {
      // 1. TV asks for a new pairing code
      if (action === "request-code" && req.method === "POST") {
        if (!process.env.PAIRING_URL) throw new Error("PAIRING_URL is not configured");
        if (!await recordCodeRequest(req.ip || "unknown")) {
          res.status(429).json({error: "Too many pairing code requests"});
          return;
        }
        const pollSecret = crypto.randomBytes(32).toString("hex");
        const now = Date.now();
        const expiresAt = now + 15 * 60 * 1000; // 15 minutes validity
        let code = "";
        for (let attempt = 0; attempt < 5; attempt++) {
          code = generatePairingCode();
          const codeRecord: DevicePairingCode = {
            code, status: "pending", createdAt: now, expiresAt,
            pollSecretHash: crypto.createHash("sha256").update(pollSecret).digest("hex"),
          };
          try {
            await saveDeviceCode(codeRecord);
            break;
          } catch (error) {
            if ((error as {code?: number}).code !== 6 || attempt === 4) throw error;
          }
        }

        res.status(200).json({
          code,
          pollSecret,
          verificationUrl: process.env.PAIRING_URL,
          expiresIn: 900,
        });
        return;
      }

      // 2. TV polls to check if user authorized the pairing code
      if (action === "poll" && req.method === "POST") {
        const {code, pollSecret} = req.body || {};
        if (typeof code !== "string" || typeof pollSecret !== "string" ||
            !/^[A-HJ-NP-Z2-9]{6}$/.test(code.toUpperCase()) ||
            !/^[0-9a-f]{64}$/.test(pollSecret)) {
          res.status(400).json({error: "Invalid pairing request"});
          return;
        }
        if (!await recordCodeRequest(req.ip || "unknown", "poll", 600, 60_000)) {
          res.status(429).json({error: "Too many pairing polls"}); return;
        }

        const result = await consumeDeviceToken(
          code.toUpperCase(),
          crypto.createHash("sha256").update(pollSecret).digest("hex")
        );
        if (!result) {
          res.status(404).json({error: "Invalid pairing request"});
          return;
        }

        if (result.status === "expired") {
          res.status(410).json({ status: "expired", message: "Pairing code has expired" });
          return;
        }

        res.status(200).json({
          status: result.status,
          customToken: result.customToken || null,
        });
        return;
      }

      res.status(400).json({error: "Unknown action or method"});
    } catch (error) {
      logSafeError("Error in authDeviceHandler", error);
      res.status(500).json({error: "Internal server error"});
    }
  }
);
