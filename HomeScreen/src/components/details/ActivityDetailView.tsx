import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useDashboard } from '../../context/DashboardContext';
import TVProgressRing from '../activityCard/TVProgressRing';

export default function ActivityDetailView() {
  const theme = useTheme();
  const { health: act, isLoading } = useDashboard();

  if (!act) {
    return <Text style={{ color: theme.colors.textSecondary }}>
      {isLoading ? 'Loading activity…' : 'Activity data is unavailable.'}
    </Text>;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Overview */}
      <View style={styles.heroRow}>
        <View style={styles.ringCard}>
          <TVProgressRing progress={act.progress} size={130} strokeWidth={12} />
          <View style={styles.ringTextGroup}>
            <Text style={[styles.ringPercent, { color: theme.colors.textPrimary }]}>
              {Math.round(act.progress * 100)}%
            </Text>
            <Text style={[styles.ringLabel, { color: theme.colors.focusRing }]}>
              Daily Goal Reached
            </Text>
            <Text style={[styles.ringSub, { color: theme.colors.textSecondary }]}>
              {act.steps.toLocaleString()} of {act.stepGoal.toLocaleString()} steps
            </Text>
          </View>
        </View>

        {/* 3 Metric Summary Pillars */}
        <View style={styles.metricsColumn}>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="map-marker-distance" size={26} color="#34D399" />
            <View style={styles.metricMeta}>
              <Text style={[styles.metricTitle, { color: theme.colors.textSecondary }]}>Distance</Text>
              <Text style={[styles.metricBig, { color: theme.colors.textPrimary }]}>{act.distance} km</Text>
              <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>Target: {act.distanceGoal} km</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="timer-outline" size={26} color="#FBBF24" />
            <View style={styles.metricMeta}>
              <Text style={[styles.metricTitle, { color: theme.colors.textSecondary }]}>Active Minutes</Text>
              <Text style={[styles.metricBig, { color: theme.colors.textPrimary }]}>{act.activeMinutes} min</Text>
              <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>Today</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="lightning-bolt" size={26} color="#F87171" />
            <View style={styles.metricMeta}>
              <Text style={[styles.metricTitle, { color: theme.colors.textSecondary }]}>Calories Burned</Text>
              <Text style={[styles.metricBig, { color: theme.colors.textPrimary }]}>{act.calories} kcal</Text>
              <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>Resting + Active</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Weekly history requires a separate data feed. */}
      <View style={styles.weeklyCard}>
        <Text style={[styles.weeklyTitle, { color: theme.colors.textPrimary }]}>
          Weekly Activity Breakdown
        </Text>
        <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>
          Weekly history is not included in the current activity feed yet.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  ringCard: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 24,
  },
  ringTextGroup: {
    justifyContent: 'center',
    flex: 1,
  },
  ringPercent: {
    fontSize: 44,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  ringLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  ringSub: {
    fontSize: 14,
    marginTop: 4,
  },
  metricsColumn: {
    flex: 1.3,
    gap: 12,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 16,
  },
  metricMeta: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  metricBig: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  metricSub: {
    fontSize: 12,
    marginTop: 2,
  },
  weeklyCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingHorizontal: 12,
  },
  barColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    width: 48,
  },
  barValueText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  barTrack: {
    width: 14,
    height: 90,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barDayText: {
    fontSize: 13,
    marginTop: 8,
  },
});
