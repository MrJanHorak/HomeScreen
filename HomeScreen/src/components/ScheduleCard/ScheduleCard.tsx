import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { useSchedule } from '../../hooks/useSchedule';
import ScheduleItem from './ScheduleItem';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export default function ScheduleCard() {
  const { data, isLoading } = useSchedule();
  const theme = useTheme();
  const maxItems = 3;

  if (isLoading) {
    return <ActivityIndicator color={theme.colors.focusRing} />;
  }

  const events = data ?? [];
  const visibleEvents = events.slice(0, maxItems);
  const remainingCount = events.length - maxItems;

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={22}
            color={theme.colors.focusRing}
          />
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            TODAY'S SCHEDULE
          </Text>
        </View>

        {remainingCount > 0 ? (
          <View style={styles.moreBadge}>
            <Text style={[styles.moreBadgeText, { color: theme.colors.accent }]}>
              +{remainingCount} more
            </Text>
          </View>
        ) : (
          <View style={styles.moreBadge}>
            <Text style={[styles.moreBadgeText, { color: theme.colors.textSecondary }]}>
              {events.length} events
            </Text>
          </View>
        )}
      </View>

      {/* Schedule Items */}
      <View style={styles.scheduleList}>
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
    justifyContent: 'center',
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
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
});

