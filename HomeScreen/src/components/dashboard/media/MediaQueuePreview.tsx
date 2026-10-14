import {View} from 'react-native';
import type {WatchNextItem} from '../../../hooks/useWatchNext';
import {useTheme} from '../../../theme/ThemeContext';
import Text from '../../shared/ReadingText';
import WatchPoster from '../../shared/WatchPoster';
import CardHeader from '../shared/CardHeader';
import CardProgress from '../shared/CardProgress';
import {cardTypography} from '../shared/cardContentLayout';
import type {mediaQueueLayout} from './mediaArtworkLayout';

interface Props {
  width: number;
  height: number;
  scale: number;
  items: WatchNextItem[];
  detail: string;
  progress: number | null;
  layout: ReturnType<typeof mediaQueueLayout>;
}

/** One focus target, with a quiet preview of the existing queue. */
export default function MediaQueuePreview({width, height, scale, items, detail, progress, layout}: Props) {
  const theme = useTheme();
  const type = cardTypography(height, scale);
  const {featuredWidth, queueWidth, gap, artHeight, artWidth, count, showTitles} = layout;
  const remaining = items.length - count - 1;
  return <View testID='adaptive-media' style={{width, height, flexDirection:'row', overflow:'hidden'}}>
    <View style={{width:featuredWidth, gap:type.gap}}>
      <CardHeader id='media' scale={scale} height={18 * scale}/>
      <View testID='card-hero' style={{flexDirection:'row', alignItems:'center', gap:type.gap}}>
        <View testID='media-art'><WatchPoster uri={items[0].posterUri} width={artWidth} height={artHeight}/></View>
        <View style={{flex:1, minWidth:0, gap:type.gap}}>
          <Text numberOfLines={height < 110 * scale ? 1 : 2} style={{color:theme.colors.textPrimary, fontSize:type.titleSize,
            lineHeight:type.titleSize * 1.2, fontWeight:'700'}}>{items[0].title}</Text>
          <Text numberOfLines={1} style={{color:theme.colors.textSecondary, fontSize:11 * scale,
            lineHeight:type.subtitleLine}}>{detail}</Text>
          {progress !== null && <View testID='media-progress' style={{maxWidth:220 * scale}}><CardProgress value={progress}/></View>}
        </View>
      </View>
    </View>
    <View style={{width:1, marginHorizontal:gap, backgroundColor:theme.colors.glassBorder}}/>
    <View testID='media-queue' style={{width:queueWidth, gap:type.gap}}>
      <View style={{height:18 * scale, flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
        <Text style={{color:theme.colors.textSecondary, fontSize:10 * scale, lineHeight:13 * scale}}>Up next</Text>
        {remaining > 0 && <Text testID='media-remaining' style={{color:theme.colors.textSecondary,
          fontSize:10 * scale, lineHeight:13 * scale}}>+{remaining} more</Text>}
      </View>
      <View style={{flexDirection:'row', gap:12 * scale}}>
        {items.slice(1, count + 1).map((item) => <View key={item.id} testID='media-queue-item'
          accessible accessibilityLabel={[item.title, item.appName].filter(Boolean).join(' · ')}
          style={{flex:1, minWidth:0, flexDirection:'row', gap:8 * scale, alignItems:'center',
            justifyContent:showTitles ? 'flex-start' : 'center'}}>
          <WatchPoster uri={item.posterUri} width={artWidth} height={artHeight}/>
          {showTitles && <Text testID='media-queue-title' numberOfLines={2} style={{flex:1, minWidth:0,
            color:theme.colors.textSecondary, fontSize:12 * scale, lineHeight:16 * scale}}>{item.title}</Text>}
        </View>)}
      </View>
    </View>
  </View>;
}
