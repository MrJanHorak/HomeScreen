import { Text, View } from 'react-native';
import type { Activity, ActivityDay } from '../../../../../shared/src/types';
import { useTheme } from '../../../theme/ThemeContext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import TVProgressRing from '../../shared/TVProgressRing';
import ActivityStats from './ActivityStats';
import {activityChartPeak, summarizeActivityWeek} from '../../../helpers/activitySummary';
import CardHeader from '../shared/CardHeader';
import CardDetailsHint from '../shared/CardDetailsHint';
import CardSection from '../shared/CardSection';
import {activityMiniChartWidth} from '../shared/cardContentLayout';
import ActivityDayBars from './ActivityDayBars';

export function ActivityWeeklySummary({weekly, scale, showAverage = true, width = 0, stepGoal = 0}: {
  weekly: ActivityDay[]; scale: number; showAverage?: boolean; width?:number; stepGoal?:number;
}) {
  const theme = useTheme();
  const summary = summarizeActivityWeek(weekly);
  const chartWidth = weekly.length ? activityMiniChartWidth(width, scale, showAverage) : 0;
  return <CardSection title='Last 7 days' scale={scale} testID='activity-weekly-summary'>
    <View style={{flexDirection:'row', alignItems:'center', gap:10 * scale}}>
    <View style={{gap:2 * scale, ...(chartWidth ? {flex:1, minWidth:0} : {})}}>
    <Text numberOfLines={1} style={{color: theme.colors.textPrimary, fontSize: 14 * scale, lineHeight: 18 * scale, fontWeight: '700'}}>{summary.steps.toLocaleString()} steps</Text>
    {showAverage && <Text numberOfLines={1} style={{color: theme.colors.textSecondary, fontSize: 11 * scale, lineHeight: 14 * scale}}>{summary.averageSteps.toLocaleString()} daily avg</Text>}
    </View>
    {chartWidth > 0 && <ActivityDayBars weekly={weekly} peak={activityChartPeak(weekly, stepGoal)} width={chartWidth} scale={scale} compact />}
    </View>
  </CardSection>;
}

function WeeklyChart({ weekly, peak, width, scale, showTotals }: {
  weekly: ActivityDay[]; peak: number; width: number; scale: number; showTotals: boolean;
}) {
  const theme = useTheme();
  const summary = summarizeActivityWeek(weekly);
  const totals = [
    `${summary.distance.toFixed(1)} km`,
    `${Math.round(summary.calories).toLocaleString()} kcal`,
    ...(summary.moveMinutes !== null ? [`${summary.moveMinutes} move min`] : []),
  ];

  return <View testID="activity-weekly-chart" style={{ flex: 1, minHeight: 0, minWidth: 0, gap: 3 * scale }}>
    <ActivityWeeklySummary weekly={weekly} scale={scale} />
    {showTotals && <Text numberOfLines={width >= 330 * scale ? 1 : 2} style={{color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 13 * scale}}>
      {totals.join(' · ')}
    </Text>}
    <ActivityDayBars weekly={weekly} peak={peak} width={width} scale={scale} />
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
  const peak = activityChartPeak(weekly, health.stepGoal);
  const overviewWidth = sideBySide ? width * 0.44 : width;
  const enlarged = sideBySide ? width / scale >= 700 && height / scale >= 300
    : width / scale >= 300 && height / scale >= 400;
  const ringSize = Math.min((enlarged ? 120 : 90) * scale, overviewWidth * 0.34, height * 0.27);

  const today = <>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * scale, minWidth: 0 }}>
      <View style={{alignItems: 'center', gap: 3 * scale}}>
        <TVProgressRing progress={health.stepGoal > 0 ? health.steps / health.stepGoal : 0} size={ringSize} strokeWidth={6 * scale} />
        <Text numberOfLines={1} style={{color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 13 * scale}}>Goal {health.stepGoal.toLocaleString()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ActivityStats steps={health.steps} distance={health.distance} calories={health.calories}
          activeMinutes={health.activeMinutes} estimatedRestingCalories={health.estimatedRestingCalories} dense enlarged={enlarged} />
      </View>
    </View>
  </>;

  return <View testID="adaptive-activity" style={{ height, width, minWidth: 0, gap: 7 * scale, overflow: 'hidden' }}>
    <CardHeader id='activity' scale={scale} height={24 * scale} badge='Today' />

    {sideBySide ? <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 16 * scale }}>
      <View style={{ width: overviewWidth, minWidth: 0, gap: 7 * scale }}>{today}</View>
      <WeeklyChart weekly={weekly} peak={peak} width={width - overviewWidth - 16 * scale} scale={scale} showTotals={height >= 195 * scale} />
    </View> : <>
      {today}
      <WeeklyChart weekly={weekly} peak={peak} width={width} scale={scale} showTotals={height >= 290 * scale} />
    </>}

    <CardDetailsHint scale={scale} />
  </View>;
}
