import {Text, View} from 'react-native';
import {useTheme} from '../../../theme/ThemeContext';
import {activitySummaryHeight, cardTypography} from '../shared/cardContentLayout';
import TVProgressRing from '../../shared/TVProgressRing';
import ActivityStats from './ActivityStats';
import {ActivityWeeklySummary} from './ActivityWeeklyCard';
import CardHeader from '../shared/CardHeader';
import type {ActivitySummaryProps} from './types';

export default function ActivityRingContent({health, width, height, scale}: ActivitySummaryProps) {
  const theme = useTheme();
  const type = cardTypography(height, scale);
  const weekly = health.weekly || [];
  const hasWeekly = weekly.length > 0;
  const progress = health.stepGoal > 0 ? Math.min(1, Math.max(0, health.steps / health.stepGoal)) : 0;
  // Reserve the weekly total before giving the remaining space to the ring.
  const summaryReserve = activitySummaryHeight(height - type.header - type.gap * 2 - 74 * scale, scale, hasWeekly);
  const ringSize = Math.min(
    82 * scale,
    width * 0.3,
    height - type.header - type.gap - 17 * scale,
    summaryReserve ? height - type.header - type.gap * 2 - summaryReserve - 16 * scale : Infinity,
  );
  const summaryHeight = activitySummaryHeight(
    height - type.header - type.gap * 2 - Math.max(ringSize + 16 * scale, 74 * scale),
    scale,
    hasWeekly,
  );

  return (
    <View testID="adaptive-activity" style={{height, width, gap: type.gap, overflow: 'hidden'}}>
      <CardHeader id="activity" scale={scale} height={type.header} />
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6 * scale}}>
        <View style={{width: ringSize + 12 * scale, alignItems: 'center', gap: 3 * scale}}>
          <TVProgressRing progress={progress} size={ringSize} strokeWidth={6 * scale} />
          <Text numberOfLines={1} style={{
            color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 13 * scale,
          }}>
            Goal {health.stepGoal.toLocaleString()}
          </Text>
        </View>
        <View style={{flex: 1, minWidth: 0}}>
          <ActivityStats
            steps={health.steps}
            distance={health.distance}
            calories={health.calories}
            activeMinutes={health.activeMinutes}
            estimatedRestingCalories={health.estimatedRestingCalories}
            dense
          />
        </View>
      </View>
      {summaryHeight > 0 && (
        <ActivityWeeklySummary weekly={weekly} scale={scale} showAverage={summaryHeight >= 62 * scale} />
      )}
    </View>
  );
}
