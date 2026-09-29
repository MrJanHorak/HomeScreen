import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// components
import TVText from '../tv/TVText';
import TVProgressRing from './TVProgressRing';
import ActivityStats from './ActivityStats';

// hooks
import { useHealthData } from '../../hooks/useHealthData';

// helpers
import { calculateStepPercentages } from '../../helpers/healthDataHelper';

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
  if (!data) {
    return <TVText text="Activity unavailable" typography="body" color="textSecondary" />;
  }

  const steps = data?.steps ?? 0;
  const goal = data?.stepGoal ?? 10000;
  const distance = data?.distance ?? 0;
  const calories = data?.calories ?? 0;
  const activeMinutes = data?.activeMinutes ?? 0;

  const stepPercentages = calculateStepPercentages(steps, goal);

  const safePercentage = Number.isNaN(stepPercentages.stepPercentage)
    ? 0
    : stepPercentages.stepPercentage;

  const safePercentageLeft = Number.isNaN(stepPercentages.stepPercentageLeft)
    ? 100
    : stepPercentages.stepPercentageLeft;

  const progressDisplay = `${Math.round(data.progress * 100)}%`;

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
        <TVProgressRing progress={data.progress} size={compact ? 62 : 82} strokeWidth={compact ? 6 : 8} />
        <ActivityStats
          steps={steps}
          distance={distance}
          calories={calories}
          activeMinutes={activeMinutes}
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
  compactHeaderRow: { marginBottom: 6 },
  compactTitle: { fontSize: 14 },
  compactChart: { gap: 8 },
});

