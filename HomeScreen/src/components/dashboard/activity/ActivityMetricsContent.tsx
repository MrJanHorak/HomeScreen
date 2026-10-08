import {Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useTheme} from '../../../theme/ThemeContext';
import {activitySummaryHeight, cardTypography} from '../shared/cardContentLayout';
import {ActivityWeeklySummary} from './ActivityWeeklyCard';
import CardHeader from '../shared/CardHeader';
import CardProgress from '../shared/CardProgress';
import type {DashboardIcon} from '../shared/types';
import type {ActivitySummaryProps} from './types';

interface ActivityMetric {
  text: string;
  icon: DashboardIcon;
  color: string;
}

export default function ActivityMetricsContent({health, width, height, scale, title}: ActivitySummaryProps) {
  const theme = useTheme();
  const type = cardTypography(height, scale);
  const weekly = health.weekly || [];
  const progress = health.stepGoal > 0 ? Math.min(1, Math.max(0, health.steps / health.stepGoal)) : 0;
  const stats: ActivityMetric[] = [
    {text: `${health.steps.toLocaleString()} steps`, icon: 'walk', color: '#38BDF8'},
    {text: `${health.distance.toFixed(1)} km`, icon: 'map-marker-distance', color: '#34D399'},
    {text: `${health.activeMinutes ?? '—'} move min`, icon: 'timer-outline', color: '#FBBF24'},
    {
      text: `${Math.round(health.calories).toLocaleString()} ${health.estimatedRestingCalories ? 'est. ' : ''}kcal`,
      icon: 'lightning-bolt', color: '#F87171',
    },
  ];
  const twoColumns = width >= 165 * scale;
  const metricsHeight = (twoColumns ? 36 : 76) * scale;
  const showProgress = height >= type.header + type.gap * 2 + metricsHeight + 5;
  const summaryHeight = activitySummaryHeight(
    height - type.header - type.gap * 2 - metricsHeight - (showProgress ? 5 + type.gap : 0),
    scale,
    weekly.length > 0,
  );

  return (
    <View testID="adaptive-activity" style={{height, width, gap: type.gap, overflow: 'hidden'}}>
      <CardHeader id="activity" title={title} scale={scale} height={type.header} badge={`Goal ${health.stepGoal.toLocaleString()}`} />
      <View style={{flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 * scale, columnGap: 6 * scale}}>
        {stats.map((stat) => (
          <View key={stat.icon} testID="activity-metric" style={{
            width: twoColumns ? (width - 6 * scale) / 2 : width,
            flexDirection: 'row', alignItems: 'center', gap: 3 * scale,
          }}>
            <MaterialCommunityIcons name={stat.icon} size={13 * scale} color={stat.color} />
            <Text numberOfLines={1} style={{
              flex: 1, color: theme.colors.textPrimary, fontSize: 11 * scale,
              lineHeight: 16 * scale, fontWeight: '600',
            }}>
              {stat.text}
            </Text>
          </View>
        ))}
      </View>
      {showProgress && <CardProgress value={progress} />}
      {summaryHeight > 0 && (
        <ActivityWeeklySummary weekly={weekly} scale={scale} width={width} stepGoal={health.stepGoal} showAverage={summaryHeight >= 62 * scale} />
      )}
    </View>
  );
}
