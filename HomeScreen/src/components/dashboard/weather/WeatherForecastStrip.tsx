import Text from '../../shared/ReadingText';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { HourlyForecastItem, WeatherForecast } from '../../../../../shared/src/types';
import { formatTemperature, rainProbability, weatherConditionIcon } from '../../../helpers/weatherHelpers';
import { useTheme } from '../../../theme/ThemeContext';
import CardSection from '../shared/CardSection';
import { weatherForecastSizing } from './weatherCardLayout';

type StripProps = { scale: number; shallow?: boolean; roomy?: boolean } & (
  { hours: HourlyForecastItem[]; days?: never } | { days: WeatherForecast[]; hours?: never });

/** Hourly probabilities and daily conditions share spacing, but keep their own semantics. */
export default function WeatherForecastStrip({ hours, days, scale, shallow = false, roomy = false }: StripProps) {
  const theme = useTheme();
  const primary = { color: theme.colors.textPrimary };
  const secondary = { color: theme.colors.textSecondary };
  const size = weatherForecastSizing(shallow, roomy);
  const label = { ...secondary, fontSize: size.labelSize * scale, lineHeight: size.labelLine * scale };
  const values = hours || days || [];
  const hourly = Boolean(hours);
  return <CardSection title={hourly ? (shallow ? 'Hours' : 'Next hours') : 'Next days'}
    caption={hourly ? (shallow ? 'Rain %' : 'Rain chance') : undefined}
    scale={scale} compact={shallow} testID='weather-forecast-section'>
    <View style={{ flexDirection: 'row', gap: 8 * scale }}>
      {values.map((item, index) => {
        const hour = hourly ? item as HourlyForecastItem : undefined;
        const day = !hourly ? item as WeatherForecast : undefined;
        const probability = hour ? rainProbability(hour.pop) : null;
        const icon = day ? weatherConditionIcon(day.icon, day.condition) : undefined;
        const accessible = hour
          ? [hour.time, formatTemperature(hour.temp), probability !== null ? `${probability}% chance of rain` : 'Rain chance unavailable'].join(', ')
          : [day?.day, day?.condition, `High ${formatTemperature(day?.high)}`, `Low ${formatTemperature(day?.low)}`].filter(Boolean).join(', ');
        return <View key={index} testID={hour ? 'weather-hour' : 'weather-day'} accessible accessibilityLabel={accessible}
          style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: (hourly ? size.hourGap : size.dayGap) * scale }}>
          <Text numberOfLines={1} style={label}>{hour?.time || day?.day}</Text>
          {hour ? <>
            <Text numberOfLines={1} style={{ ...primary, fontSize: size.temperatureSize * scale,
              lineHeight: size.temperatureLine * scale, fontWeight: '600' }}>{formatTemperature(hour.temp)}</Text>
            {!shallow && <View accessible={false} style={{ height: size.bar * scale, alignSelf: 'stretch',
              backgroundColor: theme.colors.glassSubtle, borderRadius: 2 * scale }}>
              {probability !== null && <View style={{ height: '100%', width: `${probability}%`,
                backgroundColor: theme.colors.focusRing, borderRadius: 2 * scale }} />}
            </View>}
            <Text numberOfLines={1} style={{ ...secondary, fontSize: size.probabilitySize * scale, lineHeight: size.probabilityLine * scale }}>
              {probability === null ? '—' : `${probability}%`}
            </Text>
          </> : <>
            <View style={{ height: size.icon * scale, justifyContent: 'center' }}>
              {icon && <MaterialCommunityIcons name={icon} size={size.icon * scale} color={theme.colors.focusRing} />}
            </View>
            <Text numberOfLines={1} style={{ ...primary, fontSize: size.dayTemperatureSize * scale, lineHeight: size.dayTemperatureLine * scale, fontWeight: '600' }}>
              {formatTemperature(day?.high)} <Text style={secondary}>{formatTemperature(day?.low)}</Text>
            </Text>
          </>}
        </View>;
      })}
    </View>
  </CardSection>;
}
