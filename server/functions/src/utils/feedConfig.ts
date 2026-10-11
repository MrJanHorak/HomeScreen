/** Pure feed contract shared by the backend, TV, and companion. */
export interface FeedOptions {url: string; title: string; itemCount: 3 | 5 | 8}
export interface FeedArticle {id: string; title: string; summary: string; url: string | null; publishedAtMs: number | null}
export interface FeedResult {url: string; title: string; articles: FeedArticle[]; updatedAtMs: number; stale: boolean; error: string | null}
export interface FeedResponse {feeds: FeedResult[]}

export const FEED_PRESETS = [
  {title: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml"},
  {title: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml"},
  {title: "Guardian World", url: "https://www.theguardian.com/world/rss"},
  {title: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index"},
  {title: "NASA News", url: "https://www.nasa.gov/news-release/feed/"},
] as const;

/** Require a public HTTPS URL; DNS and network addresses are checked by the server. */
export function normalizeFeedUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443" ||
      !url.hostname.includes(".") || url.hostname.includes(":") || url.hostname.includes("[") || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(url.hostname)) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}
export function validFeedOptions(value: unknown): value is FeedOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const feed = value as Record<string, unknown>;
  return Object.keys(feed).every((key) => ["url", "title", "itemCount"].includes(key)) &&
    typeof feed.url === "string" && normalizeFeedUrl(feed.url) === feed.url && typeof feed.title === "string" &&
    feed.title.trim().length > 0 && feed.title.length <= 80 && !/[<>]/.test(feed.title) && ![...feed.title].some((char) => char.charCodeAt(0) < 32) &&
    [3, 5, 8].includes(feed.itemCount as number);
}
export function feedAge(timestamp: number | null, now = Date.now()): string {
  if (!timestamp) return "";
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  return minutes < 1 ? "Just now" : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}
