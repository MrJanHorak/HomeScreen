/** Pure feed contract shared by the backend, TV, and companion. */
export interface FeedOptions {url: string; title: string; itemCount: 3 | 5 | 8}
export interface FeedArticle {id: string; title: string; summary: string; url: string | null; publishedAtMs: number | null;
  content?: string; contentTruncated?: boolean; imageUrl?: string | null}
export interface FeedResult {url: string; title: string; articles: FeedArticle[]; updatedAtMs: number; stale: boolean; error: string | null}
export interface FeedResponse {feeds: FeedResult[]}

export const FEED_CATEGORIES = ["Science & discovery", "Technology", "Space", "Nature & curiosities", "News & world"] as const;
export type FeedCategory = typeof FEED_CATEGORIES[number];
const categorized = (category: FeedCategory, title: string, url: string) => ({category, title, url});
export const FEED_CATALOG = [
  categorized("News & world", "BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"),
  categorized("News & world", "Guardian World", "https://www.theguardian.com/world/rss"),
  categorized("News & world", "NPR News", "https://feeds.npr.org/1001/rss.xml"),
  categorized("News & world", "PBS NewsHour", "https://www.pbs.org/newshour/feeds/rss/headlines"),
  categorized("News & world", "CBS News", "https://www.cbsnews.com/latest/rss/main"),
  categorized("News & world", "Fox News", "https://moxie.foxnews.com/google-publisher/latest.xml"),
  categorized("News & world", "Deutsche Welle", "https://rss.dw.com/rdf/rss-en-all"),
  categorized("News & world", "Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
  categorized("Science & discovery", "ScienceDaily Science", "https://www.sciencedaily.com/rss/top/science.xml"),
  categorized("Science & discovery", "Science News", "https://www.sciencenews.org/feed"),
  categorized("Science & discovery", "Quanta Magazine", "https://www.quantamagazine.org/feed/"),
  categorized("Science & discovery", "BBC Science & Environment", "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"),
  categorized("Science & discovery", "Phys.org", "https://phys.org/rss-feed/"),
  categorized("Technology", "BBC Technology", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
  categorized("Technology", "Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
  categorized("Technology", "The Verge", "https://www.theverge.com/rss/index.xml"),
  categorized("Technology", "MIT Technology Review", "https://www.technologyreview.com/feed/"),
  categorized("Technology", "TechCrunch", "https://techcrunch.com/feed/"),
  categorized("Space", "NASA News", "https://www.nasa.gov/news-release/feed/"),
  categorized("Space", "NASA Image of the Day", "https://www.nasa.gov/feeds/iotd-feed/"),
  categorized("Space", "Astronomy Magazine", "https://www.astronomy.com/feed/"),
  categorized("Nature & curiosities", "ScienceDaily Environment", "https://www.sciencedaily.com/rss/top/environment.xml"),
  categorized("Nature & curiosities", "ScienceDaily Strange & Offbeat", "https://www.sciencedaily.com/rss/strange_offbeat.xml"),
  categorized("Nature & curiosities", "Smithsonian Magazine", "https://www.smithsonianmag.com/rss/latest_articles/"),
];
// Keep category metadata out of persisted options, whose schema is deliberately strict.
export const FEED_PRESETS = FEED_CATALOG.map(({title, url}) => ({title, url}));

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
