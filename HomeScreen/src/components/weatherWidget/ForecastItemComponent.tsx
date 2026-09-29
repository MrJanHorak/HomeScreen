import { StyleSheet, View, Text } from 'react-native';
import {
  formatTemperature,
  getWeatherIconName,
} from '../../helpers/weatherHelpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import type { WeatherForecast } from '../../../../shared/src/types';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

export default function ForecastItemComponent({
  day,
  condition,
  icon,
  high,
  low,
}: WeatherForecast) {
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const iconConfig = getWeatherIconName(icon);
  const formattedHigh = formatTemperature(high);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <Text style={[styles.dayText, compact && styles.compactDay, { color: theme.colors.textSecondary }]}>
        {day.toUpperCase()}
      </Text>
      <MaterialCommunityIcons
        name={iconConfig.name}
        size={compact ? 17 : 24}
        color={theme.colors.textPrimary}
        style={[styles.icon, compact && styles.compactIcon]}
      />
      <Text style={[styles.highText, compact && styles.compactHigh, { color: theme.colors.textPrimary }]}>
        {formattedHigh}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: 52,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  icon: {
    marginVertical: 4,
  },
  highText: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  compactContainer: { paddingVertical: 4, paddingHorizontal: 5, minWidth: 41, borderRadius: 9 },
  compactDay: { fontSize: 10, marginBottom: 0 },
  compactIcon: { marginVertical: 1 },
  compactHigh: { fontSize: 12, marginTop: 0 },
});

