import { StyleSheet, View } from 'react-native';
import {
  formatHighLow,
  getWeatherIconName,
} from '../../helpers/weatherHelpers';

import { FontAwesome5 } from '@expo/vector-icons/';
import TVText from '../tv/TVText';
import { useTheme } from '../../theme/ThemeContext';

import { ForecastItem } from '../../hooks/useWeather';

export default function ForecastItemComponent({
  day,
  condition,
  icon,
  high,
  low,
}: ForecastItem) {
  const theme = useTheme();
  const iconName = getWeatherIconName(icon);
  const highLowText = formatHighLow(high, low);

  return (
    <View style={styles.container}>
      <TVText text={day} typography='caption' />
      <FontAwesome5 name={icon} size={22} color={theme.colors.textPrimary} />
      {/* <TVText text={highLowText} typography='caption' /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
  },
  tempIconRow: {
    flexDirection: 'row',
    // alignItems: 'center',
    // gap: 10,
    // marginBottom: 4,
  },
  conditionText: {
    textAlign: 'center',
  },
  forecastRow: {
    flexDirection: 'row',
  },
});
