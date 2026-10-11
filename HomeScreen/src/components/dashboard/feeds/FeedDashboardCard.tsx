import {View} from 'react-native';
import Text from '../../shared/ReadingText';
import CardHeader from '../shared/CardHeader';
import {useFeeds} from '../../../context/FeedsContext';
import {useTheme} from '../../../theme/ThemeContext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import useTVClock from '../../../hooks/useTVClock';
import type {Widget} from '../../../../../server/functions/src/utils/widgets';
import {feedAge} from '../../../../../server/functions/src/utils/feedConfig';
import {feedCardLayout} from './feedCardLayout';

export default function FeedDashboardCard({widget, width, height}: {widget: Widget; width: number; height: number}) {
  const {feeds, loading, offline} = useFeeds(); const result = feeds[widget.feed?.url || ''];
  const theme = useTheme(); const now = useTVClock(); const scale = useCompactTVLayout() ? 1 : 1.4;
  const plan = feedCardLayout(width, height, scale, widget.feed?.itemCount || 5);
  const stale = offline || result?.stale || !!result && now - result.updatedAtMs >= 30 * 60000;
  const articles = result?.articles || [];
  const status = loading && !articles.length ? 'Loading stories…' : result?.error && !articles.length ? result.error :
    !result ? 'Feed unavailable. Open details to retry.' : !articles.length ? 'No stories published yet.' : '';
  return <View testID="adaptive-feed" style={{width, height, overflow: 'hidden', gap: plan.gap}}>
    <CardHeader id="feed" title={widget.feed?.title || 'Feed'} scale={scale} height={plan.headerHeight} badge={stale ? 'Saved' : 'RSS'}/>
    {status ? <Text numberOfLines={Math.max(1, Math.floor((height - plan.headerHeight - plan.gap) / plan.lineHeight))} style={{color: theme.colors.textSecondary, fontSize: plan.fontSize, lineHeight: plan.lineHeight}}>{status}</Text> :
      <View style={{gap: plan.gap}}>{articles.slice(0, plan.rows).map((article) => <View key={article.id} testID="feed-headline" style={{height: plan.rowHeight - plan.gap, gap: 2 * scale}}>
        <Text numberOfLines={plan.lines} style={{color: theme.colors.textPrimary, fontSize: plan.fontSize, lineHeight: plan.lineHeight, fontWeight: '600'}}>{article.title}</Text>
        <Text numberOfLines={1} style={{color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 12 * scale}}>{feedAge(article.publishedAtMs, now) || result?.title}</Text>
      </View>)}</View>}
    {plan.footerHeight > 0 && !status && <Text numberOfLines={1} style={{position: 'absolute', bottom: 0, color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 14 * scale}}>
      {stale ? 'Stories may be out of date · ' : ''}Select for stories and sources
    </Text>}
  </View>;
}
