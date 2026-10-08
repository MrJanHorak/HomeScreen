import {useDashboard} from '../../../context/DashboardContext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import {activityLayout} from '../shared/cardContentLayout';
import ActivityWeeklyCard from './ActivityWeeklyCard';
import ActivityRingContent from './ActivityRingContent';
import ActivityMetricsContent from './ActivityMetricsContent';
import CardContent from '../shared/CardContent';
import type {CardDimensions} from '../shared/types';
import {usePeople} from '../../../context/PeopleContext';

export default function ActivityDashboardCard({personId, ...dimensions}: CardDimensions & {personId?: string}) {
  const {health: ownHealth} = useDashboard();
  const {people} = usePeople();
  const person = personId ? people.find((p) => p.id === personId) : undefined;
  const health = personId ? person?.health : ownHealth;
  const title = personId ? `Activity · ${person?.name || 'Person unavailable'}` : undefined;
  const scale = useCompactTVLayout() ? 1 : 1.4;
  if (health?.status !== 'ok') {
    return <CardContent {...dimensions} id="activity" title={title || 'Activity unavailable'} subtitle={personId ? 'Open People settings to check sharing' : 'Open to check your activity connection'} />;
  }

  const mode = activityLayout(dimensions.width, dimensions.height, scale, Boolean(health.weekly?.length));
  if (mode === 'weekly-wide' || mode === 'weekly-tall') {
    return <ActivityWeeklyCard {...dimensions} title={title} health={health} sideBySide={mode === 'weekly-wide'} />;
  }
  if (mode === 'ring') return <ActivityRingContent {...dimensions} title={title} health={health} scale={scale} />;
  return <ActivityMetricsContent {...dimensions} title={title} health={health} scale={scale} />;
}
