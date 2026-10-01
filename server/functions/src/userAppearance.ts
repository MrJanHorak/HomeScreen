import {onRequest} from "firebase-functions/v2/https";
import {db} from "./utils/db";
import {authenticatedUserId} from "./utils/requestAuth";

const CARD_IDS = ["weather", "schedule", "activity", "media", "meal", "todo"];
const LAYOUTS = ["balanced", "agenda", "wellness", "calm", "custom"];
const PALETTES = ["night", "forest", "plum", "contrast", "custom"];
const BACKGROUNDS = ["photo", "solid", "google-photo"];
const AMBIENT_INFO_IDS = ["weather", "calendar", "activity", "tasks", "meals"];

function validAppearance(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const appearance = value as Record<string, unknown>;
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
  return appearance.cards.some((card) => card.visible);
}

export const userAppearanceHandler = onRequest({cors: true, maxInstances: 10}, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  const userId = await authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({error: "Valid Firebase ID token required"});
    return;
  }
  const ref = db.collection("users").doc(userId).collection("appearance").doc("settings");
  try {
    if (req.method === "GET") {
      const snapshot = await ref.get();
      const stored = snapshot.data();
      res.status(200).json({
        appearance: stored?.appearance || null,
        updatedAtMs: stored?.updatedAtMs || 0,
        seededFromWeb: stored?.seededFromWeb === true,
      });
      return;
    }
    if (req.method === "PUT") {
      if (JSON.stringify(req.body || {}).length > 10_000 || !validAppearance(req.body?.appearance)) {
        res.status(400).json({error: "Invalid appearance settings"});
        return;
      }
      const updatedAtMs = Date.now();
      const existing = await ref.get();
      await ref.set({
        appearance: req.body.appearance,
        updatedAtMs,
        seededFromWeb: existing.data()?.seededFromWeb === true || req.body.source === "web",
      });
      res.status(200).json({updatedAtMs});
      return;
    }
    res.status(405).json({error: "Method not allowed"});
  } catch (error) {
    console.error("Could not sync appearance:", error);
    res.status(500).json({error: "Could not sync appearance settings"});
  }
});
