import { useWeather } from '../../hooks/useWeather';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import CurrentWeatherHeader from './CurrentWeatherHeader';
import ForecastItemComponent from './ForecastItemComponent';
import TVText from '../tv/TVText';

export default function WeatherWidget() {
  const { data, isLoading } = useWeather();

  if (isLoading) return <ActivityIndicator />;
  if (!data || data.temperature === undefined) {
    return <TVText text="Weather unavailable" typography="body" color="textSecondary" />;
  }

  return (
    <View style={styles.container}>
      <CurrentWeatherHeader
        temperature={data.temperature}
        condition={data.condition}
        conditionIcon={data.conditionIcon || 'cloud'}
      />
      <View style={styles.forecastRow}>
        {data.forecast?.map((forecastItem) => (
          <ForecastItemComponent
            key={forecastItem.day}
            day={forecastItem.day}
            condition={forecastItem.condition}
            icon={forecastItem.icon}
            high={forecastItem.high}
            low={forecastItem.low}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },

  forecastRow: {
    gap: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
