import { View } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import {GOAL_OVERFLOW_COLOR, goalProgressLayers} from '../../../helpers/goalProgress';

export default function CardProgress({ value, showOverflow = false }: { value: number; showOverflow?: boolean }) {
  const theme = useTheme();
  const {base, overflow, percent} = goalProgressLayers(value);
  return (
    <View
      accessibilityRole='progressbar'
      aria-valuemin={0}
      aria-valuemax={showOverflow ? Math.max(100, percent) : 100}
      aria-valuenow={showOverflow ? percent : Math.min(100, percent)}
      accessibilityLabel={showOverflow ? `${percent}% of daily step goal` : undefined}
      aria-valuetext={showOverflow ? `${percent}% of daily step goal` : undefined}
      style={{
        height: 5,
        borderRadius: 3,
        backgroundColor: theme.colors.glassChip,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${base * 100}%`,
          height: '100%',
          backgroundColor: theme.colors.focusRing,
        }}
      />
      {showOverflow && overflow > 0 && <View testID='activity-progress-overflow' style={{
        position: 'absolute', left: 0, top: 0, width: `${overflow * 100}%`, height: '100%',
        backgroundColor: GOAL_OVERFLOW_COLOR,
      }} />}
    </View>
  );
}
