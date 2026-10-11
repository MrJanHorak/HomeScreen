import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {createHash, randomBytes} from "node:crypto";
import {Timestamp} from "firebase-admin/firestore";
import {db, runUserTransaction, recordUserQuota} from "./utils/db";
import {authenticatedIdentity} from "./utils/requestAuth";
import {normalizeFeedUrl} from "./utils/feedConfig";
import type {FeedResult} from "./utils/feedConfig";
import {downloadFeed, parseFeed} from "./services/feedService";
import {logSafeError} from "./utils/safeLog";

const FRESH_MS = 15 * 60000;
/** A transactional lease prevents parallel TVs and previews from multiplying downloads. */
export async function cachedFeed(uid: string, url: string): Promise<FeedResult> {
  const ref = db.collection("users").doc(uid).collection("feedCache").doc(createHash("sha256").update(url).digest("hex"));
  const token = randomBytes(16).toString("hex"); const now = Date.now();
  const lease = await runUserTransaction(uid, async (tx) => {
    const saved = (await tx.get(ref)).data();
    if (saved && (saved.nextFetchAtMs > now || saved.leaseUntilMs > now)) return {saved, acquired: false};
    tx.set(ref, {leaseToken: token, leaseUntilMs: now + 15000, expiresAt: Timestamp.fromMillis(now + 7 * 86400000)}, {merge: true});
    return {saved, acquired: true};
  });
  const old = lease.saved?.result as FeedResult | undefined;
  if (!lease.acquired) {
    return old ? {...old, stale: old.stale || now - old.updatedAtMs >= FRESH_MS} :
      {url, title: "Feed", articles: [], updatedAtMs: 0, stale: true, error: "Feed is refreshing. Try again shortly."};
  }
  let result: FeedResult;
  try {
    if (!await recordUserQuota(uid, "feed_downloads", 60, 3600000)) throw new Error("Feed download limit reached.");
    const downloaded = await downloadFeed(url);
    result = {url, ...parseFeed(downloaded.xml, downloaded.url), updatedAtMs: Date.now(), stale: false, error: null};
  } catch {
    result = old ? {...old, stale: true, error: "Could not refresh this feed. Showing saved stories."} :
      {url, title: "Feed", articles: [], updatedAtMs: 0, stale: true, error: "Could not read this feed. Check the RSS or Atom URL and try again later."};
  }
  await runUserTransaction(uid, async (tx) => {
    const saved = (await tx.get(ref)).data();
    if (saved?.leaseToken === token) tx.set(ref, {result, nextFetchAtMs: Date.now() + (result.stale ? 60000 : FRESH_MS), leaseUntilMs: 0}, {merge: true});
  });
  return result;
}
export async function handleFeeds(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send(""); return;
  }
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"}); return;
  }
  const identity = await authenticatedIdentity(req);
  if (!identity) {
    res.status(401).json({error: "Valid Firebase ID token required"}); return;
  }
  const urls = req.body?.urls;
  if (!Array.isArray(urls) || urls.length < 1 || urls.length > 12 || urls.some((url) => typeof url !== "string" || normalizeFeedUrl(url) !== url)) {
    res.status(400).json({error: "Choose up to twelve public HTTPS RSS or Atom feed URLs."}); return;
  }
  try {
    if (!await recordUserQuota(identity.userId, "feed_requests", 120, 60000)) {
      res.status(429).json({error: "Please wait before refreshing feeds again."}); return;
    }
    const feeds = await Promise.all([...new Set<string>(urls)].map((url) => cachedFeed(identity.userId, url)));
    res.status(200).json({feeds});
  } catch (error) {
    logSafeError("Feed refresh failed", error); res.status(503).json({error: "Could not load feeds. Try again later."});
  }
}
export const feedsHandler = onRequest({cors: true, maxInstances: 5, timeoutSeconds: 30}, handleFeeds);
