import {createContext, useContext, useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import {AppState} from 'react-native';
import {loadFeedCache, saveFeedCache} from '../services/feedCache';
import {fetchFeeds} from '../services/api';
import {useAuth} from './AuthContext';
import {useAppearance} from '../theme/ThemeContext';
import type {FeedResult} from '../../../server/functions/src/utils/feedConfig';

interface FeedStore {feeds: Record<string, FeedResult>; loading: boolean; offline: boolean; refresh: () => void}
const empty: FeedStore = {feeds: {}, loading: true, offline: false, refresh: () => undefined};
const FeedsContext = createContext<FeedStore>(empty);
const FeedVisibilityContext = createContext<(visible: boolean) => void>(() => undefined);
export const useFeeds = () => useContext(FeedsContext);
export const useFeedVisibility = () => useContext(FeedVisibilityContext);
export function FeedsProvider({children}: {children: ReactNode}) {
  const {user} = useAuth(); const uid = user?.uid;
  const {appearance, ready} = useAppearance(); const [visible, setVisible] = useState(true);
  const [store, setStore] = useState<FeedStore>(empty);
  const [owner, setOwner] = useState<string | undefined>(undefined);
  const [revision, setRevision] = useState(0);
  const urlsKey = JSON.stringify([...new Set((appearance.widgetLayout?.widgets || []).filter((w) => w.visible && w.kind === 'feed' && w.feed).map((w) => w.feed!.url))].sort());
  useEffect(() => {
    let active = true; let pending = false; let failures = 0;
    let lastFeeds: Record<string, FeedResult> = {};
    let timer: ReturnType<typeof setTimeout> | undefined; let controller: AbortController | undefined;
    if (!uid || !ready || !visible) return;
    const urls = JSON.parse(urlsKey) as string[];
    setStore(empty); setOwner(uid);
    if (!urls.length) {setStore({...empty, loading: false}); return;}
    async function refresh() {
      if (!active || pending || AppState.currentState === 'background') return;
      pending = true; controller = new AbortController(); const timeout = setTimeout(() => controller?.abort(), 25000);
      try {
        const result = await fetchFeeds(urls, controller.signal); if (!active) return;
        const feeds = Object.fromEntries(result.feeds.filter((feed) => urls.includes(feed.url)).map((feed) =>
          [feed.url, feed.stale && !feed.articles.length && lastFeeds[feed.url]?.articles.length ? {...lastFeeds[feed.url], stale: true, error: feed.error} : feed]));
        lastFeeds = feeds; setStore({...empty, feeds, loading: false, offline: false});
        failures = result.feeds.some((feed) => feed.stale) ? 1 : 0;
        await saveFeedCache(uid!, feeds);
      } catch {
        if (active) {failures++; setStore((previous) => ({...previous, loading: false, offline: true}));}
      } finally {
        clearTimeout(timeout); pending = false;
        if (active) timer = setTimeout(() => void refresh(), failures ? Math.min(15 * 60000, 60000 * 2 ** (failures - 1)) : 15 * 60000);
      }
    }
    void (async () => {
      try {
        const cached = await loadFeedCache(uid!);
        if (active) {
          lastFeeds = Object.fromEntries(urls.filter((url) => cached[url] && Array.isArray(cached[url].articles))
            .map((url) => [url, {...cached[url], stale: true}]));
          setStore({...empty, feeds: lastFeeds, loading: true, offline: false});
        }
      } catch { /* The network can recover an unreadable local cache. */ }
      await refresh();
    })();
    const sub = AppState.addEventListener('change', (state) => {clearTimeout(timer); if (state === 'active') void refresh();});
    return () => {active = false; clearTimeout(timer); controller?.abort(); sub.remove();};
  }, [uid, ready, urlsKey, visible, revision]);
  return <FeedVisibilityContext.Provider value={setVisible}><FeedsContext.Provider value={{...(owner === uid ? store : empty), refresh: () => setRevision((value) => value + 1)}}>{children}</FeedsContext.Provider></FeedVisibilityContext.Provider>;
}
