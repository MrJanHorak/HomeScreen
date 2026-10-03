import {onRequest} from "firebase-functions/v2/https";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {db, getStoredPhotosTokens} from "./utils/db";
import {authenticatedUserId} from "./utils/requestAuth";
import {getOAuth2Client} from "./services/googleAuth";
import {GoogleTokens} from "./types";
import {logSafeError} from "./utils/safeLog";

const API = "https://photospicker.googleapis.com/v1";
const SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const MAX_IMAGE_BYTES = 550_000; // Base64 stays well below Firestore's 1 MiB document limit.
const MAX_PHOTOS = 8;

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

interface SelectedPhoto {
  id: string;
  dataUrl: string;
}

async function accessToken(tokens: GoogleTokens): Promise<string> {
  const token = (await getOAuth2Client(tokens).getAccessToken()).token;
  if (!token) throw new Error("Google Photos token is unavailable");
  return token;
}

async function apiRequest<T>(token: string, path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    signal: AbortSignal.timeout(15_000),
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
  for (const [width, height] of [[1280, 720], [960, 540], [720, 405], [640, 360], [480, 270]]) {
    const response = await fetch(`${baseUrl.toString()}=w${width}-h${height}`, {
      headers: {Authorization: `Bearer ${token}`},
      signal: AbortSignal.timeout(15_000),
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
    const chunks: Buffer[] = [];
    let total = 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Photo download had no content");
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(Buffer.from(value));
    }
    const bytes = Buffer.concat(chunks);
    if (total <= MAX_IMAGE_BYTES) {
      return `data:${mime};base64,${bytes.toString("base64")}`;
    }
  }
  throw new Error("The selected photo is too large for a dashboard background");
}

export const googlePhotosPickerHandler = onRequest(
  {cors: true, maxInstances: 10, secrets: ["GOOGLE_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"]},
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
    const action = req.query.action;
    const photoRef = db.collection("users").doc(userId).collection("appearance").doc("background");
    const galleryRef = photoRef.collection("photos");
    const sessionRef = db.collection("users").doc(userId).collection("appearance").doc("picker");
    let processingSessionId: string | null = null;

    try {
      if (action === "background" && req.method === "GET") {
        const snapshot = await photoRef.get();
        res.status(200).json({dataUrl: snapshot.data()?.dataUrl || null});
        return;
      }

      if (action === "gallery" && req.method === "GET") {
        const gallery = await galleryRef.orderBy("order").limit(MAX_PHOTOS).get();
        if (!gallery.empty) {
          res.status(200).json({photos: gallery.docs.map((doc) => ({
            id: doc.id, dataUrl: doc.data().dataUrl,
          }))});
          return;
        }
        // Preserve a photo picked before the gallery was introduced.
        const oldBackground = (await photoRef.get()).data()?.dataUrl;
        res.status(200).json({photos: oldBackground
          ? [{id: "legacy-background", dataUrl: oldBackground}] : []});
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
        const purpose = req.query.purpose === "ambient" ? "ambient" : "background";
        if (active?.id) {
          try {
            await apiRequest<unknown>(token, `/sessions/${encodeURIComponent(active.id)}`, "DELETE");
          } catch (error) {
            logSafeError("Could not close the previous Photos Picker session", error);
          }
        }
        const session = await apiRequest<PickingSession>(token, "/sessions", "POST", {
          pickingConfig: {maxItemCount: String(MAX_PHOTOS)},
        });
        if (!session.id || !session.pickerUri) throw new Error("Google Photos did not start a picker session");
        const pollIntervalMs = pollMs(session);
        await sessionRef.set({
          id: session.id, pickerUri: session.pickerUri, pollIntervalMs,
          maxItemCount: MAX_PHOTOS, purpose,
          expiresAt: session.expireTime && Number.isFinite(Date.parse(session.expireTime))
            ? Date.parse(session.expireTime) : Date.now() + 600_000,
          deleteAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
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
        const acquired = await db.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(sessionRef);
          const current = snapshot.data();
          if (!current || current.id !== active.id ||
            (typeof current.processingUntil === "number" && current.processingUntil > Date.now())) {
            return false;
          }
          transaction.update(sessionRef, {processingUntil: Date.now() + 3 * 60_000});
          return true;
        });
        if (!acquired) {
          res.status(200).json({status: "pending", pollIntervalMs: 3000});
          return;
        }
        processingSessionId = active.id;
        const picked: PickedMediaItem[] = [];
        let pageToken: string | undefined;
        do {
          const params = new URLSearchParams({sessionId: active.id, pageSize: String(MAX_PHOTOS)});
          if (pageToken) params.set("pageToken", pageToken);
          const page = await apiRequest<{mediaItems?: PickedMediaItem[]; nextPageToken?: string}>(
            token, `/mediaItems?${params.toString()}`
          );
          picked.push(...(page.mediaItems || []));
          pageToken = page.nextPageToken;
        } while (pageToken && picked.length <= MAX_PHOTOS);
        if (!picked.length || picked.length > MAX_PHOTOS || picked.some((item) => item.type !== "PHOTO")) {
          await sessionRef.delete();
          res.status(400).json({error: `Choose 1–${MAX_PHOTOS} photos, without videos`});
          return;
        }
        // Download before replacing the existing selection, so a failed item keeps the old gallery.
        const dataUrls: string[] = [];
        for (const item of picked) dataUrls.push(await downloadPhoto(token, item));
        const existing = await galleryRef.get();
        const photos: SelectedPhoto[] = dataUrls.map((dataUrl) => ({
          id: galleryRef.doc().id, dataUrl,
        }));
        const batch = db.batch();
        for (const doc of existing.docs) batch.delete(doc.ref);
        for (const [order, photo] of photos.entries()) {
          batch.set(galleryRef.doc(photo.id), {
            dataUrl: photo.dataUrl, order, updatedAt: FieldValue.serverTimestamp(),
          });
        }
        if (active.purpose === "background") {
          batch.set(photoRef, {dataUrl: photos[0].dataUrl, updatedAt: FieldValue.serverTimestamp()});
        }
        batch.delete(sessionRef);
        await batch.commit();
        try {
          await apiRequest<unknown>(token, `/sessions/${encodeURIComponent(active.id)}`, "DELETE");
        } catch (error) {
          logSafeError("Could not delete Photos Picker session", error);
        }
        res.status(200).json({status: "selected", photos});
        return;
      }

      res.status(400).json({error: "Unsupported Photos Picker request"});
    } catch (error) {
      if (processingSessionId) {
        const current = await sessionRef.get().catch(() => null);
        if (current?.data()?.id === processingSessionId) {
          await sessionRef.update({processingUntil: 0}).catch(() => undefined);
        }
      }
      logSafeError("Google Photos Picker request failed", error);
      res.status(502).json({error: error instanceof Error ? error.message : "Google Photos is unavailable"});
    }
  }
);
