import Text from '../../shared/ReadingText';
import {StyleSheet, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import type {WeatherForecast} from '../../../../../shared/src/types';
import {useTheme} from '../../../theme/ThemeContext';
import {getWeatherIconName} from '../../../helpers/weatherHelpers';
import ForecastSection from './ForecastSection';
import {useDetailLayout} from '../../shared/DetailLayout';

export default function DailyForecast({days}: {days: WeatherForecast[]}) {
  const theme = useTheme();
  const {compact} = useDetailLayout();
  return (
    <ForecastSection title="Extended Forecast">
      <View style={[styles.list, compact && {flexDirection: 'row', flexWrap: 'wrap'}]}>
        {days.length === 0 && (
          <Text style={[styles.condition, {color: theme.colors.textSecondary}]}>Extended forecast unavailable.</Text>
        )}
        {days.map((day, index) => (
          <View key={index} testID='weather-detail-day' style={[styles.row, compact && styles.tile]}>
            <View style={styles.heading}>
            <Text style={[styles.day, {color: theme.colors.textPrimary}]}>{day.day}</Text>
            {!compact && <View style={styles.conditionGroup}>
              <MaterialCommunityIcons name={getWeatherIconName(day.icon).name} size={22} color={theme.colors.focusRing} />
              <Text style={[styles.condition, {color: theme.colors.textSecondary}]}>{day.condition}</Text>
            </View>}
            <View style={styles.temperatureGroup}>
              <Text style={[styles.low, {color: theme.colors.textSecondary}]}>{day.low}°</Text>
              <Text style={[styles.high, {color: theme.colors.textPrimary}]}>{day.high}°</Text>
            </View>
            </View>
            {compact && <View style={styles.conditionGroup}>
              <MaterialCommunityIcons name={getWeatherIconName(day.icon).name} size={20} color={theme.colors.focusRing}/>
              <Text style={[styles.condition, {color: theme.colors.textSecondary}]}>{day.condition}</Text>
            </View>}
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
  heading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%'},
  tile: {width: '48.5%', flexDirection: 'column', alignItems: 'stretch', paddingVertical: 7, paddingHorizontal: 10, gap: 4},
  day: {width: 60, fontSize: 16, fontWeight: '700'},
  conditionGroup: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0},
  condition: {fontSize: 15, fontWeight: '500', flexShrink: 1},
  temperatureGroup: {flexDirection: 'row', alignItems: 'center', gap: 10},
  low: {fontSize: 15, fontWeight: '600', width: 44, textAlign: 'right'},
  high: {fontSize: 15, fontWeight: '700', width: 44},
});
