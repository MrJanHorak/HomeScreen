import {useState} from 'react';
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
  const articles = (result?.articles || []).slice(0, widget.feed?.itemCount || 5);
  const key = JSON.stringify([width, scale, theme.reading, theme.fontsReady, articles.map((article) => article.title)]);
  const [measurement, setMeasurement] = useState<{key: string; heights: number[]}>({key: '', heights: []});
  const plan = feedCardLayout(width, height, scale, articles.length, measurement.key === key ? measurement.heights : []);
  const stale = offline || result?.stale || !!result && now - result.updatedAtMs >= 30 * 60000;
  const status = loading && !articles.length ? 'Loading stories…' : result?.error && !articles.length ? result.error :
    !result ? 'Feed unavailable. Open details to retry.' : !articles.length ? 'No stories published yet.' : '';
  const titleStyle = {color: theme.colors.textPrimary, fontSize: plan.fontSize, lineHeight: plan.lineHeight, fontWeight: '600' as const};
  return <View testID="adaptive-feed" style={{width, height, overflow: 'hidden', gap: plan.gap}}>
    <CardHeader id="feed" title={widget.feed?.title || 'Feed'} scale={scale} height={plan.headerHeight} badge={stale ? 'Saved' : 'RSS'}/>
    {status ? <Text numberOfLines={Math.max(1, Math.floor((height - plan.headerHeight - plan.gap) / plan.lineHeight))} style={{color: theme.colors.textSecondary, fontSize: plan.fontSize, lineHeight: plan.lineHeight}}>{status}</Text> :
      <View style={{gap: plan.gap}}>{plan.heights.map((rowHeight, row) => <View key={row} style={{flexDirection: 'row', gap: 18 * scale}}>
        {articles.slice(row * plan.columns, Math.min((row + 1) * plan.columns, plan.count)).map((article) => <View key={article.id} testID="feed-headline" style={{width: plan.columnWidth, minHeight: rowHeight, gap: 2 * scale}}>
          <Text numberOfLines={plan.lines} style={titleStyle}>{article.title}</Text>
          {!plan.dense && <Text numberOfLines={1} style={{color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 12 * scale}}>{feedAge(article.publishedAtMs, now) || result?.title}</Text>}
          {plan.excerptLines[row] > 0 && article.summary && <Text numberOfLines={plan.excerptLines[row]} style={{marginTop: 2 * scale, color: theme.colors.textSecondary, fontSize: 13 * scale, lineHeight: 17 * scale}}>{article.summary}</Text>}
        </View>)}
      </View>)}</View>}
    {!status && <Text testID="feed-footer" numberOfLines={1} style={{position: 'absolute', bottom: 0, color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 14 * scale}}>
      {stale ? 'Saved · ' : ''}{plan.count < articles.length ? `${plan.count}/${articles.length} stories · ` : ''}Select for stories and sources
    </Text>}
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={{position: 'absolute', width: plan.columnWidth, opacity: 0}}>
      {articles.map((article, index) => <Text key={article.id} numberOfLines={2} style={titleStyle} onLayout={(event) => {
        const measured = event.nativeEvent.layout.height;
        setMeasurement((current) => {const heights = current.key === key ? current.heights : [];
          if (Math.abs((heights[index] || 0) - measured) < .5) return current;
          const next = [...heights]; next[index] = measured; return {key, heights: next};});
      }}>{article.title}</Text>)}
    </View>
  </View>;
}
