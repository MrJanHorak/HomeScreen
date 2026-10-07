import {onRequest, Request} from "firebase-functions/v2/https";
import {db, runUserTransaction} from "./utils/db";
import {authenticatedIdentity} from "./utils/requestAuth";
import {logSafeError} from "./utils/safeLog";
import type {Response} from "express";
import {validGrid} from "./utils/dashboardLayout";
import {validCardStyles} from "./utils/cardStyle";
import {validPhotoZoom} from "./utils/photoFraming";
import {MAX_REVISIONS, PublishedRevision} from "./utils/appearanceLibrary";
import {isDeepStrictEqual} from "node:util";

const CARD_IDS = ["weather", "schedule", "activity", "media", "meal", "todo"];
const LAYOUTS = ["balanced", "agenda", "wellness", "calm", "custom"];
const PALETTES = ["night", "forest", "plum", "contrast", "custom"];
const BACKGROUNDS = ["photo", "solid", "google-photo"];
const AMBIENT_INFO_IDS = ["weather", "calendar", "activity", "tasks", "meals"];

export function validAppearance(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const appearance = value as Record<string, unknown>;
  if (appearance.cardStyles !== undefined && !validCardStyles(appearance.cardStyles)) return false;
  if (appearance.backgroundZoom !== undefined && !validPhotoZoom(appearance.backgroundZoom)) return false;
  const ambient = appearance.ambient;
  if (ambient !== undefined) {
    if (!ambient || typeof ambient !== "object") return false;
    const preference = ambient as Record<string, unknown>;
    if (typeof preference.enabled !== "boolean" ||
      ![5, 10, 20].includes(preference.idleMinutes as number) ||
      !["gallery", "selected", "plasma", "none"].includes(String(preference.photoSource))) return false;
    if (preference.photoMinutes !== undefined && ![1, 3, 5].includes(preference.photoMinutes as number)) return false;
    if (preference.infoCycleSeconds !== undefined &&
      ![30, 60, 120].includes(preference.infoCycleSeconds as number)) return false;
    if (preference.plasmaColors !== undefined &&
      (!Array.isArray(preference.plasmaColors) || preference.plasmaColors.length !== 3 ||
        !preference.plasmaColors.every((color) => typeof color === "string" &&
          /^#[0-9a-fA-F]{6}$/.test(color)))) return false;
    if (preference.info !== undefined) {
      if (!preference.info || typeof preference.info !== "object") return false;
      const info = preference.info as Record<string, unknown>;
      if (AMBIENT_INFO_IDS.some((id) => typeof info[id] !== "boolean")) return false;
    }
  }
  if (!LAYOUTS.includes(String(appearance.layout)) ||
    !PALETTES.includes(String(appearance.palette)) ||
    !BACKGROUNDS.includes(String(appearance.background)) ||
    typeof appearance.customAccent !== "string" ||
    typeof appearance.backgroundColor !== "string" ||
    !/^#[0-9a-fA-F]{6}$/.test(appearance.customAccent) ||
    !/^#[0-9a-fA-F]{6}$/.test(appearance.backgroundColor) ||
    !Array.isArray(appearance.cards) || appearance.cards.length !== CARD_IDS.length) return false;
  const seen = new Set<string>();
  for (const card of appearance.cards) {
    if (!card || typeof card !== "object" || !CARD_IDS.includes(card.id) ||
      seen.has(card.id) || typeof card.visible !== "boolean" ||
      !["standard", "wide"].includes(card.size)) return false;
    seen.add(card.id);
  }
  return appearance.cards.some((card) => card.visible) &&
    (appearance.grid === undefined || appearance.grid === null ||
      (appearance.layout === "custom" && validGrid(appearance.grid, appearance.cards)));
}

export async function handleUserAppearance(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Valid Firebase ID token required"});
    return;
  }
  const collection = db.collection("users").doc(identity.userId).collection("appearance");
  const ref = collection.doc("settings");
  const historyRef = collection.doc("history");
  try {
    if (req.method === "GET") {
      const [snapshot, photoSnapshot] = await Promise.all([ref.get(), collection.doc("background").get()]);
      const stored = snapshot.data();
      const photos = photoSnapshot.data();
      res.status(200).json({
        appearance: stored?.appearance || null,
        updatedAtMs: stored?.updatedAtMs || 0,
        seededFromWeb: stored?.seededFromWeb === true,
        photoUpdatedAtMs: Math.max(photos?.galleryUpdatedAtMs || 0, photos?.backgroundUpdatedAtMs || 0),
      });
      return;
    }
    if (req.method === "PUT") {
      if (Buffer.byteLength(JSON.stringify(req.body || {}), "utf8") > 10_000 || !validAppearance(req.body?.appearance)) {
        res.status(400).json({error: "Invalid appearance settings"});
        return;
      }
      const expected = req.body.expectedUpdatedAtMs;
      if (expected !== undefined && (!Number.isSafeInteger(expected) || expected < 0)) {
        res.status(400).json({error: "Invalid appearance revision"});
        return;
      }
      const result = await runUserTransaction(identity.userId, async (transaction) => {
        const snapshot = await transaction.get(ref);
        const existing = snapshot.data();
        if (expected !== undefined && expected !== (existing?.updatedAtMs || 0)) return {conflict: true};
        const appearance = {...req.body.appearance};
        if (appearance.backgroundZoom === undefined && existing?.appearance?.backgroundZoom !== undefined) {
          appearance.backgroundZoom = existing.appearance.backgroundZoom;
        }
        if (appearance.cardStyles === undefined && existing?.appearance?.cardStyles) {
          appearance.cardStyles = existing.appearance.cardStyles;
        }
        // Older TVs must not erase a canvas when changing a color or ambient setting.
        if (appearance.grid === undefined && existing?.appearance?.grid) {
          appearance.grid = existing.appearance.grid;
          appearance.layout = "custom";
        }
        if (!validAppearance(appearance)) return {invalid: true};
        if (Buffer.byteLength(JSON.stringify(appearance), "utf8") > 10_000) return {invalid: true};
        // Retries and duplicate TV writes must not invalidate an owner's open draft.
        if (isDeepStrictEqual(appearance, existing?.appearance)) {
          if (req.body.source === "web" && existing?.seededFromWeb !== true) {
            transaction.set(ref, {...existing, seededFromWeb: true});
          }
          return {updatedAtMs: existing?.updatedAtMs || 0};
        }
        const history = await transaction.get(historyRef);
        const revisions: PublishedRevision[] = history.data()?.revisions || [];
        // Seed only when history has never existed; an emptied history must stay deleted.
        if (!history.data() && existing?.appearance && validAppearance(existing.appearance) &&
          Buffer.byteLength(JSON.stringify(existing.appearance), "utf8") <= 10_000) {
          revisions.push({appearance: existing.appearance, updatedAtMs: existing.updatedAtMs || 0,
            changedBy: identity.userId, source: "previous"});
        }
        const updatedAtMs = Math.max(Date.now(), (existing?.updatedAtMs || 0) + 1);
        transaction.set(ref, {
          appearance, updatedAtMs,
          seededFromWeb: existing?.seededFromWeb === true || req.body.source === "web",
        });
        transaction.set(historyRef, {revisions: [
          {appearance, updatedAtMs, changedBy: identity.userId, source: identity.owner ? "web" : "tv"},
          ...revisions,
        ].slice(0, MAX_REVISIONS)});
        return {updatedAtMs};
      });
      if (result.conflict) res.status(409).json({error: "TV settings changed since this draft started. Your draft is safe; review the newer settings to continue."});
      else if (result.invalid) res.status(400).json({error: "This TV cannot change the saved free layout. Use the companion site or update the TV app."});
      else res.status(200).json({updatedAtMs: result.updatedAtMs});
      return;
    }
    res.status(405).json({error: "Method not allowed"});
  } catch (error) {
    logSafeError("Could not sync appearance", error);
    res.status(500).json({error: "Could not sync appearance settings"});
  }
}

export const userAppearanceHandler = onRequest({cors: true, maxInstances: 10}, handleUserAppearance);
