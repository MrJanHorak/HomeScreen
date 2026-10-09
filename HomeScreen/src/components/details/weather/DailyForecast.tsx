import Text from '../../shared/ReadingText';
import {StyleSheet, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import type {WeatherForecast} from '../../../../../shared/src/types';
import {useTheme} from '../../../theme/ThemeContext';
import {getWeatherIconName} from '../../../helpers/weatherHelpers';
import ForecastSection from './ForecastSection';

export default function DailyForecast({days}: {days: WeatherForecast[]}) {
  const theme = useTheme();
  return (
    <ForecastSection title="Extended Forecast">
      <View style={styles.list}>
        {days.length === 0 && (
          <Text style={[styles.condition, {color: theme.colors.textSecondary}]}>Extended forecast unavailable.</Text>
        )}
        {days.map((day, index) => (
          <View key={index} style={styles.row}>
            <Text style={[styles.day, {color: theme.colors.textPrimary}]}>{day.day}</Text>
            <View style={styles.conditionGroup}>
              <MaterialCommunityIcons name={getWeatherIconName(day.icon).name} size={22} color={theme.colors.focusRing} />
              <Text style={[styles.condition, {color: theme.colors.textSecondary}]}>{day.condition}</Text>
            </View>
            <View style={styles.temperatureGroup}>
              <Text style={[styles.low, {color: theme.colors.textSecondary}]}>{day.low}°</Text>
              <Text style={[styles.high, {color: theme.colors.textPrimary}]}>{day.high}°</Text>
            </View>
          </View>
        ))}
      </View>
    </ForecastSection>
  );
}

const styles = StyleSheet.create({
  list: {gap: 8},
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  day: {width: 60, fontSize: 16, fontWeight: '700'},
  conditionGroup: {flexDirection: 'row', alignItems: 'center', gap: 10, width: 180},
  condition: {fontSize: 15, fontWeight: '500'},
  temperatureGroup: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12},
  low: {fontSize: 15, fontWeight: '600', width: 32, textAlign: 'right'},
  high: {fontSize: 15, fontWeight: '700', width: 32},
});
