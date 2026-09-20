import { useWeather } from '../../hooks/useWeather';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import CurrentWeatherHeader from './CurrentWeatherHeader';
import ForecastItemComponent from './ForecastItemComponent';

export default function WeatherWidget() {
  const { data, isLoading } = useWeather();

  if (isLoading) return <ActivityIndicator />;

  return (
    <View style={styles.container}>
      <CurrentWeatherHeader
        temperature={data!.temperature}
        condition={data!.condition}
        conditionIcon={data!.conditionIcon}
      />
      <View style={styles.forecastRow}>
        {data?.forecast.map((forecastItem) => (
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
