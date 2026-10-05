import {useDashboard} from '../../context/DashboardContext';
import type {CardId} from '../../theme/appearance';
import CardContent from './shared/CardContent';
import WeatherDashboardCard from './weather/WeatherDashboardCard';
import ScheduleDashboardCard from './schedule/ScheduleDashboardCard';
import ActivityDashboardCard from './activity/ActivityDashboardCard';
import MediaDashboardCard from './media/MediaDashboardCard';
import MealsDashboardCard from './meals/MealsDashboardCard';
import TasksDashboardCard from './tasks/TasksDashboardCard';
import type {CardDimensions} from './shared/types';

interface AdaptiveDashboardCardProps extends CardDimensions {
  id: CardId;
}

/** The canvas and automatic rows select the same domain components. */
export default function AdaptiveDashboardCard({id, width, height}: AdaptiveDashboardCardProps) {
  const {isLoading} = useDashboard();
  const dimensions = {width, height};
  // Play Next loads independently of the remote dashboard summary.
  if (id === 'media') return <MediaDashboardCard {...dimensions} />;
  if (isLoading) return <CardContent {...dimensions} id={id} title="Loading…" subtitle="Your dashboard is updating" />;

  switch (id) {
    case 'weather': return <WeatherDashboardCard {...dimensions} />;
    case 'schedule': return <ScheduleDashboardCard {...dimensions} />;
    case 'activity': return <ActivityDashboardCard {...dimensions} />;
    case 'meal': return <MealsDashboardCard {...dimensions} />;
    case 'todo': return <TasksDashboardCard {...dimensions} />;
  }
}
