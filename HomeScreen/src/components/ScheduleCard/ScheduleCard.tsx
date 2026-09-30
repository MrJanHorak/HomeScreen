import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { useState } from 'react';
import { useSchedule } from '../../hooks/useSchedule';
import ScheduleItem from './ScheduleItem';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

function eventDateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

export default function ScheduleCard() {
  const { data, upcoming, isLoading } = useSchedule();
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const [cardWidth, setCardWidth] = useState(0);
  const maxItems = 3;

  if (isLoading) {
    return <ActivityIndicator color={theme.colors.focusRing} />;
  }

  const events = data ?? [];
  const visibleEvents = events.slice(0, maxItems);
  const remainingCount = events.length - maxItems;
  const narrow = cardWidth > 0 && cardWidth < 310;
  const nextEvents = events.length === 0
    ? upcoming.filter((event) => event.date).slice(0, compact || narrow ? 2 : 3)
    : [];

  return (
    <View style={styles.container} onLayout={(event) => setCardWidth(event.nativeEvent.layout.width)}>
      {/* Header Row */}
      <View style={[styles.headerRow, compact && styles.compactHeaderRow, narrow && styles.narrowHeaderRow]}>
        <View style={styles.titleWithIcon}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={compact || narrow ? 17 : 22}
            color={theme.colors.focusRing}
          />
          <Text numberOfLines={1} style={[styles.headerTitle, compact && styles.compactTitle, narrow && styles.narrowTitle, { color: theme.colors.textPrimary }]}>
            TODAY'S SCHEDULE
          </Text>
        </View>

        {remainingCount > 0 && (
          <View style={[styles.moreBadge, narrow && styles.narrowMoreBadge]}>
            <Text style={[styles.moreBadgeText, compact && styles.compactBadgeText, { color: theme.colors.accent }]}>
              +{remainingCount} more
            </Text>
          </View>
        )}
      </View>

      {/* Schedule Items */}
      <View style={styles.scheduleList}>
        {events.length === 0 && (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No events today</Text>
        )}
        {nextEvents.length > 0 && (
          <View style={styles.upcomingSection}>
            <Text style={[styles.upcomingHeading, { color: theme.colors.textSecondary }]}>NEXT UP</Text>
            {nextEvents.map((event) => (
              <View key={event.id} style={styles.upcomingRow}>
                <View style={[styles.upcomingAccent, { backgroundColor: event.color || theme.colors.focusRing }]} />
                <View style={styles.upcomingDetails}>
                  <Text numberOfLines={1} style={[styles.upcomingDate, { color: theme.colors.textSecondary }]}>
                    {eventDateLabel(event.date!)} · {event.time}
                  </Text>
                  <Text numberOfLines={1} style={[styles.upcomingTitle, { color: theme.colors.textPrimary }]}>
                    {event.title}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {visibleEvents.map((calendarItem) => (
          <ScheduleItem
            key={calendarItem.id}
            id={calendarItem.id}
            title={calendarItem.title}
            time={calendarItem.time}
            endTime={calendarItem.endTime}
            category={calendarItem.category}
            color={calendarItem.color}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-start',
    height: '100%',
    paddingHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    flexShrink: 1,
  },
  moreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  moreBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scheduleList: {
    width: '100%',
  },
  emptyText: {
    fontSize: 14,
  },
  upcomingSection: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 7,
  },
  upcomingHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 1,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 3,
  },
  upcomingAccent: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  upcomingDetails: {
    flex: 1,
  },
  upcomingDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  upcomingTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  compactHeaderRow: { marginBottom: 6 },
  compactTitle: { fontSize: 14, letterSpacing: 0.5 },
  compactBadgeText: { fontSize: 11 },
  narrowHeaderRow: { alignItems: 'flex-start', flexDirection: 'column', gap: 6 },
  narrowTitle: { fontSize: 16, letterSpacing: 0.5 },
  narrowMoreBadge: { alignSelf: 'flex-end', paddingHorizontal: 7, paddingVertical: 2 },
});

