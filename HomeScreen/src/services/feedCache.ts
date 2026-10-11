import AsyncStorage from '@react-native-async-storage/async-storage';
import {normalizeFeedUrl} from '../../../server/functions/src/utils/feedConfig';
import type {FeedResult} from '../../../server/functions/src/utils/feedConfig';

const key = (uid: string) => `@tv_feeds_v1:${uid}`;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const time = (value: unknown, futureMs = 60000): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= Date.now() + futureMs;
function validResult(value: unknown): value is FeedResult {
  if (!record(value) || typeof value.url !== 'string' || normalizeFeedUrl(value.url) !== value.url || !text(value.title, 80) ||
    !time(value.updatedAtMs) || Date.now() - value.updatedAtMs > 7 * 86400000 || typeof value.stale !== 'boolean' ||
    value.error !== null && !text(value.error, 200) || !Array.isArray(value.articles) || value.articles.length > 30) return false;
  return value.articles.every((article) => record(article) && text(article.id, 64) && text(article.title, 240) && text(article.summary, 1200) &&
    (article.publishedAtMs === null || time(article.publishedAtMs, 86400000)) &&
    (article.url === null || typeof article.url === 'string' && /^https?:\/\//.test(article.url) &&
      normalizeFeedUrl(article.url.replace(/^http:/, 'https:')) !== null));
}
export async function loadFeedCache(uid: string): Promise<Record<string, FeedResult>> {
  if (!uid) return {};
  try {
    const raw = await AsyncStorage.getItem(key(uid)); if (!raw || raw.length > 1024 * 1024) return {};
    const entry = JSON.parse(raw);
    if (entry.version !== 1 || entry.uid !== uid || !record(entry.feeds)) return {};
    const feeds: Record<string, FeedResult> = {};
    for (const [url, feed] of Object.entries(entry.feeds)) if (validResult(feed) && feed.url === url) feeds[url] = feed;
    return feeds;
  } catch {return {};}
}
// Queue removal after saves so sign-out cannot leave an in-flight snapshot behind.
const writes = new Map<string, Promise<void>>();
function queue(uid: string, action: () => Promise<void>): Promise<void> {
  const next = (writes.get(uid) || Promise.resolve()).then(action).catch(() => undefined);
  writes.set(uid, next); void next.then(() => {if (writes.get(uid) === next) writes.delete(uid);}); return next;
}
export function saveFeedCache(uid: string, feeds: Record<string, FeedResult>): Promise<void> {
  if (!uid) return Promise.resolve();
  const safe = Object.fromEntries(Object.entries(feeds).filter(([url, feed]) => validResult(feed) && feed.url === url));
  const raw = JSON.stringify({version: 1, uid, feeds: safe});
  return raw.length > 1024 * 1024 ? Promise.resolve() : queue(uid, () => AsyncStorage.setItem(key(uid), raw));
}
export function clearFeedCache(uid: string): Promise<void> {return queue(uid, () => AsyncStorage.removeItem(key(uid)));}
