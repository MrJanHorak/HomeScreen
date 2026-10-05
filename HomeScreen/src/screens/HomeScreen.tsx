import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import TVText from '../components/shared/TVText';
import TVCard from '../components/shared/TVCard';
import HeaderBar from '../components/dashboard/header/HeaderBar';
import MeasuredDashboardCard from '../components/dashboard/MeasuredDashboardCard';
import FavoriteAppsCarousel from '../components/dashboard/favorites/FavoriteAppsCarousel';
import TVDetailModal, { TVDetailModalProps } from '../components/shared/TVDetailModal';

// Detail Views
import WeatherDetailView from '../components/details/weather/WeatherDetailView';
import ScheduleDetailView from '../components/details/schedule/ScheduleDetailView';
import ActivityDetailView from '../components/details/activity/ActivityDetailView';
import MediaDetailView from '../components/details/media/MediaDetailView';
import MealDetailView from '../components/details/meals/MealDetailView';
import ToDoDetailView from '../components/details/tasks/ToDoDetailView';
import SettingsDetailView from '../components/settings/SettingsDetailView';

import { useDashboard } from '../context/DashboardContext';
import { useAppearance, useTheme } from '../theme/ThemeContext';
import { getCardRows } from '../theme/appearance';
import type { CardId, CardPreference } from '../theme/appearance';
import useCompactTVLayout from '../hooks/useCompactTVLayout';
import useAmbientMode from '../components/ambient/useAmbientMode';
import AmbientScreen from '../components/ambient/AmbientScreen';
import DashboardGrid from '../components/dashboard/DashboardGrid';

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

function HomeScreen() {
  const { error } = useDashboard();
  const { appearance, ambientPhotos } = useAppearance();
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const [activeModal, setActiveModal] = useState<DetailTopic>(null);
  const ambient = useAmbientMode(
    appearance.ambient.enabled, appearance.ambient.idleMinutes, activeModal !== null
  );
  const closeModal = useCallback(() => setActiveModal(null), []);
  const detail = activeModal ? DETAILS[activeModal] : null;
  const DetailView = detail?.View;
  const rows = getCardRows(appearance.cards);
  const previewAmbient = () => {
    setActiveModal(null);
    ambient.preview();
  };

  const renderCard = (card: CardPreference) => {
    return (
      <TVCard
        key={card.id}
        cardId={card.id}
        style={{ flex: card.size === 'wide' ? 2 : 1, height: '100%' }}
        onPress={() => setActiveModal(card.id)}
      >
        <MeasuredDashboardCard id={card.id} />
      </TVCard>
    );
  };

  if (ambient.active) {
    return (
      <View style={styles.container}>
        <View style={[styles.ambientFrame, {
          top: compact ? -16 : -theme.spacing.safeVertical,
          bottom: compact ? -16 : -theme.spacing.safeVertical,
          left: compact ? -30 : -theme.spacing.safeHorizontal,
          right: compact ? -30 : -theme.spacing.safeHorizontal,
        }]}>
          <AmbientScreen preference={appearance.ambient} selectedPhotos={ambientPhotos} />
        </View>
      </View>
    );
  }

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
        {appearance.grid ? <DashboardGrid grid={appearance.grid} onOpen={setActiveModal} /> : rows.map((row, index) => (
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
          {activeModal === 'settings'
            ? <SettingsDetailView onPreviewAmbient={previewAmbient} />
            : <DetailView />}
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
  ambientFrame: { position: 'absolute' },
});


