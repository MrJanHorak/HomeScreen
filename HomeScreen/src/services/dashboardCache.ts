import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DashboardSummaryResponse } from '../../../shared/src/types';

export const DASHBOARD_CACHE_KEY = '@tv_dashboard_summary_v1';
export const DASHBOARD_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CHARACTERS = 1024 * 1024;
const object = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: any, keys: string[]) => object(value) && keys.every((key) => typeof value[key] === 'string');
const numbers = (value: any, keys: string[]) => object(value) && keys.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]));
const list = (value: any, check: (item: any) => boolean) => Array.isArray(value) && value.every(check);

/** Reject damaged/incompatible snapshots before they reach card renderers. */
function validSummary(data: any): data is DashboardSummaryResponse {
  const event = (item: any) => strings(item, ['id', 'title', 'time', 'endTime', 'category', 'color']);
  const day = (item: any) => strings(item, ['date']) && numbers(item, ['steps', 'distance', 'calories']) &&
    (item.activeMinutes === null || numbers(item, ['activeMinutes']));
  return object(data) && typeof data.updatedAt === 'string' && Number.isFinite(Date.parse(data.updatedAt)) &&
    list(data.schedule, event) && list(data.upcomingEvents, event) &&
    list(data.tasks, (item) => strings(item, ['id', 'title']) && (item.due === null || typeof item.due === 'string')) &&
    object(data.meals) && ['ok', 'not_connected', 'unavailable'].includes(data.meals.status) &&
    list(data.meals.items, (item) => strings(item, ['date', 'title'])) &&
    numbers(data.health, ['steps', 'stepGoal', 'distance', 'distanceGoal', 'calories', 'progress']) &&
    (data.health.activeMinutes === null || numbers(data.health, ['activeMinutes'])) &&
    (data.health.weekly === undefined || list(data.health.weekly, day)) &&
    strings(data.weather, ['temp', 'condition']) &&
    (data.weather.forecast === undefined || list(data.weather.forecast, (item) => strings(item, ['day', 'condition', 'icon']) && numbers(item, ['high', 'low']))) &&
    (data.weather.hourly === undefined || list(data.weather.hourly, (item) => strings(item, ['time', 'icon', 'pop']) && numbers(item, ['temp']))) &&
    (data.savedLocations === undefined || list(data.savedLocations, (item) => strings(item, ['id', 'name', 'query'])));
}

export async function loadDashboardCache(uid: string): Promise<DashboardSummaryResponse | null> {
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(`${DASHBOARD_CACHE_KEY}:${uid}`);
    if (!raw || raw.length > MAX_CHARACTERS) return null;
    const entry = JSON.parse(raw);
    const age = Date.now() - Date.parse(entry.summary?.updatedAt);
    return entry.version === 1 && entry.uid === uid && validSummary(entry.summary) &&
      age >= 0 && age <= DASHBOARD_CACHE_MAX_AGE_MS ? entry.summary : null;
  } catch {
    return null; // Storage failures must not prevent a network startup.
  }
}

// Serialize writes and removal so an in-flight save cannot recreate a signed-out cache.
const writes = new Map<string, Promise<void>>();
function queue(uid: string, action: () => Promise<void>): Promise<void> {
  const next = (writes.get(uid) || Promise.resolve()).then(action).catch(() => undefined);
  writes.set(uid, next);
  void next.then(() => { if (writes.get(uid) === next) writes.delete(uid); });
  return next;
}

export function saveDashboardCache(uid: string, summary: DashboardSummaryResponse): Promise<void> {
  if (!uid || !validSummary(summary)) return Promise.resolve();
  const raw = JSON.stringify({ version: 1, uid, summary });
  if (raw.length > MAX_CHARACTERS) return Promise.resolve();
  return queue(uid, () => AsyncStorage.setItem(`${DASHBOARD_CACHE_KEY}:${uid}`, raw));
}

export function clearDashboardCache(uid: string): Promise<void> {
  return queue(uid, () => AsyncStorage.removeItem(`${DASHBOARD_CACHE_KEY}:${uid}`));
}
