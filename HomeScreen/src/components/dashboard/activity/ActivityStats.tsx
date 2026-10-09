import Text from '../../shared/ReadingText';
import { View, StyleSheet} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';

interface ActivityStatsProps {
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number | null;
  estimatedRestingCalories?: number;
  showSteps?: boolean;
  dense?: boolean;
  enlarged?: boolean;
}

export default function ActivityStats({
  steps,
  calories,
  distance,
  activeMinutes,
  estimatedRestingCalories = 0,
  showSteps = true,
  dense = false,
  enlarged = false,
}: ActivityStatsProps) {
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const scale = compact ? 1 : 1.4;
  const valueStyle = enlarged ? {fontSize:18 * scale, lineHeight:24 * scale} : undefined;
  const unitStyle = enlarged ? {fontSize:11 * scale} : undefined;

  const formattedSteps = steps.toLocaleString();
  const formattedCalories = Math.round(calories).toLocaleString();

  return (
    <View testID="activity-stats" style={[styles.statsGrid, compact && styles.compactGrid, dense && {gap: compact ? 2 : 4, marginLeft: 0}, enlarged && {gap:6 * scale}]}>
      {/* Steps */}
      {showSteps && <View style={styles.statRow}>
        <MaterialCommunityIcons name="walk" size={compact ? 15 : 20} color="#38BDF8" style={[styles.statIcon, compact && styles.compactIcon]} />
        <Text style={[styles.statValue, compact && styles.compactValue, valueStyle, { color: theme.colors.textPrimary }]}>
          {formattedSteps}
        </Text>
        <Text numberOfLines={1} style={[styles.statUnit, compact && styles.compactUnit, unitStyle, { color: theme.colors.textSecondary }]}>
          steps
        </Text>
      </View>}

      {/* Distance */}
      <View style={styles.statRow}>
        <MaterialCommunityIcons name="map-marker-distance" size={compact ? 15 : 20} color="#34D399" style={[styles.statIcon, compact && styles.compactIcon]} />
        <Text style={[styles.statValue, compact && styles.compactValue, valueStyle, { color: theme.colors.textPrimary }]}>
          {distance.toFixed(1)}
        </Text>
        <Text numberOfLines={1} style={[styles.statUnit, compact && styles.compactUnit, unitStyle, { color: theme.colors.textSecondary }]}>
          km
        </Text>
      </View>

      {/* Active Time */}
      <View style={styles.statRow}>
        <MaterialCommunityIcons name="timer-outline" size={compact ? 15 : 20} color="#FBBF24" style={[styles.statIcon, compact && styles.compactIcon]} />
        <Text style={[styles.statValue, compact && styles.compactValue, valueStyle, { color: theme.colors.textPrimary }]}>
          {activeMinutes == null ? '—' : activeMinutes}
        </Text>
        <Text numberOfLines={1} style={[styles.statUnit, compact && styles.compactUnit, unitStyle, { color: theme.colors.textSecondary }]}>
          {dense ? 'min' : 'move min'}
        </Text>
      </View>

      {/* Calories */}
      <View style={styles.statRow}>
        <MaterialCommunityIcons name="lightning-bolt" size={compact ? 15 : 20} color="#F87171" style={[styles.statIcon, compact && styles.compactIcon]} />
        <Text style={[styles.statValue, compact && styles.compactValue, valueStyle, { color: theme.colors.textPrimary }]}>
          {formattedCalories}
        </Text>
        <Text numberOfLines={1} style={[styles.statUnit, compact && styles.compactUnit, unitStyle, { color: theme.colors.textSecondary }]}>
          {estimatedRestingCalories > 0 ? 'est. kcal' : 'kcal'}
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
    lineHeight: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginRight: 4,
  },
  statUnit: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  compactGrid: { gap: 2, marginLeft: 2 },
  compactIcon: { width: 18, marginRight: 3 },
  compactValue: { fontSize: 12, lineHeight: 16 },
  compactUnit: { fontSize: 10 },
});

