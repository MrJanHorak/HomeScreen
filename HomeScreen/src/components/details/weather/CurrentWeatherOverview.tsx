import Text from '../../shared/ReadingText';
import {StyleSheet, View} from 'react-native';
import type {Weather} from '../../../../../shared/src/types';
import {useTheme} from '../../../theme/ThemeContext';
import WeatherMetric from './WeatherMetric';

export default function CurrentWeatherOverview({weather}: {weather: Weather}) {
  const theme = useTheme();
  const humidity = weather.humidity !== undefined ? `${weather.humidity}%` : '--';
  const wind = weather.windSpeed !== undefined ? `${weather.windSpeed} mph ${weather.windDirection || ''}` : '--';
  const pressure = weather.pressure !== undefined ? `${weather.pressure} hPa` : '--';
  return (
    <View style={styles.row}>
      <View style={styles.hero}>
        <View style={styles.temperatureGroup}>
          <Text style={[styles.temperature, {color: theme.colors.textPrimary}]}>{weather.temp}</Text>
          <View style={styles.conditionGroup}>
            <Text style={[styles.condition, {color: theme.colors.textPrimary}]}>{weather.condition}</Text>
            {weather.feelsLike !== undefined && (
              <Text style={[styles.feelsLike, {color: theme.colors.textSecondary}]}>
                Feels like {weather.feelsLike}° • H: {weather.high}° L: {weather.low}°
              </Text>
            )}
            <Text style={[styles.location, {color: theme.colors.focusRing}]}>📍 {weather.location}</Text>
          </View>
        </View>
      </View>
      <View style={styles.metrics}>
        <WeatherMetric icon="water-percent" color="#38BDF8" label="Humidity" value={humidity} />
        <WeatherMetric icon="weather-windy" color="#34D399" label="Wind" value={wind} />
        <WeatherMetric icon="gauge" color="#A78BFA" label="Air Pressure" value={pressure} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 24},
  hero: {flex: 1.2},
  temperatureGroup: {flexDirection: 'row', alignItems: 'center', gap: 18},
  temperature: {fontSize: 76, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -2},
  conditionGroup: {justifyContent: 'center'},
  condition: {fontSize: 26, fontWeight: '700'},
  feelsLike: {fontSize: 15, marginTop: 3},
  location: {fontSize: 14, fontWeight: '600', marginTop: 4},
  metrics: {flex: 1.5, flexDirection: 'row', flexWrap: 'wrap', gap: 12},
});
