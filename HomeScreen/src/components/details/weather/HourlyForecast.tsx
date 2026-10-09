import Text from '../../shared/ReadingText';
import {ScrollView, StyleSheet, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import type {HourlyForecastItem} from '../../../../../shared/src/types';
import {useTheme} from '../../../theme/ThemeContext';
import {getWeatherIconName} from '../../../helpers/weatherHelpers';
import ForecastSection from './ForecastSection';
import {useDetailLayout} from '../../shared/DetailLayout';

export default function HourlyForecast({hours}: {hours: HourlyForecastItem[]}) {
  const theme = useTheme();
  const {compact} = useDetailLayout();
  return (
    <ForecastSection title="Hourly Forecast">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {hours.length === 0 && (
          <Text style={[styles.time, {color: theme.colors.textSecondary}]}>Hourly forecast unavailable.</Text>
        )}
        {hours.map((hour, index) => (
          <View key={index} style={[styles.card, compact && {paddingVertical: 7, paddingHorizontal: 10, marginRight: 8}]}>
            <Text style={[styles.time, {color: theme.colors.textSecondary}]}>{hour.time}</Text>
            <View style={compact && {flexDirection: 'row', alignItems: 'center', gap: 5}}><MaterialCommunityIcons
              name={getWeatherIconName(hour.icon).name}
              size={compact ? 22 : 26}
              color={theme.colors.focusRing}
              style={compact ? undefined : {marginVertical: 6}}
            />
            <Text style={[styles.temperature, {color: theme.colors.textPrimary}]}>{hour.temp}°</Text>
            </View>
            <Text style={styles.precipitation}>{hour.pop}</Text>
          </View>
        ))}
      </ScrollView>
    </ForecastSection>
  );
}

const styles = StyleSheet.create({
  scroll: {flexDirection: 'row'},
  card: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', marginRight: 12, minWidth: 72,
  },
  time: {fontSize: 13, fontWeight: '600'},
  temperature: {fontSize: 17, fontWeight: '700'},
  precipitation: {fontSize: 12, fontWeight: '600', marginTop: 2, color: '#38BDF8'},
});
