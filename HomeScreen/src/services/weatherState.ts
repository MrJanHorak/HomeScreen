import type {SavedLocation, Weather} from '../../../shared/src/types';

export const weatherLocationKey = (location: SavedLocation) => location.query.trim().toLowerCase();

/** Cached summaries and failed lookups must not replace newer usable weather. */
export function preferWeather(previous: Weather | undefined, next: Weather): Weather {
  const usable = (weather?: Weather) => Boolean(weather && Number.isFinite(parseFloat(weather.temp)));
  if (!usable(next) && usable(previous)) return previous!;
  if (!usable(previous)) return next;
  for (const field of ['observedAt', 'fetchedAt'] as const) {
    const before = Date.parse(previous?.[field] || '');
    const after = Date.parse(next[field] || '');
    if (Number.isFinite(before) && (!Number.isFinite(after) || before > after)) return previous!;
    if (Number.isFinite(after) && (!Number.isFinite(before) || after > before)) return next;
  }
  return next;
}

/** Leave room in the endpoint's 60/hour quota for manual lookups and list edits. */
export const weatherRefreshInterval = (secondaryCities: number) =>
  Math.max(10 * 60 * 1000, secondaryCities * 75 * 1000);
