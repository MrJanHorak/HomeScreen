import { View, StyleSheet, Text } from 'react-native';
import {
  formatTemperature,
  getWeatherIconName,
} from '../../helpers/weatherHelpers';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

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

  return (
    <View style={styles.container}>
      <View style={styles.tempIconRow}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            name={conditionIconParsed.name}
            size={42}
            color={theme.colors.focusRing}
          />
        </View>
        <Text style={[styles.tempText, { color: theme.colors.textPrimary }]}>
          {formattedTemp}
        </Text>
        <View style={styles.conditionCol}>
          <Text style={[styles.conditionText, { color: theme.colors.textPrimary }]}>
            {condition}
          </Text>
          <Text style={[styles.subtitleText, { color: theme.colors.textSecondary }]}>
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
});

