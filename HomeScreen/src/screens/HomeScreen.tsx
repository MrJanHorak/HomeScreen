import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import TVText from '../components/tv/TVText';
import TVCard from '../components/tv/TVCard';
import HeaderBar from '../components/HeaderBar';
import WeatherWidget from '../components/weatherWidget/WeatherWidget';
import ScheduleCard from '../components/ScheduleCard/ScheduleCard';
import ActivityCard from '../components/activityCard/ActivityCard';
import MealCard from '../components/MealCard/MealCard';
import ToDo from '../components/ToDo/ToDo';
import MediaCard from '../components/tv/MediaCard';
import FavoriteAppsCarousel from '../components/FavoriteAppsCarousel';
import TVDetailModal, { TVDetailModalProps } from '../components/tv/TVDetailModal';

// Detail Views
import WeatherDetailView from '../components/details/WeatherDetailView';
import ScheduleDetailView from '../components/details/ScheduleDetailView';
import ActivityDetailView from '../components/details/ActivityDetailView';
import MediaDetailView from '../components/details/MediaDetailView';
import MealDetailView from '../components/details/MealDetailView';
import ToDoDetailView from '../components/details/ToDoDetailView';
import SettingsDetailView from '../components/details/SettingsDetailView';

import { useDashboard } from '../context/DashboardContext';
import { useAppearance } from '../theme/ThemeContext';
import { getCardRows } from '../theme/appearance';
import type { CardId, CardPreference } from '../theme/appearance';
import useCompactTVLayout from '../hooks/useCompactTVLayout';

type DetailTopic =
  | 'weather'
  | 'schedule'
  | 'activity'
  | 'media'
  | 'meal'
  | 'todo'
  | 'settings'
  | null;

type Topic = Exclude<DetailTopic, null>;
type DetailDefinition = Pick<TVDetailModalProps,
  'title' | 'subtitle' | 'icon' | 'iconColor' | 'badgeText'> & {
  View: React.ComponentType;
};

const DETAILS: Record<Topic, DetailDefinition> = {
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
    title: 'Family Meal Planner', subtitle: 'Dinner and weekly menu',
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

const CARDS: Record<CardId, React.ComponentType> = {
  weather: WeatherWidget,
  schedule: ScheduleCard,
  activity: ActivityCard,
  media: MediaCard,
  meal: MealCard,
  todo: ToDo,
};

function HomeScreen() {
  const { error } = useDashboard();
  const { appearance } = useAppearance();
  const compact = useCompactTVLayout();
  const [activeModal, setActiveModal] = useState<DetailTopic>(null);
  const closeModal = useCallback(() => setActiveModal(null), []);
  const detail = activeModal ? DETAILS[activeModal] : null;
  const DetailView = detail?.View;
  const rows = getCardRows(appearance.cards);

  const renderCard = (card: CardPreference) => {
    const Content = CARDS[card.id];
    return (
      <TVCard
        key={card.id}
        style={{ flex: card.size === 'wide' ? 2 : 1, height: '100%' }}
        onPress={() => setActiveModal(card.id)}
      >
        <Content />
      </TVCard>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <HeaderBar onOpenSettings={() => setActiveModal('settings')} />

      {error && (
        <View style={styles.errorBanner}>
          <TVText
            text={`Live data unavailable: ${error}`}
            typography="caption"
            color="accent"
          />
        </View>
      )}

      <View style={[styles.cardRows, compact && styles.compactCardRows]}>
        {rows.map((row, index) => (
          <View key={index} style={[styles.cardRow, compact && styles.compactCardRow,
            { flex: index === 0 && rows.length > 1 ? 1.2 : 1 }]}>
            {row.map(renderCard)}
          </View>
        ))}
      </View>

      <FavoriteAppsCarousel />

      {detail && DetailView && (
        <TVDetailModal
          visible
          onClose={closeModal}
          title={detail.title}
          subtitle={detail.subtitle}
          icon={detail.icon}
          iconColor={detail.iconColor}
          badgeText={detail.badgeText}
          spacious={activeModal === 'settings'}
        >
          <DetailView />
        </TVDetailModal>
      )}
    </View>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  errorBanner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  cardRows: {
    flex: 1,
    gap: 20,
    marginVertical: 18,
  },
  cardRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  compactCardRows: { gap: 12, marginVertical: 8 },
  compactCardRow: { gap: 12, minHeight: 0 },
});


