const {test} = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns/promises');
const https = require('node:https');
const {EventEmitter} = require('node:events');
const {parseFeed, publicFeedAddress, downloadFeed, articleUrl} = require('../lib/services/feedService');
const {normalizeFeedUrl, FEED_PRESETS, FEED_CATEGORIES, FEED_CATALOG, validFeedOptions} = require('../lib/utils/feedConfig');
const {validWidgetLayout, legacyWidgetProjection} = require('../lib/utils/widgets');
const {auth, db} = require('../lib/utils/db');
const service = require('../lib/services/feedService');
const {cachedFeed, handleFeeds} = require('../lib/feeds');
const url = FEED_PRESETS[0].url;
const feed = {url, title: 'World', itemCount: 5};
const widget = (letter) => ({id: `feed_${letter.repeat(32)}`, kind: 'feed', feed, visible: true, size: 'standard'});

test('RSS, Atom and RDF normalize text, links, dates, duplicates and empty feeds', () => {
  const rss = parseFeed(`<rss><channel><title>News &amp; Science</title><item><title>First &amp; foremost</title><description><![CDATA[<p>Hello &copy;</p><script>alert(1)</script>]]></description><link>/story</link><pubDate>Sat, 10 Oct 2026 12:00:00 GMT</pubDate></item><item><title>Duplicate</title><link>/story</link></item><item><title>No safe link</title><link>javascript:alert(1)</link><pubDate>bad date</pubDate></item></channel></rss>`, url);
  assert.equal(rss.title, 'News & Science'); assert.equal(rss.articles.length, 2);
  assert.equal(rss.articles[0].summary, 'Hello ©'); assert.equal(rss.articles[0].url, 'https://feeds.bbci.co.uk/story');
  assert.equal(rss.articles[1].url, null); assert.equal(rss.articles[1].publishedAtMs, null);
  const atom = parseFeed(`<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><entry><id>1</id><title type="html">&lt;b&gt;Headline&lt;/b&gt;</title><link rel="self" href="/entry.xml"/><link rel="alternate" href="/article?a=1&amp;b=2"/><summary>Useful summary</summary></entry></feed>`, url);
  assert.equal(atom.articles[0].title, 'Headline'); assert.equal(atom.articles[0].url, 'https://feeds.bbci.co.uk/article?a=1&b=2');
  const xhtml = parseFeed('<feed><title>Atom</title><entry><title>XHTML summary</title><content type="xhtml"><div><p>Hello <b>reader</b></p><script>bad()</script></div></content></entry></feed>', url);
  assert.equal(xhtml.articles[0].summary, 'Hello reader');
  assert.equal(parseFeed('<rss><channel><title>Empty</title></channel></rss>', url).articles.length, 0);
  assert.equal(parseFeed('<rdf:RDF xmlns:rdf="urn:rdf"><channel><title>RDF</title></channel><item><title>RDF story</title></item></rdf:RDF>', url).articles[0].title, 'RDF story');
  for (const xml of ['<html>Website</html>', '<rss><channel></rss>', '<!DOCTYPE rss [<!ENTITY evil "hi">]><rss><channel/></rss>', '<rss>'+ 'x'.repeat(1024*1024) +'</rss>']) assert.throws(() => parseFeed(xml, url));
});
test('custom URL validation and DNS guards reject internal targets and redirects', async (t) => {
  for (const value of ['http://news.com/rss', 'https://user:pass@news.com/rss', 'https://localhost/rss', 'https://127.1/rss', 'https://[::1]/rss', 'https://news.com:8443/rss', 'https://host.internal/rss']) assert.equal(normalizeFeedUrl(value), null);
  assert.equal(normalizeFeedUrl(' https://news.com/rss?category=tech#part '), 'https://news.com/rss?category=tech');
  for (const ip of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '100.64.0.1', '192.168.1.1', '0.0.0.0', '224.0.0.1', '::1', 'fc00::1', '::ffff:127.0.0.1', '2002:7f00:1::', '2001:db8::1', '3fff::1']) assert.equal(publicFeedAddress(ip), false, ip);
  assert.equal(publicFeedAddress('8.8.8.8'), true); assert.equal(publicFeedAddress('2606:4700::1111'), true);
  t.mock.method(dns, 'lookup', async () => [{address: '169.254.169.254', family: 4}]);
  await assert.rejects(downloadFeed('https://public.example.org/feed'), /public HTTPS/);
  await assert.rejects(downloadFeed('https://public.example.org/feed', 4));
  assert.equal(articleUrl('file:///etc/passwd', url), null); assert.equal(articleUrl('https://192.168.1.1/', url), null);
});

