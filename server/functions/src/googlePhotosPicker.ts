import {onRequest} from "firebase-functions/v2/https";
import {FieldValue} from "firebase-admin/firestore";
import {db, getStoredPhotosTokens} from "./utils/db";
import {authenticatedUserId} from "./utils/requestAuth";
import {getOAuth2Client} from "./services/googleAuth";
import {GoogleTokens} from "./types";

const API = "https://photospicker.googleapis.com/v1";
const SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const MAX_IMAGE_BYTES = 550_000; // Base64 stays well below Firestore's 1 MiB document limit.

interface PickingSession {
  id: string;
  pickerUri: string;
  expireTime?: string;
  mediaItemsSet?: boolean;
  pollingConfig?: {pollInterval?: string; timeoutIn?: string};
}

interface PickedMediaItem {
  type: string;
  mediaFile?: {baseUrl?: string; mimeType?: string};
}

async function accessToken(tokens: GoogleTokens): Promise<string> {
  const token = (await getOAuth2Client(tokens).getAccessToken()).token;
  if (!token) throw new Error("Google Photos token is unavailable");
  return token;
}

async function apiRequest<T>(token: string, path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? {"Content-Type": "application/json"} : {}),
    },
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  if (!response.ok) throw new Error(`Google Photos Picker returned ${response.status}`);
  return response.status === 204 ? undefined as T : await response.json() as T;
}

function pollMs(session: PickingSession): number {
  const seconds = Number.parseFloat(session.pollingConfig?.pollInterval || "3s");
  return Number.isFinite(seconds) ? Math.max(1500, Math.min(15000, seconds * 1000)) : 3000;
}

async function downloadPhoto(token: string, item: PickedMediaItem): Promise<string> {
  if (item.type !== "PHOTO" || !item.mediaFile?.baseUrl ||
    !item.mediaFile.mimeType?.startsWith("image/")) {
    throw new Error("Choose a photo rather than a video");
  }
  const baseUrl = new URL(item.mediaFile.baseUrl);
  if (baseUrl.protocol !== "https:" || !baseUrl.hostname.endsWith(".googleusercontent.com")) {
    throw new Error("Google Photos returned an unexpected image URL");
  }
  for (const [width, height] of [[1280, 720], [960, 540], [720, 405]]) {
    const response = await fetch(`${baseUrl.toString()}=w${width}-h${height}`, {
      headers: {Authorization: `Bearer ${token}`},
    });
    if (!response.ok) throw new Error(`Could not download selected photo (${response.status})`);
    const mime = response.headers.get("content-type")?.split(";")[0] || "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      throw new Error("This photo format cannot be used as a TV background");
    }
    const knownLength = Number(response.headers.get("content-length") || 0);
    if (knownLength > MAX_IMAGE_BYTES) {
      await response.body?.cancel();
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length <= MAX_IMAGE_BYTES) {
      return `data:${mime};base64,${bytes.toString("base64")}`;
    }
  }
  throw new Error("The selected photo is too large for a dashboard background");
}

export const googlePhotosPickerHandler = onRequest(
  {cors: true, maxInstances: 10, secrets: ["GOOGLE_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"]},
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({error: "Valid Firebase ID token required"});
      return;
    }
    const action = req.query.action;
    const photoRef = db.collection("users").doc(userId).collection("appearance").doc("background");
    const sessionRef = db.collection("users").doc(userId).collection("appearance").doc("picker");

    try {
      if (action === "background" && req.method === "GET") {
        const snapshot = await photoRef.get();
        res.status(200).json({dataUrl: snapshot.data()?.dataUrl || null});
        return;
      }

      const tokens = await getStoredPhotosTokens(userId);
      const connected = Boolean(tokens?.refreshToken && tokens.scope?.split(" ").includes(SCOPE));
      if (action === "status" && req.method === "GET") {
        res.status(200).json({connected});
        return;
      }
      if (!tokens || !connected) {
        res.status(409).json({error: "Connect Google Photos first"});
        return;
      }
      const token = await accessToken(tokens);

      if (action === "create" && req.method === "POST") {
        const active = (await sessionRef.get()).data();
        if (active?.id && active?.pickerUri && Date.now() < active.expiresAt) {
          res.status(200).json({pickerUri: active.pickerUri, pollIntervalMs: active.pollIntervalMs});
          return;
        }
        const session = await apiRequest<PickingSession>(token, "/sessions", "POST", {
          pickingConfig: {maxItemCount: "1"},
        });
        if (!session.id || !session.pickerUri) throw new Error("Google Photos did not start a picker session");
        const pollIntervalMs = pollMs(session);
        await sessionRef.set({
          id: session.id, pickerUri: session.pickerUri, pollIntervalMs,
          expiresAt: session.expireTime && Number.isFinite(Date.parse(session.expireTime))
            ? Date.parse(session.expireTime) : Date.now() + 600_000,
        });
        res.status(200).json({pickerUri: session.pickerUri, pollIntervalMs});
        return;
      }

      if (action === "poll" && req.method === "GET") {
        const active = (await sessionRef.get()).data();
        if (!active?.id || Date.now() > active.expiresAt) {
          res.status(410).json({error: "Photo selection expired. Start again."});
          return;
        }
        const session = await apiRequest<PickingSession>(token, `/sessions/${encodeURIComponent(active.id)}`);
        if (!session.mediaItemsSet) {
          res.status(200).json({status: "pending", pollIntervalMs: pollMs(session)});
          return;
        }
        const selected = await apiRequest<{mediaItems?: PickedMediaItem[]}>(
          token, `/mediaItems?sessionId=${encodeURIComponent(active.id)}&pageSize=10`
        );
        const photo = selected.mediaItems?.find((item) => item.type === "PHOTO");
        if (!photo) {
          await sessionRef.delete();
          res.status(400).json({error: "Select a photo rather than a video"});
          return;
        }
        const dataUrl = await downloadPhoto(token, photo);
        await photoRef.set({dataUrl, updatedAt: FieldValue.serverTimestamp()});
        await sessionRef.delete();
        try {
          await apiRequest<unknown>(token, `/sessions/${encodeURIComponent(active.id)}`, "DELETE");
        } catch (error) {
          console.warn("Could not delete Photos Picker session:", error);
        }
        res.status(200).json({status: "selected", dataUrl});
        return;
      }

      res.status(400).json({error: "Unsupported Photos Picker request"});
    } catch (error) {
      console.error("Google Photos Picker request failed:", error);
      res.status(502).json({error: error instanceof Error ? error.message : "Google Photos is unavailable"});
    }
  }
);
