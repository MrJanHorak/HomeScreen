import { View, ActivityIndicator, StyleSheet } from 'react-native';
// import { PieChart } from 'react-native-gifted-charts';

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
      <TVText
        text='ACTIVITY'
        typography='caption'
        color='textSecondary'
        marginBottom='sm'
      />

      <View style={styles.chartWrapper}>
        <TVProgressRing progress={data.progress} size={70} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