test('preset categories are complete, unique and produce valid persisted options', () => {
  assert.equal(FEED_PRESETS.length, 24); assert.equal(new Set(FEED_PRESETS.map((source) => source.url)).size, 24);
  for (const category of FEED_CATEGORIES) assert.ok(FEED_CATALOG.some((source) => source.category === category));
  for (const source of FEED_PRESETS) assert.ok(validFeedOptions({...source, itemCount: 8}));
});

test('feed images and richer text preserve paragraphs, reject unsafe media and bound content', () => {
  const rss = parseFeed(`<rss xmlns:content="urn:content" xmlns:media="urn:media"><channel><title>Rich</title>
    <item><title>Full story</title><link>https://news.example.org/story</link><description>Short teaser</description>
      <content:encoded><![CDATA[<p>First paragraph with <b>bold</b>.</p><p>Second paragraph.</p><script>bad()</script>]]></content:encoded>
      <media:content url="https://images.example.org/large.jpg" medium="image"/></item>
    <item><title>Enclosure</title><enclosure url="https://images.example.org/photo.png" type="image/png"/></item>
    <item><title>Group</title><media:group><media:thumbnail url="https://images.example.org/thumb.jpg"/></media:group></item>
    <item><title>HTML image</title><description><![CDATA[<img src="https://images.example.org/pixel.gif" width="1"><img src="/photo.jpg"><p>Some text</p>]]></description></item>
    <item><title>Unsafe</title><media:thumbnail url="https://127.0.0.1/image.jpg"/><description><![CDATA[<img src="http://images.example.org/insecure.jpg">]]></description></item>
    <item><title>Long text</title><description>${'Word '.repeat(5000)}</description></item>
    </channel></rss>`, url);
  const [full, enclosure, group, html, unsafe, long] = rss.articles;
  assert.equal(full.summary, 'Short teaser'); assert.equal(full.content, 'First paragraph with bold .\n\nSecond paragraph.');
  assert.equal(full.imageUrl, 'https://images.example.org/large.jpg'); assert.equal(enclosure.imageUrl, 'https://images.example.org/photo.png');
  assert.equal(group.imageUrl, 'https://images.example.org/thumb.jpg'); assert.equal(html.imageUrl, 'https://feeds.bbci.co.uk/photo.jpg');
  assert.equal(unsafe.imageUrl, null); assert.equal(long.content.length, 12000); assert.equal(long.contentTruncated, true);
  const atom = parseFeed('<feed><title>Atom</title><entry><title>Photo</title><link rel="enclosure" type="image/jpeg" href="/photo.jpg"/><content type="html">&lt;p&gt;Longer body&lt;/p&gt;</content></entry></feed>', url);
  assert.equal(atom.articles[0].imageUrl, 'https://feeds.bbci.co.uk/photo.jpg'); assert.equal(atom.articles[0].content, 'Longer body');
  const many = parseFeed(`<rss><channel>${Array.from({length: 30}, (_, i) => `<item><title>${i}</title><description>${'宇宙'.repeat(5000)}</description></item>`).join('')}</channel></rss>`, url);
  assert.ok(many.articles.reduce((bytes, article) => bytes + Buffer.byteLength(article.content), 0) <= 240000);
});
test('HTTPS sockets pin the checked address and redirects recheck DNS before another request', async (t) => {
  const requests=[];
  t.mock.method(dns, 'lookup', async (hostname) => [{address: hostname === 'private.example.org' ? '127.0.0.1' : '8.8.8.8', family:4}]);
  t.mock.method(https, 'request', (target, options, received) => {
    requests.push(target.href); assert.equal(target.hostname, 'public.example.org'); assert.equal(options.agent, false);
    options.lookup(target.hostname, {}, (error, address, family) => {assert.equal(error, null); assert.equal(address, '8.8.8.8'); assert.equal(family, 4);});
    const req = new EventEmitter(); req.end = () => {
      const res = new EventEmitter(); res.statusCode=302; res.headers={location:'https://private.example.org/feed'}; res.resume=()=>{};
      received(res); req.emit('close');
    }; req.destroy=(error)=>{req.emit('error',error);req.emit('close');}; return req;
  });
  await assert.rejects(downloadFeed('https://public.example.org/feed'), /public HTTPS/); assert.equal(requests.length, 1);
});
test('multiple independent feed instances retain configuration and safe legacy fallbacks', () => {
  const layout = {version: 1, grid: null, widgets: [widget('a'), widget('b')]};
  assert.equal(validWidgetLayout(layout), true); assert.equal(legacyWidgetProjection(layout).cards[0].visible, true);
  for (const changes of [{feed: {...feed, itemCount: 99}}, {feed: {...feed, url: null}}, {feed: {...feed, title: '<script>'}}, {personId: 'c'.repeat(32)}, {id: 'feed_x'}, {kind: 'weather'}]) assert.equal(validWidgetLayout({...layout, widgets: [{...widget('a'), ...changes}]}), false);
});
function database(t) {
  const rows = new Map(); const ref = (path) => ({path, doc: (id) => ref(`${path}/${id}`), collection: (id) => ref(`${path}/${id}`),
    get: async () => ({exists: rows.has(path), data: () => rows.get(path)}), update: async (data) => rows.set(path, {...rows.get(path), ...data})});
  t.mock.method(db, 'collection', ref);
  t.mock.method(db, 'runTransaction', async (fn) => fn({get: async (r) => ({data: () => rows.get(r.path)}), set: (r, data, options) => rows.set(r.path, options?.merge ? {...rows.get(r.path), ...data} : data)}));
  return rows;
}
test('cached stories survive publisher failure, repeated requests reuse cache, and leases avoid duplicate downloads', async (t) => {
  const rows = database(t); let calls = 0;
  t.mock.method(service, 'downloadFeed', async () => {calls++; return {url, xml: '<rss><channel><title>World</title><item><title>A story</title></item></channel></rss>'};});
  const fresh = await cachedFeed('owner', url); assert.equal(fresh.stale, false);
  assert.deepEqual(await cachedFeed('owner', url), fresh); assert.equal(calls, 1);
  const cache = [...rows.entries()].find(([key]) => key.includes('/feedCache/'))[1]; cache.nextFetchAtMs = 0;
  t.mock.method(service, 'downloadFeed', async () => {calls++; throw new Error('publisher down');});
  const saved = await cachedFeed('owner', url); assert.equal(saved.stale, true); assert.deepEqual(saved.articles, fresh.articles); assert.equal(saved.updatedAtMs, fresh.updatedAtMs);
  await cachedFeed('owner', url); assert.equal(calls, 2);
  const current = [...rows.entries()].find(([key]) => key.includes('/feedCache/'))[1]; current.leaseUntilMs = Date.now()+15000; current.nextFetchAtMs = 0;
  await cachedFeed('owner', url); assert.equal(calls, 2);
});
test('feed API requires authentication, validates every URL and deduplicates downloads', async (t) => {
  const rows=database(t); const deviceId='d'.repeat(32);
  rows.set(`users/owner/devices/${deviceId}`, {revokedAtMs:0, lastSeenAtMs:Date.now()});
  t.mock.method(auth, 'verifyIdToken', async (token) => ({uid: 'owner', ...(token==='tv' && {dashboardDeviceId:deviceId}), firebase: {sign_in_provider: token==='tv' ? 'custom' : 'google.com'}}));
  t.mock.method(service, 'downloadFeed', async () => ({url, xml: '<rss><channel><title>World</title></channel></rss>'}));
  const response = () => ({code: 0, body: null, set() {}, send() {}, status(code) {this.code=code;return this;}, json(body) {this.body=body;}});
  const req = {method: 'POST', headers: {authorization: 'Bearer owner'}, body: {urls: [url, url]}};
  const ok=response(); await handleFeeds(req, ok); assert.equal(ok.code, 200); assert.equal(ok.body.feeds.length, 1);
  const tv=response(); await handleFeeds({...req, headers:{authorization:'Bearer tv'}}, tv); assert.equal(tv.code,200);
  rows.get(`users/owner/devices/${deviceId}`).revokedAtMs=Date.now();
  const revoked=response(); await handleFeeds({...req, headers:{authorization:'Bearer tv'}}, revoked); assert.equal(revoked.code,401);
  const unsigned=response(); await handleFeeds({...req, headers: {}}, unsigned); assert.equal(unsigned.code, 401);
  for (const urls of [[null], [], Array(13).fill(url), ['http://news.com/rss']]) {const bad=response(); await handleFeeds({...req, body:{urls}},bad);assert.equal(bad.code,400);}
});
