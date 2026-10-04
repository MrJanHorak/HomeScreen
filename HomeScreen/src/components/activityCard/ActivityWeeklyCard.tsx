import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Activity, ActivityDay } from '../../../../shared/src/types';
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';
import TVProgressRing from './TVProgressRing';
import ActivityStats from './ActivityStats';

function WeeklyChart({ weekly, peak, width, scale }: {
  weekly: ActivityDay[]; peak: number; width: number; scale: number;
}) {
  const theme = useTheme();
  const total = weekly.reduce((sum, day) => sum + day.steps, 0);
  const showValues = width >= 235 * scale;
  const barWidth = Math.max(8 * scale, Math.min(14 * scale, width / 22));

  return <View style={{ flex: 1, minHeight: 0, minWidth: 0, borderTopWidth: 1,
    borderColor: theme.colors.glassBorder, paddingTop: 7 * scale, gap: 3 * scale }}>
    <Text numberOfLines={1} style={{ color: theme.colors.textPrimary, fontSize: 12 * scale, fontWeight: '700' }}>Last 7 days</Text>
    <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: 10 * scale }}>
      {total.toLocaleString()} steps · {Math.round(total / weekly.length).toLocaleString()} daily avg
    </Text>
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
export default function ActivityWeeklyCard({ health, width, height }: {
  health: Activity; width: number; height: number;
}) {
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const scale = compact ? 1 : 1.4;
  const weekly = health.weekly || [];
  const peak = Math.max(health.stepGoal, ...weekly.map((day) => day.steps), 1);
  const sideBySide = height < 245 * scale;
  const overviewWidth = sideBySide ? width * 0.44 : width;
  const ringSize = Math.min(90 * scale, overviewWidth * 0.34, height * 0.27);
  const titleSize = 21 * scale;

  const today = <>
    <View>
      <Text numberOfLines={1} style={{ color: theme.colors.textPrimary, fontSize: titleSize, lineHeight: titleSize * 1.2, fontWeight: '700' }}>
        {health.steps.toLocaleString()} steps
      </Text>
      <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: 11 * scale, lineHeight: 15 * scale }}>
        Goal {health.stepGoal.toLocaleString()}
      </Text>
    </View>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * scale, minWidth: 0 }}>
      <TVProgressRing progress={health.progress} size={ringSize} strokeWidth={6 * scale} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <ActivityStats steps={health.steps} distance={health.distance} calories={health.calories}
          activeMinutes={health.activeMinutes} estimatedRestingCalories={health.estimatedRestingCalories} showSteps={false} />
      </View>
    </View>
  </>;

  return <View style={{ height: '100%', minWidth: 0, gap: 7 * scale }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * scale }}>
      <View style={{ padding: 5 * scale, borderRadius: 8, backgroundColor: theme.colors.glassChip }}>
        <MaterialCommunityIcons name="heart-pulse" size={17 * scale} color={theme.colors.focusRing} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 12 * scale, fontWeight: '700' }}>Activity</Text>
    </View>

    {sideBySide ? <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 16 * scale }}>
      <View style={{ width: overviewWidth, minWidth: 0, gap: 7 * scale }}>{today}</View>
      <WeeklyChart weekly={weekly} peak={peak} width={width - overviewWidth - 16 * scale} scale={scale} />
    </View> : <>
      {today}
      <WeeklyChart weekly={weekly} peak={peak} width={width} scale={scale} />
    </>}

    <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: 10 * scale }}>Open details ↗</Text>
  </View>;
}
