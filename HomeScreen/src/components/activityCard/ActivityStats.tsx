import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface ActivityStatsProps {
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
}

export default function ActivityStats({
  steps,
  calories,
  distance,
  activeMinutes,
}: ActivityStatsProps) {
  const theme = useTheme();

  const formattedSteps = steps.toLocaleString();
  const formattedCalories = calories.toLocaleString();

  return (
    <View style={styles.statsGrid}>
      {/* Steps */}
      <View style={styles.statRow}>
        <MaterialCommunityIcons name="walk" size={20} color="#38BDF8" style={styles.statIcon} />
        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
          {formattedSteps}
        </Text>
        <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}>
          steps
        </Text>
      </View>

      {/* Distance */}
      <View style={styles.statRow}>
        <MaterialCommunityIcons name="map-marker-distance" size={20} color="#34D399" style={styles.statIcon} />
        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
          {distance}
        </Text>
        <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}>
          km
        </Text>
      </View>

      {/* Active Time */}
      <View style={styles.statRow}>
        <MaterialCommunityIcons name="timer-outline" size={20} color="#FBBF24" style={styles.statIcon} />
        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
          {activeMinutes}
        </Text>
        <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}>
          min
        </Text>
      </View>

      {/* Calories */}
      <View style={styles.statRow}>
        <MaterialCommunityIcons name="lightning-bolt" size={20} color="#F87171" style={styles.statIcon} />
        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
          {formattedCalories}
        </Text>
        <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}>
          cal
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'column',
    gap: 7,
    justifyContent: 'center',
    marginLeft: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 24,
    marginRight: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginRight: 4,
  },
  statUnit: {
    fontSize: 13,
    fontWeight: '500',
  },
});

