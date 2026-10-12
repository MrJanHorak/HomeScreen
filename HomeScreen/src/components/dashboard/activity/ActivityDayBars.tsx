import Text from '../../shared/ReadingText';
import {View} from 'react-native';
import Svg, {Line} from 'react-native-svg';
import type {ActivityDay} from '../../../../../shared/src/types';
import {activityBarPercent} from '../../../helpers/activitySummary';
import {GOAL_OVERFLOW_COLOR} from '../../../helpers/goalProgress';
import {useTheme} from '../../../theme/ThemeContext';

const weekday = new Intl.DateTimeFormat('en-US', {weekday: 'short', timeZone: 'UTC'});

/** Keep the goal line aligned across a shared plot, separate from values and labels. */
export default function ActivityDayBars({weekly, peak, stepGoal = 0, width = 0, scale, compact = false, detailed = false}: {
  weekly: ActivityDay[]; peak: number; stepGoal?: number; width?: number; scale: number; compact?: boolean; detailed?: boolean;
}) {
  const theme = useTheme();
  const showValues = detailed || (!compact && width >= 235 * scale);
  const barWidth = detailed ? 14 : compact ? Math.min(10 * scale, width / Math.max(1, weekly.length * 2))
    : Math.max(8 * scale, Math.min(14 * scale, width / 22));
  const goalPercent = Math.min(100, Math.max(0, stepGoal / peak * 100));
  const labels = weekly.map(day => {
    const instant = new Date(`${day.date}T12:00:00Z`);
    return Number.isFinite(instant.getTime()) ? weekday.format(instant) : '—';
  });
  return <View testID={compact ? 'activity-mini-chart' : 'activity-day-bars'} style={{
    ...(detailed ? {height: 140} : compact ? {height: 34 * scale, width} : {flex: 1}),
    minHeight: 0, gap: (compact ? 2 : 4) * scale, paddingTop: compact ? 0 : 4 * scale}}>
    {showValues && <View style={{flexDirection: 'row', gap: 2 * scale}}>
      {weekly.map(day => <Text key={day.date} numberOfLines={1} style={{flex: 1, textAlign: 'center',
        color: detailed ? theme.colors.textPrimary : theme.colors.textSecondary,
        fontSize: (detailed ? 12 : 8) * scale, fontWeight: detailed ? '600' : '400', fontVariant: ['tabular-nums']}}>
        {!detailed && day.steps >= 10000 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps.toLocaleString()}
      </Text>)}
    </View>}
    <View testID='activity-chart-plot' style={{...(detailed ? {height: 90} : {flex: 1}), minHeight: 0, flexDirection: 'row', gap: 2 * scale}}>
      {weekly.map((day, index) => {
        const filled = Math.min(100, activityBarPercent(day.steps, peak));
        const extra = stepGoal > 0 && day.steps > stepGoal ? Math.max(0, filled - goalPercent) : 0;
        const over = stepGoal > 0 ? Math.max(0, day.steps - stepGoal) : 0;
        return <View key={day.date} testID='activity-day' accessible
          accessibilityLabel={`${labels[index]}, ${day.steps.toLocaleString()} steps${stepGoal > 0 ? `, ${over > 0 ? `${over.toLocaleString()} over` : `${Math.max(0, stepGoal - day.steps).toLocaleString()} to`} goal` : ''}`}
          style={{flex: 1, height: '100%', alignItems: 'center', minWidth: 0}}>
          <View style={{height: '100%', width: barWidth, borderRadius: barWidth / 2,
            backgroundColor: theme.colors.glassChip, overflow: 'hidden'}}>
            <View testID='activity-day-fill' style={{position: 'absolute', bottom: 0,
              height: `${filled}%`, width: '100%', borderRadius: barWidth / 2, backgroundColor: theme.colors.focusRing}} />
            {extra > 0 && <View testID='activity-day-overflow' style={{position: 'absolute', bottom: `${goalPercent}%`,
              height: `${extra}%`, width: '100%', backgroundColor: GOAL_OVERFLOW_COLOR,
              borderTopLeftRadius: barWidth / 2, borderTopRightRadius: barWidth / 2}} />}
          </View>
        </View>;
      })}
      {stepGoal > 0 && <View testID='activity-goal-line' pointerEvents='none' style={{
        position: 'absolute', left: 0, right: 0, bottom: `${goalPercent}%`, height: 1,
      }}><Svg width='100%' height={1}>
        <Line x1={0} y1={0.5} x2='100%' y2={0.5} stroke={theme.colors.textSecondary} strokeWidth={1} strokeDasharray='4 3' />
      </Svg></View>}
    </View>
    <View style={{flexDirection: 'row', gap: 2 * scale}}>
      {weekly.map((day, index) => <Text key={day.date} numberOfLines={1} style={{flex: 1, textAlign: 'center',
        color: theme.colors.textSecondary, fontSize: (detailed ? 13 : compact ? 8 : 9) * scale,
        ...(compact ? {lineHeight: 10 * scale} : {})}}>{detailed ? labels[index] : labels[index].slice(0, 2)}</Text>)}
    </View>
  </View>;
}
