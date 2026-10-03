import {StoredUserTokens} from "../types";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

/** Reject malformed or oversized preferences before writing a user's document. */
export function parsePreferences(value: unknown): Partial<StoredUserTokens> | null {
  if (!record(value) || JSON.stringify(value).length > 8_000) return null;
  const allowed = ["weatherCity", "stepGoal", "distanceGoal", "location", "savedLocations"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return null;
  const result: Partial<StoredUserTokens> = {};
  if (value.weatherCity !== undefined) {
    if (!boundedText(value.weatherCity, 100)) return null;
    result.weatherCity = value.weatherCity.trim();
  }
  if (value.stepGoal !== undefined) {
    if (!Number.isInteger(value.stepGoal) || (value.stepGoal as number) < 1 ||
      (value.stepGoal as number) > 100_000) return null;
    result.stepGoal = value.stepGoal as number;
  }
  if (value.distanceGoal !== undefined) {
    if (typeof value.distanceGoal !== "number" || !Number.isFinite(value.distanceGoal) ||
      value.distanceGoal <= 0 || value.distanceGoal > 1_000) return null;
    result.distanceGoal = value.distanceGoal;
  }
  if (value.location !== undefined) {
    if (!record(value.location)) return null;
    const location = value.location;
    if (Object.keys(location).some((key) => !["lat", "lon", "city", "units"].includes(key)) ||
      (location.lat !== undefined && (typeof location.lat !== "number" ||
        !Number.isFinite(location.lat) || Math.abs(location.lat) > 90)) ||
      (location.lon !== undefined && (typeof location.lon !== "number" ||
        !Number.isFinite(location.lon) || Math.abs(location.lon) > 180)) ||
      (location.city !== undefined && !boundedText(location.city, 100)) ||
      (location.units !== undefined && !["metric", "imperial"].includes(String(location.units)))) return null;
    result.location = location;
  }
  if (value.savedLocations !== undefined) {
    if (!Array.isArray(value.savedLocations) || value.savedLocations.length < 1 ||
      value.savedLocations.length > 20) return null;
    const ids = new Set<string>();
    for (const loc of value.savedLocations) {
      if (!record(loc) || Object.keys(loc).some((key) =>
        !["id", "name", "query", "isDefault"].includes(key)) ||
        !boundedText(loc.id, 80) || !boundedText(loc.name, 80) ||
        !boundedText(loc.query, 100) ||
        (loc.isDefault !== undefined && typeof loc.isDefault !== "boolean") || ids.has(loc.id)) return null;
      ids.add(loc.id);
    }
    result.savedLocations = value.savedLocations;
  }
  return result;
}
