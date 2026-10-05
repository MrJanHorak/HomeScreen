import { View } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

export default function CardProgress({ value }: { value: number }) {
  const theme = useTheme();
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View
      accessibilityRole='progressbar'
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      style={{
        height: 5,
        borderRadius: 3,
        backgroundColor: theme.colors.glassChip,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${percent}%`,
          height: '100%',
          backgroundColor: theme.colors.focusRing,
        }}
      />
    </View>
  );
}
