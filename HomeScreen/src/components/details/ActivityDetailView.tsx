import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useDashboard } from '../../context/DashboardContext';
import TVProgressRing from '../activityCard/TVProgressRing';

function recordTime(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null :
    date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function ActivityDetailView() {
  const theme = useTheme();
  const { health: act, isLoading } = useDashboard();

  if (!act) {
    return <Text style={{ color: theme.colors.textSecondary }}>
      {isLoading ? 'Loading activity…' : 'Activity data is unavailable.'}
    </Text>;
  }

  if (act.status && act.status !== 'ok') {
    return <View style={styles.weeklyCard}>
      <Text style={[styles.weeklyTitle, { color: theme.colors.textPrimary }]}>Activity unavailable</Text>
      <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>
        {act.message || 'Could not load Google Fit activity.'}
      </Text>
    </View>;
  }

  const weekly = act.weekly || [];
  const highestSteps = Math.max(act.stepGoal, ...weekly.map((day) => day.steps), 1);
  const totalSteps = weekly.reduce((sum, day) => sum + day.steps, 0);
  const daysWithMoveMinutes = weekly.filter((day) => day.activeMinutes != null);
  const totalMoveMinutes = daysWithMoveMinutes.reduce((sum, day) => sum + (day.activeMinutes || 0), 0);
  const fetchedTime = recordTime(act.fetchedAt);
  const stepsTime = recordTime(act.stepsRecordedThrough);
  const caloriesTime = recordTime(act.caloriesRecordedThrough);
  const restingEstimate = act.estimatedRestingCalories || 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {fetchedTime && <Text style={[styles.metricSub, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
        Google Fit · fetched {fetchedTime}
      </Text>}
      {/* Hero Overview */}
      <View style={styles.heroRow}>
        <View style={styles.ringCard}>
          <TVProgressRing progress={act.progress} size={130} strokeWidth={12} />
          <View style={styles.ringTextGroup}>
            <Text style={[styles.ringPercent, { color: theme.colors.textPrimary }]}>
              {Math.round(act.progress * 100)}%
            </Text>
            <Text style={[styles.ringLabel, { color: theme.colors.focusRing }]}>
              Daily Step Goal
            </Text>
            <Text style={[styles.ringSub, { color: theme.colors.textSecondary }]}>
              {act.steps.toLocaleString()} of {act.stepGoal.toLocaleString()} steps
            </Text>
            {stepsTime && <Text style={[styles.metricSub, { color: theme.colors.textSecondary, marginTop: 6 }]}>
              Latest step record: {stepsTime}
            </Text>}
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
              <Text style={[styles.metricTitle, { color: theme.colors.textSecondary }]}>Move Minutes</Text>
              <Text style={[styles.metricBig, { color: theme.colors.textPrimary }]}>
                {act.activeMinutes == null ? '—' : `${act.activeMinutes} min`}
              </Text>
              <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>
                {act.activeMinutes == null ? 'No Move Minutes data from Google Fit today' : 'Today'}
              </Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="lightning-bolt" size={26} color="#F87171" />
            <View style={styles.metricMeta}>
              <Text style={[styles.metricTitle, { color: theme.colors.textSecondary }]}>Calories Burned</Text>
              <Text style={[styles.metricBig, { color: theme.colors.textPrimary }]}>{act.calories} kcal</Text>
              <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>
                {restingEstimate > 0 ? 'Resting + Active · estimated' : 'Resting + Active'}
              </Text>
              {(restingEstimate > 0 || caloriesTime) && <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>
                {restingEstimate > 0
                  ? `Includes ${restingEstimate.toLocaleString()} estimated resting kcal${caloriesTime ? ` since ${caloriesTime}` : ' today'}`
                  : `Recorded through ${caloriesTime}`}
              </Text>}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.weeklyCard}>
        <Text style={[styles.weeklyTitle, { color: theme.colors.textPrimary }]}>
          Last 7 Days
        </Text>
        {weekly.length ? <>
          <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>
            {totalSteps.toLocaleString()} steps total · {Math.round(totalSteps / weekly.length).toLocaleString()} daily average
          </Text>
          {daysWithMoveMinutes.length > 0 && <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>
            {totalMoveMinutes.toLocaleString()} Move Minutes across {daysWithMoveMinutes.length} days with data
          </Text>}
          <View style={styles.barsContainer}>
            {weekly.map((day) => (
              <View key={day.date} style={styles.barColumn}>
                <Text style={[styles.barValueText, { color: theme.colors.textPrimary }]}>
                  {day.steps.toLocaleString()}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {
                    height: `${Math.max(day.steps > 0 ? 3 : 0, day.steps / highestSteps * 100)}%`,
                    backgroundColor: theme.colors.focusRing,
                  }]} />
                </View>
                <Text style={[styles.barDayText, { color: theme.colors.textSecondary }]}>
                  {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[styles.metricSub, { color: theme.colors.textSecondary, marginTop: 14 }]}>
            Bars show steps; the full bar represents {highestSteps.toLocaleString()} steps.
          </Text>
        </> : <Text style={[styles.metricSub, { color: theme.colors.textSecondary }]}>
          Weekly activity has not loaded yet.
        </Text>}
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
