import { StyleSheet, View } from 'react-native';
import {
  formatHighLow,
  getWeatherIconName,
} from '../../helpers/weatherHelpers';

import { MaterialCommunityIcons } from '@expo/vector-icons/';
import TVText from '../tv/TVText';

export default function ForecastItemComponent({ forecast }) {
  const iconName = getWeatherIconName(forecast.icon);
  const highLowText = formatHighLow(forecast.high, forecast.low);

  return (
    <View style={styles.container}>
      <TVText text={forecast.day} typography='caption' />
      <MaterialCommunityIcons name={iconName.name} size={24} color='white' />
      {/* <TVText text={highLowText} typography='caption' /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  forecastRow: {
    flexDirection: 'row',
  },
});
