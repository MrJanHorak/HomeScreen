import {useCallback, useState} from 'react';
import {ScrollView, View} from 'react-native';
import Text from '../../shared/ReadingText';
import Option from '../../settings/appearance/AppearanceOption';
import {useFeeds} from '../../../context/FeedsContext';
import {useAppearance, useTheme} from '../../../theme/ThemeContext';
import {useDetailBackHandler, useDetailLayout} from '../../shared/DetailLayout';
import {PollJoinQR} from '../../dashboard/polls/PollParts';
import {companionSiteUrl} from '../../../services/companionSite';
import useTVClock from '../../../hooks/useTVClock';
import {FEED_PRESETS, feedAge} from '../../../../../server/functions/src/utils/feedConfig';
import type {FeedArticle, FeedOptions} from '../../../../../server/functions/src/utils/feedConfig';

function ArticleView({article, source, back}: {article: FeedArticle; source: string; back: () => void}) {
  const theme = useTheme(); const {compact, twoColumns} = useDetailLayout();
  useDetailBackHandler(back);
  const ink = {color: theme.colors.textPrimary};
  return <ScrollView contentContainerStyle={{gap: 18, padding: 8}}>
    <Option label="Back to stories" onPress={back} compact/>
    <Text style={[ink, {fontSize: compact ? 24 : 32, fontWeight: '700'}]}>{article.title}</Text>
    <Text style={{color: theme.colors.textSecondary, fontSize: compact ? 16 : 20}}>{source}{article.publishedAtMs ? ` · ${new Date(article.publishedAtMs).toLocaleString()}` : ''}</Text>
    <View style={{flexDirection: twoColumns ? 'row' : 'column', gap: 24}}>
      <Text style={[ink, {flex: twoColumns ? 1 : undefined, fontSize: compact ? 18 : 24, lineHeight: compact ? 27 : 34}]}>{article.summary || 'This feed provides a headline only. Read the full story on your phone.'}</Text>
      {article.url && <PollJoinQR url={article.url} size={compact ? 180 : 240} label="Read full story on your phone"/>}
    </View>
  </ScrollView>;
}
export default function FeedDetailView({widgetId}: {widgetId: string}) {
  const {appearance, ready, setWidgetLayout} = useAppearance(); const {feeds, loading, offline, refresh} = useFeeds();
  const theme = useTheme(); const {compact} = useDetailLayout(); const now = useTVClock();
  const [selectedId, setSelectedId] = useState(''); const [sourcesOpen, setSourcesOpen] = useState(false);
  const widget = appearance.widgetLayout?.widgets.find((item) => item.id === widgetId);
  const feed = widget?.feed; const result = feeds[feed?.url || ''];
  const selected = result?.articles.find((article) => article.id === selectedId);
  const back = useCallback(() => setSelectedId(''), []);
  if (selected) return <ArticleView article={selected} source={result?.title || feed?.title || 'Feed'} back={back}/>;
  const sources = [...FEED_PRESETS, ...(appearance.widgetLayout?.widgets || []).filter((item) => item.feed).map((item) => item.feed!)];
  const unique = sources.filter((source, index) => sources.findIndex((item) => item.url === source.url) === index);
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
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>{unique.map((source) => <Option key={source.url} label={source.title} selected={source.url === feed?.url} disabled={!ready}
        onPress={() => change({...source, itemCount: feed?.itemCount || 5})} compact/>)}</View>
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
