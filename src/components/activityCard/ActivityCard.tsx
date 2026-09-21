import { View, ActivityIndicator, StyleSheet } from 'react-native';
// import { PieChart } from 'react-native-gifted-charts';

// components
import TVText from '../tv/TVText';

// hooks
import { useHealthData } from '../../hooks/useHealthData';

// helpers
import { calculateStepPercentages } from '../../helpers/healthDataHelper';

// theme
import { useTheme } from '../../theme/ThemeContext';
import TVProgressRing from './TVProgressRing';

export default function ActivityCard() {
  const theme = useTheme();
  const { data, isLoading } = useHealthData();

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.focusRing} />
      </View>
    );
  }

  const steps = data?.steps ?? 0;
  const goal = data?.stepGoal ?? 10000;

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
      <TVText
        text='ACTIVITY'
        typography='caption'
        color='textSecondary'
        marginBottom='xs'
      />

      <View style={styles.chartWrapper}>
        <TVProgressRing progress={data.progress} size={80} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
