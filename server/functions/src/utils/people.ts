import * as crypto from "crypto";

export const ACTIVITY_SCOPES = [
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.location.read",
];
export const MAX_PEOPLE = 12;
export const INVITE_LIFETIME_MS = 30 * 60 * 1000;
export const validPersonId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
export const validInvitation = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
export const invitationHash = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");
export const personId = (dashboardId: string, userId: string): string =>
  crypto.createHash("sha256").update(JSON.stringify([dashboardId, userId])).digest("hex").slice(0, 32);

export function activityProfile(value: unknown): {name: string; stepGoal: number; distanceGoal: number} | null {
  if (!value || typeof value !== "object") return null;
  const profile = value as Record<string, unknown>;
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  if (!name || name.length > 40 || [...name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
    !Number.isInteger(profile.stepGoal) || Number(profile.stepGoal) < 100 || Number(profile.stepGoal) > 100000 ||
    typeof profile.distanceGoal !== "number" || !Number.isFinite(profile.distanceGoal) ||
    profile.distanceGoal < 0.1 || profile.distanceGoal > 200) return null;
  return {name, stepGoal: Number(profile.stepGoal), distanceGoal: profile.distanceGoal};
}
