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
import {dashboardSourceNotice} from '../../services/dashboardSourceNotice';
import {useEffect} from 'react';
import {markStartup} from '../../services/startupTiming';

interface AdaptiveDashboardCardProps extends CardDimensions {
  id: CardId;
  personId?: string;
}

/** The canvas and automatic rows select the same domain components. */
export default function AdaptiveDashboardCard({id, width, height, personId}: AdaptiveDashboardCardProps) {
  const {isLoading, isCached, lastUpdated, sources, schedule, upcomingEvents, tasks} = useDashboard();
  // The measured inner card has mounted with data. A JS frame callback is not
  // proof of pixel presentation; it bounds scheduler delay after this commit.
  useEffect(() => {
    if (isLoading || !lastUpdated || id === 'media' || personId) return;
    if (!markStartup(isCached ? 'cached-content-effect' : 'live-content-effect')) return;
    const frame = requestAnimationFrame(() => markStartup(isCached ? 'cached-frame-callback' : 'live-frame-callback'));
    return () => cancelAnimationFrame(frame);
  }, [id, personId, isLoading, isCached, lastUpdated]);
  const dimensions = {width, height};
  if (id === 'activity' && personId) return <ActivityDashboardCard {...dimensions} personId={personId} />;
  // Play Next loads independently of the remote dashboard summary.
  if (id === 'media') return <MediaDashboardCard {...dimensions} />;
  if (isLoading) return <CardContent {...dimensions} id={id} title="Loading…" subtitle="Your dashboard is updating" />;
  const source = id === 'schedule' ? sources?.calendar : id === 'todo' ? sources?.tasks : undefined;
  const hasItems = source && (id === 'schedule' ? schedule.length + upcomingEvents.length > 0 : tasks.length > 0);
  if (source && source.status !== 'ok' && (!hasItems || source.status === 'not_connected')) {
    const label = id === 'schedule' ? 'Calendar' : 'Tasks';
    return <CardContent {...dimensions} id={id} title={source.status === 'not_connected' ? `${label} not connected` : `${label} unavailable`}
      subtitle={dashboardSourceNotice(label, source) || undefined} />;
  }

  switch (id) {
    case 'weather': return <WeatherDashboardCard {...dimensions} />;
    case 'schedule': return <ScheduleDashboardCard {...dimensions} />;
    case 'activity': return <ActivityDashboardCard {...dimensions} />;
    case 'meal': return <MealsDashboardCard {...dimensions} />;
    case 'todo': return <TasksDashboardCard {...dimensions} />;
  }
}
