import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// components
import TVText from '../tv/TVText';
import TVProgressRing from './TVProgressRing';
import ActivityStats from './ActivityStats';

// hooks
import { useHealthData } from '../../hooks/useHealthData';

// theme
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

export default function ActivityCard() {
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const { data, isLoading } = useHealthData();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.focusRing} />
      </View>
    );
  }
  if (!data || (data.status && data.status !== 'ok')) {
    return <TVText text={data?.message || 'Activity unavailable'} typography="body" color="textSecondary" />;
  }

  const steps = data.steps;
  const goal = data.stepGoal;
  const distance = data.distance;
  const calories = data.calories;
  const activeMinutes = data.activeMinutes;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerRow, compact && styles.compactHeaderRow]}>
        <MaterialCommunityIcons
          name="heart-pulse"
          size={compact ? 17 : 22}
          color="#38BDF8"
        />
        <Text style={[styles.headerTitle, compact && styles.compactTitle, { color: theme.colors.textPrimary }]}>
          ACTIVITY
        </Text>
      </View>

      <View style={[styles.chartWrapper, compact && styles.compactChart]}>
        <View style={styles.goalColumn}>
          <TVProgressRing progress={data.progress} size={compact ? 62 : 82} strokeWidth={compact ? 6 : 8} />
          <Text style={[styles.goalText, compact && styles.compactGoalText, { color: theme.colors.textSecondary }]}>
            {steps.toLocaleString()} / {goal.toLocaleString()}
          </Text>
        </View>
        <ActivityStats
          steps={steps}
          distance={distance}
          calories={calories}
          activeMinutes={activeMinutes}
          estimatedRestingCalories={data.estimatedRestingCalories}
        />
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
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  goalColumn: { alignItems: 'center', gap: 4 },
  goalText: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  compactGoalText: { fontSize: 9 },
  compactHeaderRow: { marginBottom: 6 },
  compactTitle: { fontSize: 14 },
  compactChart: { gap: 8 },
});

