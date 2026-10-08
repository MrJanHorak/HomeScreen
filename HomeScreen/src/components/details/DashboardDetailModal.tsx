import React from 'react';
import TVDetailModal from '../shared/TVDetailModal';
import type {TVDetailModalProps} from '../shared/TVDetailModal';
import type {CardId} from '../../theme/appearance';
import WeatherDetailView from './weather/WeatherDetailView';
import ScheduleDetailView from './schedule/ScheduleDetailView';
import ActivityDetailView from './activity/ActivityDetailView';
import MediaDetailView from './media/MediaDetailView';
import MealDetailView from './meals/MealDetailView';
import ToDoDetailView from './tasks/ToDoDetailView';
import SettingsDetailView from '../settings/SettingsDetailView';
import PollDetailView from './polls/PollDetailView';
import {useAppearance} from '../../theme/ThemeContext';
import {usePeople} from '../../context/PeopleContext';

export type DetailTopic = CardId | 'settings' | `poll_${string}` | `activity_${string}`;

type DetailDefinition = Pick<TVDetailModalProps,
  'title' | 'subtitle' | 'icon' | 'iconColor' | 'badgeText'> & {
  View: React.ComponentType;
};

const DETAILS: Record<CardId | 'settings', DetailDefinition> = {
  weather: {
    title: 'Weather Forecast', subtitle: 'Hourly conditions and the extended forecast',
    icon: 'weather-partly-cloudy', iconColor: '#38BDF8', badgeText: 'Forecast',
    View: WeatherDetailView,
  },
  schedule: {
    title: 'Calendar & Timeline', subtitle: 'Your daily agenda',
    icon: 'calendar-month', iconColor: '#38BDF8', badgeText: 'Agenda',
    View: ScheduleDetailView,
  },
  activity: {
    title: 'Fitness & Health Goals', subtitle: 'Daily activity and goals',
    icon: 'heart-pulse', iconColor: '#34D399', badgeText: 'Goal Tracking',
    View: ActivityDetailView,
  },
  media: {
    title: 'Watch Queue & Streaming', subtitle: 'Your entertainment queue',
    icon: 'movie-open-play', iconColor: '#F59E0B', badgeText: 'Continue Watching',
    View: MediaDetailView,
  },
  meal: {
    title: 'Meal Planner', subtitle: 'Dinner and weekly menu',
    icon: 'silverware-fork-knife', iconColor: '#F59E0B', badgeText: 'Dinner Menu',
    View: MealDetailView,
  },
  todo: {
    title: 'Task Manager & To-Do', subtitle: 'Your Google Tasks',
    icon: 'format-list-checks', iconColor: '#10B981', badgeText: 'Checklist',
    View: ToDoDetailView,
  },
  settings: {
    title: 'Settings',
    icon: 'cog', iconColor: '#A78BFA',
    View: SettingsDetailView,
  },
};

/** Detail routing stays here so the screen only coordinates navigation and ambient mode. */
export default function DashboardDetailModal({topic, onClose, onPreviewAmbient}: {
  topic: DetailTopic | null;
  onClose: () => void;
  onPreviewAmbient: () => void;
}) {
  const {appearance} = useAppearance();
  const {people} = usePeople();
  if (!topic) return null;
  if (topic.startsWith('activity_')) {
    const widget = appearance.widgetLayout?.widgets.find((w) => w.id === topic && w.kind === 'activity');
    const person = people.find((p) => p.id === widget?.personId);
    return <TVDetailModal visible onClose={onClose} title={`Activity · ${person?.name || 'Person unavailable'}`} subtitle="Shared daily activity and personal goals" icon="heart-pulse" iconColor="#34D399">
      {widget?.personId && <ActivityDetailView personId={widget.personId}/>}
    </TVDetailModal>;
  }
  if (topic.startsWith('poll_')) {
    const widget = appearance.widgetLayout?.widgets.find((w) => w.id === topic);
    return <TVDetailModal visible onClose={onClose} title="Household poll" subtitle="Scan to join the decision" icon="vote-outline" iconColor="#38BDF8">
      <PollDetailView roundId={widget?.roundId || ''}/>
    </TVDetailModal>;
  }
  const {View: DetailView, ...header} = DETAILS[topic as CardId | 'settings'];
  return (
    <TVDetailModal visible onClose={onClose} {...header} spacious={topic === 'settings'}>
      {topic === 'settings'
        ? <SettingsDetailView onPreviewAmbient={onPreviewAmbient} />
        : <DetailView />}
    </TVDetailModal>
  );
}
