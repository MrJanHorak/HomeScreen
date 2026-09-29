import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useDashboard } from '../../context/DashboardContext';

export default function ScheduleDetailView() {
  const theme = useTheme();
  const { schedule, isLoading } = useDashboard();
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('today')}
          style={[
            styles.tabItem,
            activeTab === 'today' && [
              styles.activeTabItem,
              { borderColor: theme.colors.focusRing, backgroundColor: 'rgba(56, 189, 248, 0.15)' },
            ],
          ]}
        >
          <MaterialCommunityIcons
            name="calendar-today"
            size={18}
            color={activeTab === 'today' ? theme.colors.focusRing : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'today' ? theme.colors.textPrimary : theme.colors.textSecondary },
            ]}
          >
            Today's Schedule ({schedule.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('upcoming')}
          style={[
            styles.tabItem,
            activeTab === 'upcoming' && [
              styles.activeTabItem,
              { borderColor: theme.colors.focusRing, backgroundColor: 'rgba(56, 189, 248, 0.15)' },
            ],
          ]}
        >
          <MaterialCommunityIcons
            name="calendar-month"
            size={18}
            color={activeTab === 'upcoming' ? theme.colors.focusRing : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'upcoming' ? theme.colors.textPrimary : theme.colors.textSecondary },
            ]}
          >
            Upcoming Days
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
        {activeTab === 'today' ? (
          <View style={styles.eventsWrapper}>
            {schedule.length === 0 && (
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {isLoading ? 'Loading schedule…' : 'No events scheduled today.'}
              </Text>
            )}
            {schedule.map((evt) => (
              <View key={evt.id} style={styles.eventCard}>
                <View style={[styles.timeBox, { borderColor: `${evt.color || '#38BDF8'}66` }]}>
                  <Text style={[styles.timeText, { color: theme.colors.textPrimary }]}>
                    {evt.time}
                  </Text>
                  <Text style={[styles.endTimeText, { color: theme.colors.textSecondary }]}>
                    {evt.endTime}
                  </Text>
                </View>

                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: theme.colors.textPrimary }]}>
                    {evt.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="clock-outline" size={15} color={theme.colors.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                      {evt.time} – {evt.endTime}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: `${evt.color || '#38BDF8'}22`,
                      borderColor: `${evt.color || '#38BDF8'}66`,
                    },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: evt.color || theme.colors.focusRing }]}>
                    {evt.category.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.eventsWrapper}>
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              Upcoming events are not included in the current calendar feed yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  activeTabItem: {
    borderWidth: 1.5,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollList: {
    flex: 1,
  },
  eventsWrapper: {
    gap: 10,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    gap: 16,
  },
  timeBox: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    minWidth: 96,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  endTimeText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
  },
  categoryPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  confirmedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
});
