import { View, StyleSheet } from 'react-native';
import {
  formatTemperature,
  getWeatherIconName,
} from '../../helpers/weatherHelpers';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TVTheme } from '../../theme/tvTheme';
import { useTheme } from '../../theme/ThemeContext';

import TVText from '../tv/TVText';

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

  console.log(formattedTemp);
  console.log(conditionIconParsed);
  return (
    <View>
      <View style={styles.tempIconRow}>
        <MaterialCommunityIcons
          name={conditionIconParsed.name}
          size={48}
          color={theme.colors.textPrimary}
        />
        <TVText text={formattedTemp} typography='headerLg' />
      </View>
      <TVText text={condition} typography='body' style={styles.conditionText} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 4,
  },
  conditionText: {
    textAlign: 'center',
  },
});
