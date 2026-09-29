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
import TVGlassNavBar from '../components/tv/TVGlassNavBar';
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
    title: 'Settings & System Status', subtitle: 'Weather locations and device status',
    icon: 'cog', iconColor: '#A78BFA', badgeText: 'System',
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

  const handleNavSelect = (id: string) => {
    switch (id) {
      case 'home':
        setActiveModal(null);
        break;
      case 'schedule':
        setActiveModal('schedule');
        break;
      case 'media':
        setActiveModal('media');
        break;
      case 'tasks':
        setActiveModal('todo');
        break;
      case 'settings':
        setActiveModal('settings');
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <HeaderBar />

      {error && (
        <View style={styles.errorBanner}>
          <TVText
            text={`Live data unavailable: ${error}`}
            typography="caption"
            color="accent"
          />
        </View>
      )}

      <View style={styles.cardRows}>
        {rows.map((row, index) => (
          <View key={index} style={[styles.cardRow, { flex: index === 0 && rows.length > 1 ? 1.2 : 1 }]}>
            {row.map(renderCard)}
          </View>
        ))}
      </View>

      {/* Bottom Floating Glass Navigation Dock */}
      <TVGlassNavBar
        activeId={activeModal === 'schedule' ? 'schedule' : activeModal === 'media' ? 'media' : activeModal === 'todo' ? 'tasks' : activeModal === 'settings' ? 'settings' : 'home'}
        onSelect={handleNavSelect}
      />

      {detail && DetailView && (
        <TVDetailModal
          visible
          onClose={closeModal}
          title={detail.title}
          subtitle={detail.subtitle}
          icon={detail.icon}
          iconColor={detail.iconColor}
          badgeText={detail.badgeText}
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
});


