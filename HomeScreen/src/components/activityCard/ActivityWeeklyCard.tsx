import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Activity, ActivityDay } from '../../../../shared/src/types';
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';
import TVProgressRing from './TVProgressRing';
import ActivityStats from './ActivityStats';

export function ActivityWeeklySummary({weekly, scale, showAverage = true}: {
  weekly: ActivityDay[]; scale: number; showAverage?: boolean;
}) {
  const theme = useTheme();
  const total = weekly.reduce((sum, day) => sum + day.steps, 0);
  return <View testID="activity-weekly-summary" style={{borderTopWidth: 1, borderColor: theme.colors.glassBorder,
    paddingTop: 7 * scale, gap: 2 * scale, flexShrink: 0}}>
    <Text numberOfLines={1} style={{color: theme.colors.textSecondary, fontSize: 11 * scale, lineHeight: 14 * scale}}>Last 7 days</Text>
    <Text numberOfLines={1} style={{color: theme.colors.textPrimary, fontSize: 14 * scale, lineHeight: 18 * scale, fontWeight: '700'}}>{total.toLocaleString()} steps</Text>
    {showAverage && <Text numberOfLines={1} style={{color: theme.colors.textSecondary, fontSize: 11 * scale, lineHeight: 14 * scale}}>{Math.round(total / weekly.length).toLocaleString()} daily avg</Text>}
  </View>;
}

function WeeklyChart({ weekly, peak, width, scale, showTotals }: {
  weekly: ActivityDay[]; peak: number; width: number; scale: number; showTotals: boolean;
}) {
  const theme = useTheme();
  const totals = [
    `${weekly.reduce((sum, day) => sum + day.distance, 0).toFixed(1)} km`,
    `${Math.round(weekly.reduce((sum, day) => sum + day.calories, 0)).toLocaleString()} kcal`,
    ...(weekly.some((day) => day.activeMinutes !== null) ? [`${weekly.reduce((sum, day) => sum + (day.activeMinutes ?? 0), 0)} move min`] : []),
  ];
  const showValues = width >= 235 * scale;
  const barWidth = Math.max(8 * scale, Math.min(14 * scale, width / 22));

  return <View testID="activity-weekly-chart" style={{ flex: 1, minHeight: 0, minWidth: 0, gap: 3 * scale }}>
    <ActivityWeeklySummary weekly={weekly} scale={scale} />
    {showTotals && <Text numberOfLines={width >= 330 * scale ? 1 : 2} style={{color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 13 * scale}}>
      {totals.join(' · ')}
    </Text>}
    <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 2 * scale, paddingTop: 4 * scale }}>
      {weekly.map((day) => <View key={day.date} style={{ flex: 1, height: '100%', alignItems: 'center', minWidth: 0, gap: 4 * scale }}>
        {showValues && <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: 8 * scale, fontVariant: ['tabular-nums'] }}>
          {day.steps >= 10000 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps.toLocaleString()}
        </Text>}
        <View style={{ flex: 1, minHeight: 0, width: barWidth, borderRadius: barWidth / 2,
          backgroundColor: theme.colors.glassChip, justifyContent: 'flex-end', overflow: 'hidden' }}>
          <View style={{ height: `${Math.max(day.steps > 0 ? 3 : 0, day.steps / peak * 100)}%`,
            width: '100%', borderRadius: barWidth / 2, backgroundColor: theme.colors.focusRing }} />
        </View>
        <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: 9 * scale }}>
          {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}
        </Text>
      </View>)}
    </View>
  </View>;
}

/** Use the free-layout card's extra height or width for the last seven days. */
export default function ActivityWeeklyCard({ health, width, height, sideBySide }: {
  health: Activity; width: number; height: number; sideBySide: boolean;
}) {
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const scale = compact ? 1 : 1.4;
  const weekly = health.weekly || [];
  const peak = Math.max(health.stepGoal, ...weekly.map((day) => day.steps), 1);
  const overviewWidth = sideBySide ? width * 0.44 : width;
  const ringSize = Math.min(90 * scale, overviewWidth * 0.34, height * 0.27);

  const today = <>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * scale, minWidth: 0 }}>
      <View style={{alignItems: 'center', gap: 3 * scale}}>
        <TVProgressRing progress={health.stepGoal > 0 ? health.steps / health.stepGoal : 0} size={ringSize} strokeWidth={6 * scale} />
        <Text numberOfLines={1} style={{color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 13 * scale}}>Goal {health.stepGoal.toLocaleString()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ActivityStats steps={health.steps} distance={health.distance} calories={health.calories}
          activeMinutes={health.activeMinutes} estimatedRestingCalories={health.estimatedRestingCalories} dense />
      </View>
    </View>
  </>;

  return <View testID="adaptive-activity" style={{ height, width, minWidth: 0, gap: 7 * scale, overflow: 'hidden' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * scale }}>
      <View style={{ padding: 5 * scale, borderRadius: 8, backgroundColor: theme.colors.glassChip }}>
        <MaterialCommunityIcons name="heart-pulse" size={17 * scale} color={theme.colors.focusRing} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 12 * scale, fontWeight: '700' }}>Activity</Text>
    </View>

    {sideBySide ? <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 16 * scale }}>
      <View style={{ width: overviewWidth, minWidth: 0, gap: 7 * scale }}>{today}</View>
      <WeeklyChart weekly={weekly} peak={peak} width={width - overviewWidth - 16 * scale} scale={scale} showTotals={height >= 195 * scale} />
    </View> : <>
      {today}
      <WeeklyChart weekly={weekly} peak={peak} width={width} scale={scale} showTotals={height >= 290 * scale} />
    </>}

    <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: 10 * scale }}>Open details ↗</Text>
  </View>;
}
