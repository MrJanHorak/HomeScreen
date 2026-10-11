import {XMLParser, XMLValidator} from "fast-xml-parser";
import {decode} from "html-entities";
import {createHash} from "node:crypto";
import {lookup} from "node:dns/promises";
import {request} from "node:https";
import ipaddr from "ipaddr.js";
import {normalizeFeedUrl} from "../utils/feedConfig";
import type {FeedArticle} from "../utils/feedConfig";

const MAX_BYTES = 1024 * 1024;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const list = (value: unknown): unknown[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const content = (value: unknown): string => typeof value === "string" ? value : typeof value === "number" ? String(value) : Array.isArray(value) ? value.map(content).join(" ") :
  Object.entries(object(value)).filter(([key]) => !key.startsWith("@_") && !["script", "style"].includes(key)).map(([, child]) => content(child)).join(" ");
export function plainFeedText(value: unknown, limit: number): string {
  return decode(content(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    // eslint-disable-next-line no-control-regex -- Strip control bytes from publisher content.
    .replace(/<[^>]*>/g, " ").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "").replace(/\s+/g, " ").trim().slice(0, limit);
}
/** Preserve publisher paragraphs without rendering any HTML or executable content. */
export function readableFeedText(value: unknown, limit = 12000): string {
  return decode(content(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<\/?(?:p|div|h[1-6]|li|blockquote|br)\b[^>]*>/gi, "\n\n").replace(/<[^>]*>/g, " ")
    // eslint-disable-next-line no-control-regex -- Strip control bytes from publisher content.
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "").replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, limit);
}
function feedImage(item: Record<string, unknown>, base: string): string | null {
  const group = object(item.group);
  const candidates: unknown[] = [];
  for (const entry of [...list(item.content), ...list(group.content), ...list(item.enclosure), ...list(item.link)]) {
    const media = object(entry); const type = content(media["@_type"]);
    if (media["@_medium"] === "image" || type.startsWith("image/") || media["@_url"] && !type && !media["@_medium"]) candidates.push(media["@_url"] || media["@_href"]);
  }
  for (const entry of [...list(item.thumbnail), ...list(group.thumbnail)]) candidates.push(object(entry)["@_url"]);
  const html = decode(content(item.encoded || item.content || item.description || item.summary))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (/\b(?:width|height)\s*=\s*["']?[012](?:["'\s>]|$)/i.test(match[0])) continue;
    candidates.push(match[0].match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)?.slice(1).find(Boolean));
  }
  for (const candidate of candidates) {
    const url = articleUrl(candidate, base);
    if (url && normalizeFeedUrl(url) && !/\.svg(?:[?#]|$)/i.test(new URL(url).pathname)) return url;
  }
  return null;
}
export function articleUrl(value: unknown, base: string): string | null {
  try {
    const text = decode(content(value)).trim();
    if (!text || text.length > 2048) return null;
    const url = new URL(text, base);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port && !["80", "443"].includes(url.port)) return null;
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (!host.includes(".") || /(?:^|\.)(localhost|local|internal)$/.test(host) || ipaddr.isValid(host) && !publicFeedAddress(host)) return null;
    return url.href;
  } catch {
    return null;
  }
}
export function parseFeed(xml: string, base: string): {title: string; articles: FeedArticle[]} {
  if (Buffer.byteLength(xml, "utf8") > MAX_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true) throw new Error("This URL did not return a valid RSS or Atom feed.");
  const parser = new XMLParser({ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, processEntities: false, maxNestedTags: 40,
    stopNodes: ["*.title", "*.description", "*.summary", "*.content", "*.encoded"]});
  const root = object(parser.parse(xml));
  const atom = object(root.feed); const channel = object(object(root.rss).channel); const rdf = object(root.RDF);
  const feed = root.feed !== undefined ? atom : root.rss !== undefined ? channel : root.RDF !== undefined ? object(rdf.channel) : null;
  if (!feed) throw new Error("This URL did not return an RSS or Atom feed.");
  const seen = new Set<string>(); const articles: FeedArticle[] = [];
  let contentBytes = 240000;
  for (const value of list(root.feed !== undefined ? atom.entry : root.RDF !== undefined ? rdf.item : channel.item).slice(0, 200)) {
    const item = object(value); const title = plainFeedText(item.title, 240);
    if (!title) continue;
    const link = typeof item.link === "string" ? item.link : list(item.link).map(object).find((l) => !l["@_rel"] || l["@_rel"] === "alternate")?.["@_href"];
    const url = articleUrl(link, base);
    const id = createHash("sha256").update(url || content(item.guid || item.id) || title).digest("hex").slice(0, 24);
    if (seen.has(id)) continue;
    seen.add(id);
    const date = Date.parse(content(item.pubDate || item.published || item.updated || item.date));
    const bodies = [item.encoded, item.content, item.description, item.summary].map((body) => readableFeedText(body, 12001));
    const body = bodies.reduce((longest, next) => next.length > longest.length ? next : longest, "");
    const clipped = Buffer.from(body.slice(0, 12000)).subarray(0, contentBytes).toString("utf8").replace(/\uFFFD$/, "");
    contentBytes -= Buffer.byteLength(clipped);
    articles.push({id, title, url, summary: plainFeedText(item.description || item.summary || item.encoded || item.content, 1200),
      content: clipped, contentTruncated: clipped.length < body.length, imageUrl: feedImage(item, url || base),
      publishedAtMs: Number.isFinite(date) && date >= 0 && date <= Date.now() + 86400000 ? date : null});
    if (articles.length === 30) break;
  }
  return {title: plainFeedText(feed.title, 80) || "Feed", articles};
}

/** Reject private, reserved and translated networks before pinning the socket's DNS answer. */
export function publicFeedAddress(value: string): boolean {
  try {
    const address = ipaddr.parse(value);
    if (address.range() !== "unicast") return false;
    if (address.kind() === "ipv6") {
      return address.match(ipaddr.parseCIDR("2000::/3")) &&
      !address.match(ipaddr.parseCIDR("2001::/23")) && !address.match(ipaddr.parseCIDR("3fff::/20"));
    }
    return true;
  } catch {
    return false;
  }
}
export async function downloadFeed(value: string, redirects = 0, deadline = Date.now() + 10000): Promise<{xml: string; url: string}> {
  const normalized = normalizeFeedUrl(value);
  if (!normalized || redirects > 3 || Date.now() >= deadline) throw new Error("Feed URL or redirect is unavailable.");
  const url = new URL(normalized);
  let lookupTimer: ReturnType<typeof setTimeout> | undefined;
  const answers = await Promise.race([lookup(url.hostname, {all: true}), new Promise<never>((_, reject) => {
    lookupTimer = setTimeout(() => reject(new Error("Feed lookup timed out.")), Math.max(1, deadline - Date.now())); lookupTimer.unref();
  })]).finally(() => clearTimeout(lookupTimer));
  if (!answers.length || answers.some((answer) => !publicFeedAddress(answer.address))) throw new Error("Use a public HTTPS feed URL.");
  const answer = answers.find((a) => a.family === 4) || answers[0];
  const result = await new Promise<{xml: string; location?: string}>((resolve, reject) => {
    const req = request(url, {agent: false, family: answer.family,
      lookup: (_host, _options, callback) => callback(null, answer.address, answer.family),
      headers: {"Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml", "Accept-Encoding": "identity", "User-Agent": "HomeScreen-FeedReader/1.0"}}, (res) => {
      const status = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        res.resume(); resolve({xml: "", location: res.headers.location}); return;
      }
      if (status !== 200 || res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity" || Number(res.headers["content-length"]) > MAX_BYTES) {
        res.resume(); reject(new Error("Feed could not be downloaded.")); return;
      }
      const chunks: Buffer[] = []; let bytes = 0;
      res.on("data", (chunk: Buffer) => {
        bytes += chunk.length; if (bytes > MAX_BYTES) req.destroy(new Error("Feed is too large.")); else chunks.push(chunk);
      });
      res.on("error", reject); res.on("end", () => resolve({xml: Buffer.concat(chunks).toString("utf8")}));
    });
    const timer = setTimeout(() => req.destroy(new Error("Feed request timed out.")), Math.max(1, deadline - Date.now()));
    req.on("close", () => clearTimeout(timer)); req.on("error", reject); req.end();
  });
  if (result.location) return downloadFeed(new URL(result.location, url).href, redirects + 1, deadline);
  return {xml: result.xml, url: url.href};
}
