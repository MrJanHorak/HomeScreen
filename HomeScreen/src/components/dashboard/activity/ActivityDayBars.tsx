import {Text, View} from 'react-native';
import type {ActivityDay} from '../../../../../shared/src/types';
import {activityBarPercent} from '../../../helpers/activitySummary';
import {useTheme} from '../../../theme/ThemeContext';

const weekday = new Intl.DateTimeFormat('en-US', {weekday:'short', timeZone:'UTC'});

/** The same supplied-day bars serve the full chart and the compact weekly overview. */
export default function ActivityDayBars({weekly, peak, width, scale, compact = false}: {
  weekly:ActivityDay[]; peak:number; width:number; scale:number; compact?:boolean;
}) {
  const theme = useTheme();
  const showValues = !compact && width >= 235 * scale;
  const barWidth = compact ? Math.min(10 * scale, width / Math.max(1, weekly.length * 2))
    : Math.max(8 * scale, Math.min(14 * scale, width / 22));
  return <View testID={compact ? 'activity-mini-chart' : 'activity-day-bars'} style={{
    ...(compact ? {height:34 * scale, width} : {flex:1}), minHeight:0,
    flexDirection:'row', alignItems:'flex-end', gap:2 * scale, paddingTop:compact ? 0 : 4 * scale}}>
    {weekly.map(day => {
      const instant = new Date(`${day.date}T12:00:00Z`);
      const label = Number.isFinite(instant.getTime()) ? weekday.format(instant) : '—';
      return <View key={day.date} testID='activity-day' accessible accessibilityLabel={`${label}, ${day.steps.toLocaleString()} steps`}
        style={{flex:1, height:'100%', alignItems:'center', minWidth:0, gap:(compact ? 2 : 4) * scale}}>
        {showValues && <Text numberOfLines={1} style={{color:theme.colors.textSecondary, fontSize:8 * scale, fontVariant:['tabular-nums']}}>
          {day.steps >= 10000 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps.toLocaleString()}
        </Text>}
        <View style={{flex:1, minHeight:0, width:barWidth, borderRadius:barWidth / 2,
          backgroundColor:theme.colors.glassChip, justifyContent:'flex-end', overflow:'hidden'}}>
          <View testID='activity-day-fill' style={{height:`${activityBarPercent(day.steps, peak)}%`, width:'100%',
            borderRadius:barWidth / 2, backgroundColor:theme.colors.focusRing}} />
        </View>
        <Text numberOfLines={1} style={{color:theme.colors.textSecondary, fontSize:(compact ? 8 : 9) * scale,
          ...(compact ? {lineHeight:10 * scale} : {})}}>{label.slice(0, 2)}</Text>
      </View>;
    })}
  </View>;
}
