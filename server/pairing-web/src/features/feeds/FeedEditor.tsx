import {useEffect, useState} from 'react';
import {FEED_PRESETS, FEED_CATALOG, FEED_CATEGORIES, normalizeFeedUrl, validFeedOptions, feedAge} from '../../../../functions/src/utils/feedConfig';
import type {FeedOptions, FeedResponse, FeedResult} from '../../../../functions/src/utils/feedConfig';
import type {PollRequest} from '../polls/pollApi';
import './feeds.css';

export function FeedEditor({feed, request, busy, apply, actionLabel}: {
  feed?: FeedOptions; request: PollRequest; busy: boolean; apply: (feed: FeedOptions) => void; actionLabel: string;
}) {
  const [draft, setDraft] = useState<FeedOptions>(feed || {...FEED_PRESETS[0], itemCount: 5});
  const [preview, setPreview] = useState<FeedResult | null>(null);
  const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => {if (feed) {setDraft(feed); setPreview(null); setMessage('');}}, [feed?.url, feed?.title, feed?.itemCount]);
  const preset = FEED_PRESETS.find((item) => item.url === draft.url);
  function options(): FeedOptions | null {
    const url = normalizeFeedUrl(draft.url); const next = {...draft, url: url || '', title: draft.title.trim()};
    if (!validFeedOptions(next)) {setMessage('Enter a public HTTPS feed URL and a title of 1–80 characters.'); return null;}
    setMessage(''); return next;
  }
  async function loadPreview() {
    const next = options(); if (!next) return;
    setLoading(true); setPreview(null);
    try {const result = await request<FeedResponse>('feeds', 'POST', {urls: [next.url]}); setPreview(result.feeds[0] || null);}
    catch (error) {setMessage(error instanceof Error ? error.message : 'Could not preview this feed.');}
    finally {setLoading(false);}
  }
  const pending = feed && JSON.stringify(draft) !== JSON.stringify(feed);
  return <div className="feed-editor">
    <div className="widget-fields">
      <label>Feed source<select aria-label="Feed source" disabled={busy || loading} value={preset?.url || 'custom'} onChange={(e) => {
        const source = FEED_PRESETS.find((item) => item.url === e.target.value);
        setDraft({...draft, ...(source || {url: '', title: 'My feed'})}); setPreview(null); setMessage('');
      }}>{FEED_CATEGORIES.map((category) => <optgroup key={category} label={category}>{FEED_CATALOG.filter((source) => source.category === category).map((source) => <option key={source.url} value={source.url}>{source.title}</option>)}</optgroup>)}<option value="custom">Custom RSS or Atom URL</option></select></label>
      {!preset && <label>Feed URL<input aria-label="Feed URL" type="url" disabled={busy || loading} placeholder="https://publisher.com/feed" value={draft.url} onChange={(e) => {setDraft({...draft, url: e.target.value}); setPreview(null);}}/></label>}
      <label>Widget title<input aria-label="Widget title" maxLength={80} disabled={busy || loading} value={draft.title} onChange={(e) => setDraft({...draft, title: e.target.value})}/></label>
      <label>Stories to show<select aria-label="Stories to show" disabled={busy || loading} value={draft.itemCount} onChange={(e) => setDraft({...draft, itemCount: Number(e.target.value) as FeedOptions['itemCount']})}>
        {[3, 5, 8].map((count) => <option key={count} value={count}>{count} stories</option>)}
      </select></label>
    </div>
    <p className="field-hint">Choose by category, including news from different publishers and regions. Cards fit up to your selected count; wider cards use columns and larger cards show summaries. Open a story on TV for feed-provided images and text. Feeds refresh every 15 minutes.</p>
    {pending && <p className="field-hint">Apply these feed settings to your draft before Save to TV.</p>}
    <div className="widget-add-controls"><button type="button" className="button button-secondary" disabled={busy || loading} onClick={() => void loadPreview()}>{loading ? 'Loading preview…' : 'Preview feed'}</button>
      <button type="button" className="button button-primary" disabled={busy || loading} onClick={() => {const next = options(); if (next) apply(next);}}>{actionLabel}</button></div>
    {message && <p role="alert" className="status" data-kind="error">{message}</p>}
    {preview && <div className="feed-preview" role="region" aria-label="Feed preview"><h3>{preview.title}</h3>
      {preview.error && <p role="status">{preview.error}</p>}
      {!preview.error && !preview.articles.length && <p>No stories published in this feed yet.</p>}
      <ul>{preview.articles.slice(0, draft.itemCount).map((article) => <li key={article.id}>
        {article.imageUrl && normalizeFeedUrl(article.imageUrl) && <img className="feed-preview-image" src={article.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => {event.currentTarget.hidden = true;}}/>}
        <div>{article.url ? <a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a> : article.title}{article.publishedAtMs && <small> · {feedAge(article.publishedAtMs)}</small>}
          {article.summary && <p className="feed-preview-summary">{article.summary}</p>}
          {article.content && article.content !== article.summary && <details><summary>Read feed text</summary><div className="feed-preview-text">{article.content}</div></details>}
        </div>
      </li>)}</ul>
      {preview.updatedAtMs > 0 && <p className="field-hint">{preview.stale ? 'Saved stories · ' : ''}Last fetched {feedAge(preview.updatedAtMs)}</p>}
    </div>}
  </div>;
}
