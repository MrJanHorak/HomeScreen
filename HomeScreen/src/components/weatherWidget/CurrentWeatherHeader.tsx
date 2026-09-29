import { View, StyleSheet, Text } from 'react-native';
import {
  formatTemperature,
  getWeatherIconName,
} from '../../helpers/weatherHelpers';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

interface CurrentWeatherHeaderProps {
  temperature: number;
  condition: string;
  conditionIcon: string;
}

export default function CurrentWeatherHeader({
  temperature,
  condition,
  conditionIcon,
}: CurrentWeatherHeaderProps) {
  const formattedTemp = formatTemperature(temperature);
  const conditionIconParsed = getWeatherIconName(conditionIcon);
  const theme = useTheme();
  const compact = useCompactTVLayout();

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={[styles.tempIconRow, compact && styles.compactTempRow]}>
        <View style={[styles.iconCircle, compact && styles.compactIconCircle]}>
          <MaterialCommunityIcons
            name={conditionIconParsed.name}
            size={compact ? 28 : 42}
            color={theme.colors.focusRing}
          />
        </View>
        <Text style={[styles.tempText, compact && styles.compactTemp, { color: theme.colors.textPrimary }]}>
          {formattedTemp}
        </Text>
        <View style={styles.conditionCol}>
          <Text numberOfLines={1} style={[styles.conditionText, compact && styles.compactCondition, { color: theme.colors.textPrimary }]}>
            {condition}
          </Text>
          <Text style={[styles.subtitleText, compact && styles.compactSubtitle, { color: theme.colors.textSecondary }]}>
            Current Weather
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  tempIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempText: {
    fontSize: 42,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  conditionCol: {
    justifyContent: 'center',
    marginLeft: 4,
  },
  conditionText: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  compactContainer: { marginBottom: 6 },
  compactTempRow: { gap: 6 },
  compactIconCircle: { width: 38, height: 38, borderRadius: 19 },
  compactTemp: { fontSize: 31 },
  compactCondition: { fontSize: 14 },
  compactSubtitle: { fontSize: 10, marginTop: 0 },
});

