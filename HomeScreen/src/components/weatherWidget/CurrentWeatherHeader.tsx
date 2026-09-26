import { View, StyleSheet } from 'react-native';
import {
  formatTemperature,
  getWeatherIconName,
} from '../../helpers/weatherHelpers';

import { MaterialCommunityIcons } from '@expo/vector-icons';
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

  return (
    <View>
      <View style={styles.tempIconRow}>
        <MaterialCommunityIcons
          name={conditionIconParsed.name}
          size={36}
          color={theme.colors.textPrimary}
        />
        <TVText text={formattedTemp} typography='headerMd' />
        <TVText
          text={condition}
          typography='body'
          style={styles.conditionText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tempIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 0,
  },
  conditionText: {
    // textAlign: 'center',
    // marginBottom: 4,
  },
});
