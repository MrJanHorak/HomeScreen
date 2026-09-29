import { View, StyleSheet, Text } from 'react-native';
import { CalendarItem } from '../../hooks/useSchedule';
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

export default function ScheduleItem({
  title,
  time,
  endTime,
  category,
  color,
}: CalendarItem) {
  const theme = useTheme();
  const compact = useCompactTVLayout();

  return (
    <View style={[styles.rowContainer, compact && styles.compactRow]}>
      {/* Left: Time Pill */}
      <View style={[styles.timeBadge, compact && styles.compactTimeBadge, { borderColor: color ? `${color}55` : 'rgba(255,255,255,0.15)' }]}>
        <Text style={[styles.timeText, compact && styles.compactTimeText, { color: theme.colors.textPrimary }]}>
          {time}
        </Text>
      </View>

      {/* Center: Event Info */}
      <View style={styles.detailsColumn}>
        <Text
          numberOfLines={1}
          style={[styles.titleText, compact && styles.compactTitle, { color: theme.colors.textPrimary }]}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.rangeText, compact && styles.compactRange, { color: theme.colors.textSecondary }]}
        >
          {endTime ? `${time} – ${endTime}` : time}
        </Text>
      </View>

      {/* Right: Category Indicator Pill */}
      {/* {category ? (
        <View
          style={[
            styles.categoryPill,
            {
              backgroundColor: color ? `${color}22` : 'rgba(255, 255, 255, 0.08)',
              borderColor: color ? `${color}66` : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.categoryText,
              { color: color || theme.colors.textSecondary },
            ]}
          >
            {category}
          </Text>
        </View>
      ) : ( */}
        <View style={[styles.accentDot, { backgroundColor: color || theme.colors.focusRing }]} />
      {/* )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 8,
    gap: 14,
  },
  timeBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    minWidth: 84,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  detailsColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '600',
  },
  rangeText: {
    fontSize: 13,
    marginTop: 2,
  },
  categoryPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  compactRow: { paddingVertical: 4, paddingHorizontal: 7, marginBottom: 5, gap: 8, borderRadius: 9 },
  compactTimeBadge: { paddingVertical: 3, paddingHorizontal: 6, minWidth: 65 },
  compactTimeText: { fontSize: 12 },
  compactTitle: { fontSize: 13 },
  compactRange: { fontSize: 10, marginTop: 0 },
});

