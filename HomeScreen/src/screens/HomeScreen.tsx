import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import TVText from '../components/tv/TVText';
import TVSection from '../components/tv/TVSection';
import TVCard from '../components/tv/TVCard';
import HeaderBar from '../components/HeaderBar';
import WeatherWidget from '../components/weatherWidget/WeatherWidget';
import ScheduleCard from '../components/ScheduleCard/ScheduleCard';
import ActivityCard from '../components/activityCard/ActivityCard';
import MealCard from '../components/MealCard/MealCard';
import ToDo from '../components/ToDo/ToDo';
import MediaCard from '../components/tv/MediaCard';
import TVGlassNavBar from '../components/tv/TVGlassNavBar';
import TVDetailModal from '../components/tv/TVDetailModal';

// Detail Views
import WeatherDetailView from '../components/details/WeatherDetailView';
import ScheduleDetailView from '../components/details/ScheduleDetailView';
import ActivityDetailView from '../components/details/ActivityDetailView';
import MediaDetailView from '../components/details/MediaDetailView';
import MealDetailView from '../components/details/MealDetailView';
import ToDoDetailView from '../components/details/ToDoDetailView';
import SettingsDetailView from '../components/details/SettingsDetailView';

import { useDashboard } from '../context/DashboardContext';

type DetailTopic =
  | 'weather'
  | 'schedule'
  | 'activity'
  | 'media'
  | 'meal'
  | 'todo'
  | 'settings'
  | null;

function HomeScreen() {
  const { error } = useDashboard();
  const [activeModal, setActiveModal] = useState<DetailTopic>(null);

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

      {/* Primary Section (Row 1) */}
      <TVSection direction="row" style={styles.topSection}>
        <TVCard
          style={{ flex: 1.1, height: '100%' }}
          onPress={() => setActiveModal('weather')}
        >
          <WeatherWidget />
        </TVCard>
        <TVCard
          style={{ flex: 2, height: '100%' }}
          onPress={() => setActiveModal('schedule')}
        >
          <ScheduleCard />
        </TVCard>
        <TVCard
          style={{ flex: 1.1, height: '100%' }}
          onPress={() => setActiveModal('activity')}
        >
          <ActivityCard />
        </TVCard>
      </TVSection>

      {/* Secondary Section (Row 2) */}
      <TVSection direction="row" style={styles.bottomSection}>
        <TVCard
          style={{ flex: 1, height: '100%' }}
          onPress={() => setActiveModal('media')}
        >
          <MediaCard />
        </TVCard>
        <TVCard
          style={{ flex: 1, height: '100%' }}
          onPress={() => setActiveModal('meal')}
        >
          <MealCard />
        </TVCard>
        <TVCard
          style={{ flex: 1, height: '100%' }}
          onPress={() => setActiveModal('todo')}
        >
          <ToDo />
        </TVCard>
      </TVSection>

      {/* Bottom Floating Glass Navigation Dock */}
      <TVGlassNavBar
        activeId={activeModal === 'schedule' ? 'schedule' : activeModal === 'media' ? 'media' : activeModal === 'todo' ? 'tasks' : activeModal === 'settings' ? 'settings' : 'home'}
        onSelect={handleNavSelect}
      />

      {/* ========================================================
          DETAILED GLASS MODALS (TV-Optimized Focus Trap Sheets)
          ======================================================== */}

      {/* Weather Detail */}
      <TVDetailModal
        visible={activeModal === 'weather'}
        onClose={() => setActiveModal(null)}
        title="Weather Forecast & Radar"
        subtitle="Hourly atmospheric changes and 5-day temperature projection"
        icon="weather-partly-cloudy"
        iconColor="#38BDF8"
        badgeText="Hourly Forecast"
      >
        <WeatherDetailView />
      </TVDetailModal>

      {/* Schedule Detail */}
      <TVDetailModal
        visible={activeModal === 'schedule'}
        onClose={() => setActiveModal(null)}
        title="Calendar & Timeline"
        subtitle="Full daily agenda, categories, and upcoming week appointments"
        icon="calendar-month"
        iconColor="#38BDF8"
        badgeText="Agenda"
      >
        <ScheduleDetailView />
      </TVDetailModal>

      {/* Activity Detail */}
      <TVDetailModal
        visible={activeModal === 'activity'}
        onClose={() => setActiveModal(null)}
        title="Fitness & Health Goals"
        subtitle="Daily steps, active minutes, calories burned, and weekly breakdown"
        icon="heart-pulse"
        iconColor="#34D399"
        badgeText="Goal Tracking"
      >
        <ActivityDetailView />
      </TVDetailModal>

      {/* Media Detail */}
      <TVDetailModal
        visible={activeModal === 'media'}
        onClose={() => setActiveModal(null)}
        title="Watch Queue & Streaming"
        subtitle="Resume your favorite shows, movies, and queued entertainment"
        icon="movie-open-play"
        iconColor="#F59E0B"
        badgeText="Continue Watching"
      >
        <MediaDetailView />
      </TVDetailModal>

      {/* Meal Detail */}
      <TVDetailModal
        visible={activeModal === 'meal'}
        onClose={() => setActiveModal(null)}
        title="Family Meal Planner"
        subtitle="Tonight's dinner courses, ingredients, and the weekly menu rotation"
        icon="silverware-fork-knife"
        iconColor="#F59E0B"
        badgeText="Dinner Menu"
      >
        <MealDetailView />
      </TVDetailModal>

      {/* To Do Detail */}
      <TVDetailModal
        visible={activeModal === 'todo'}
        onClose={() => setActiveModal(null)}
        title="Task Manager & To-Do"
        subtitle="Interactive task lists, priorities, and completed checklist items"
        icon="format-list-checks"
        iconColor="#10B981"
        badgeText="Checklist"
      >
        <ToDoDetailView />
      </TVDetailModal>

      {/* Settings Detail */}
      <TVDetailModal
        visible={activeModal === 'settings'}
        onClose={() => setActiveModal(null)}
        title="Settings & System Status"
        subtitle="Device info, backend sync status, and TV display calibration"
        icon="cog"
        iconColor="#A78BFA"
        badgeText="System"
      >
        <SettingsDetailView />
      </TVDetailModal>
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
  topSection: {
    height: '42%',
    marginBottom: 16,
  },
  bottomSection: {
    height: '35%',
    marginBottom: 12,
  },
});


