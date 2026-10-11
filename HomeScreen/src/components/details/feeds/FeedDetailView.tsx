import {useCallback, useRef, useState} from 'react';
import {Image, ScrollView, View} from 'react-native';
import Text from '../../shared/ReadingText';
import Option from '../../settings/appearance/AppearanceOption';
import {useFeeds} from '../../../context/FeedsContext';
import {useAppearance, useTheme} from '../../../theme/ThemeContext';
import {useDetailBackHandler, useDetailLayout} from '../../shared/DetailLayout';
import {PollJoinQR} from '../../dashboard/polls/PollParts';
import {companionSiteUrl} from '../../../services/companionSite';
import useTVClock from '../../../hooks/useTVClock';
import {feedAge, normalizeFeedUrl} from '../../../../../server/functions/src/utils/feedConfig';
import FeedSourcePicker from '../../shared/FeedSourcePicker';
import type {FeedArticle, FeedOptions} from '../../../../../server/functions/src/utils/feedConfig';

function ArticleView({article, source, back}: {article: FeedArticle; source: string; back: () => void}) {
  const theme = useTheme(); const {compact, twoColumns} = useDetailLayout();
  const scroll = useRef<ScrollView>(null); const offset = useRef(0);
  const [viewport, setViewport] = useState(0); const [contentHeight, setContentHeight] = useState(0);
  const [position, setPosition] = useState(0); const [imageFailed, setImageFailed] = useState(false);
  const image = article.imageUrl && normalizeFeedUrl(article.imageUrl);
  function page(direction: number) {
    const maximum = Math.max(0, contentHeight - viewport);
    let y = Math.max(0, Math.min(maximum, offset.current + direction * Math.max(80, viewport * .8)));
    // Focus borders can change the viewport by a couple of pixels between presses.
    if (y < 8) y = 0;
    else if (maximum - y < 8) y = maximum;
    offset.current = y; setPosition(y); scroll.current?.scrollTo({y, animated: false});
  }
  useDetailBackHandler(back);
  const ink = {color: theme.colors.textPrimary};
  const overflow = contentHeight > viewport + 2;
  return <View style={{flex: 1, gap: 12, padding: 8}}>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10}}>
      <Option label="Back to stories" onPress={back} compact/>
      {overflow && <><Option label="Page up" onPress={() => page(-1)} compact/><Option label="Page down" onPress={() => page(1)} compact/>
        <Text testID="feed-reading-position" style={{color: theme.colors.textSecondary, fontSize: 16}}>{position <= 1 ? 'Start of story' : position >= contentHeight - viewport - 2 ? 'End of story' : `${Math.round(position / Math.max(1, contentHeight - viewport) * 100)}% through story`}</Text></>}
    </View>
    <ScrollView ref={scroll} testID="feed-article-scroll" style={{flex: 1}} contentContainerStyle={{gap: 18, paddingBottom: 12}}
      onLayout={(event) => setViewport(event.nativeEvent.layout.height)} onContentSizeChange={(_, height) => setContentHeight(height)}
      scrollEventThrottle={100} onScroll={(event) => {offset.current = event.nativeEvent.contentOffset.y; setPosition(offset.current);}}>
    <Text style={[ink, {fontSize: compact ? 24 : 32, fontWeight: '700'}]}>{article.title}</Text>
    <Text style={{color: theme.colors.textSecondary, fontSize: compact ? 16 : 20}}>{source}{article.publishedAtMs ? ` · ${new Date(article.publishedAtMs).toLocaleString()}` : ''}</Text>
    <View style={{flexDirection: twoColumns ? 'row' : 'column', gap: 24}}>
      <View style={{flex: twoColumns ? 1 : undefined, gap: 18}}>
        {image && !imageFailed && <Image testID="feed-story-image" source={{uri: image}} resizeMode="contain" accessibilityLabel={`Image supplied with ${article.title}`}
          style={{width: '100%', height: compact ? 220 : 340, borderRadius: 10}} onError={() => setImageFailed(true)}/>}
        <Text style={[ink, {fontSize: compact ? 18 : 24, lineHeight: compact ? 27 : 34}]}>{article.content || article.summary || 'This feed provides a headline only. Read the full story on your phone.'}</Text>
        {article.contentTruncated && <Text style={{color: theme.colors.textSecondary, fontSize: 18}}>More text is available at the publisher. Scan the link to continue.</Text>}
      </View>
      {article.url && <PollJoinQR url={article.url} size={compact ? 180 : 240} label="Read full story on your phone"/>}
    </View>
    </ScrollView>
  </View>;
}
export default function FeedDetailView({widgetId}: {widgetId: string}) {
  const {appearance, ready, setWidgetLayout} = useAppearance(); const {feeds, loading, offline, refresh} = useFeeds();
  const theme = useTheme(); const {compact} = useDetailLayout(); const now = useTVClock();
  const [selectedId, setSelectedId] = useState(''); const [sourcesOpen, setSourcesOpen] = useState(false);
  const widget = appearance.widgetLayout?.widgets.find((item) => item.id === widgetId);
  const feed = widget?.feed; const result = feeds[feed?.url || ''];
  const selected = result?.articles.find((article) => article.id === selectedId);
  const back = useCallback(() => setSelectedId(''), []);
  if (selected) return <ArticleView key={selected.id} article={selected} source={result?.title || feed?.title || 'Feed'} back={back}/>;
  const sources = (appearance.widgetLayout?.widgets || []).filter((item) => item.feed).map((item) => item.feed!);
  function change(next: FeedOptions) {
    const layout = appearance.widgetLayout;
    if (!layout || !ready) return;
    setSelectedId(''); setWidgetLayout({...layout, widgets: layout.widgets.map((item) => item.id === widgetId ? {...item, feed: next} : item)});
    setSourcesOpen(false);
  }
  const stale = offline || result?.stale || !!result && now - result.updatedAtMs >= 30 * 60000;
  const companion = companionSiteUrl('/dashboard');
  return <ScrollView contentContainerStyle={{gap: compact ? 12 : 18, padding: 8}}>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
      <Option label={sourcesOpen ? 'Hide feed sources' : 'Choose feed source'} disabled={!ready} onPress={() => setSourcesOpen(!sourcesOpen)} compact/>
      <Option label="Refresh stories" disabled={loading} onPress={refresh} compact/>
      {feed && [3, 5, 8].map((count) => <Option key={count} label={`${count} headlines`} selected={feed.itemCount === count} disabled={!ready}
        onPress={() => change({...feed, itemCount: count as FeedOptions['itemCount']})} compact/>)}
    </View>
    {result && <Text style={{color: theme.colors.textSecondary, fontSize: 18}}>{result.title} · {new URL(result.url).hostname}</Text>}
    {sourcesOpen && <View style={{gap: 12}}><Text style={{color: theme.colors.textSecondary, fontSize: 18}}>Choose a preset or another source already on your dashboard.</Text>
      <FeedSourcePicker selectedUrl={feed?.url} saved={sources} disabled={!ready} onSelect={(source) => change({...source, itemCount: feed?.itemCount || 5})}/>
      <Text style={{color: theme.colors.textSecondary, fontSize: 18}}>Add custom URLs and rename feed widgets on the companion site.</Text>
      {companion && <PollJoinQR url={companion} size={180} label="Configure feeds on your phone"/>}
    </View>}
    {stale && <Text accessibilityRole="alert" style={{color: theme.colors.textSecondary, fontSize: 18}}>Stories may be out of date.{result?.updatedAtMs ? ` Last fetched ${feedAge(result.updatedAtMs, now)}.` : ''}</Text>}
    {result?.error && <Text style={{color: theme.colors.textSecondary, fontSize: 18}}>{result.error}</Text>}
    {!result && <Text style={{color: theme.colors.textPrimary, fontSize: 22}}>{loading ? 'Loading stories…' : 'Feed unavailable. It will retry automatically.'}</Text>}
    {result && !result.articles.length && !result.error && <Text style={{color: theme.colors.textPrimary, fontSize: 22}}>No stories published in this feed yet.</Text>}
    {result?.articles.map((article) => <Option key={article.id} label={article.title} subtitle={feedAge(article.publishedAtMs, now) || result.title} onPress={() => setSelectedId(article.id)} large/>)}
  </ScrollView>;
}
