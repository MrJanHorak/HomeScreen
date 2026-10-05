import {useDashboard} from '../../../context/DashboardContext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import {activityLayout} from '../shared/cardContentLayout';
import ActivityWeeklyCard from './ActivityWeeklyCard';
import ActivityRingContent from './ActivityRingContent';
import ActivityMetricsContent from './ActivityMetricsContent';
import CardContent from '../shared/CardContent';
import type {CardDimensions} from '../shared/types';

export default function ActivityDashboardCard(dimensions: CardDimensions) {
  const {health} = useDashboard();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  if (health?.status !== 'ok') {
    return <CardContent {...dimensions} id="activity" title="Activity unavailable" subtitle="Open to check your activity connection" />;
  }

  const mode = activityLayout(dimensions.width, dimensions.height, scale, Boolean(health.weekly?.length));
  if (mode === 'weekly-wide' || mode === 'weekly-tall') {
    return <ActivityWeeklyCard {...dimensions} health={health} sideBySide={mode === 'weekly-wide'} />;
  }
  if (mode === 'ring') return <ActivityRingContent {...dimensions} health={health} scale={scale} />;
  return <ActivityMetricsContent {...dimensions} health={health} scale={scale} />;
}
