import Text from '../../shared/ReadingText';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDashboard } from '../../../context/DashboardContext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import { useTheme } from '../../../theme/ThemeContext';
import { formatTemperature, weatherConditionIcon } from '../../../helpers/weatherHelpers';
import CardHeader from '../shared/CardHeader';
import CardDetailsHint from '../shared/CardDetailsHint';
import type { CardDimensions } from '../shared/types';
import WeatherForecastStrip from './WeatherForecastStrip';
import { planWeatherCard } from './weatherCardLayout';

export default function WeatherDashboardCard({ width, height }: CardDimensions) {
  const { weather, activeLocation } = useDashboard();
  const theme = useTheme();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  const rawTemperature = weather?.temp?.trim() || '--';
  const temperature = rawTemperature.includes('°') ? rawTemperature : `${rawTemperature}°`;
  const condition = weather?.condition || 'Unavailable';
  const available = Boolean(weather && !['unknown', 'unavailable'].includes(condition.toLowerCase()) && Number.isFinite(parseFloat(rawTemperature)));
  const icon = available ? weatherConditionIcon(weather?.conditionIcon, condition) : undefined;
  const hours = available ? weather?.hourly || [] : [];
  const days = available ? weather?.forecast || [] : [];
  const hasFeelsLike = available && Number.isFinite(weather?.feelsLike);
  const highLow = available ? [
    Number.isFinite(weather?.high) ? `H ${formatTemperature(weather?.high)}` : '',
    Number.isFinite(weather?.low) ? `L ${formatTemperature(weather?.low)}` : '',
  ].filter(Boolean).join(' · ') : '';
  const metrics = available ? [
    Number.isFinite(weather?.windSpeed) ? { icon: 'weather-windy' as const,
      text: `${weather?.windSpeed} mph wind${weather?.windDirection ? ` · ${weather.windDirection}` : ''}` } : null,
    Number.isFinite(weather?.humidity) ? { icon: 'water-percent' as const, text: `${weather?.humidity}% humidity` } : null,
  ].filter(item => item !== null) : [];
  const plan = planWeatherCard({ width, height, scale, temperature,
    hasContext: hasFeelsLike || Boolean(highLow), hourlyCount: hours.length,
    dailyCount: days.length, hasMetrics: metrics.length > 0, hasIcon: Boolean(icon) });
  const context = [hasFeelsLike ? `Feels like ${formatTemperature(weather?.feelsLike)}` : '',
    plan.currentWidth / scale >= 250 || !hasFeelsLike ? highLow : ''].filter(Boolean).join(' · ');
  const forecast = <View style={{ gap: 8 * scale, minWidth: 0 }}>
    {plan.hours > 0 && <WeatherForecastStrip hours={hours.slice(0, plan.hours)} scale={scale} shallow={plan.shallow} roomy={plan.roomyForecast} />}
    {plan.days > 0 && <WeatherForecastStrip days={days.slice(0, plan.days)} scale={scale} shallow={plan.shallow} roomy={plan.roomyForecast} />}
  </View>;
  return <View testID='adaptive-weather' style={{ width, height, minWidth: 0 }}>
    <View testID='weather-content' style={{ gap: plan.gap }}>
      <CardHeader id='weather' scale={scale} height={plan.header} badge={activeLocation.name} />
      <View style={{ flexDirection: plan.sideBySide ? 'row' : 'column', gap: (plan.sideBySide ? 16 : 8) * scale }}>
        <View testID='weather-current' style={{ width: plan.currentWidth, minWidth: 0, gap: 4 * scale }}>
          <View testID='weather-hero' style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * scale }}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 * scale }}>
              <Text testID='weather-temperature' numberOfLines={1} style={{ color: theme.colors.textPrimary,
                fontSize: plan.temperatureSize, lineHeight: plan.temperatureLine, fontWeight: '700' }}>{temperature}</Text>
              <Text testID='weather-condition' numberOfLines={1} style={{ color: theme.colors.textPrimary,
                fontSize: (plan.shallow ? 12 : 14) * scale, lineHeight: plan.conditionLine }}>{condition}</Text>
            </View>
            {icon && plan.icon > 0 && <MaterialCommunityIcons name={icon} size={plan.icon} color={theme.colors.focusRing} />}
          </View>
          {plan.context && context && <Text testID='weather-context' numberOfLines={1}
            style={{ color: theme.colors.textSecondary, fontSize: 11 * scale, lineHeight: 16 * scale }}>{context}</Text>}
        </View>
        {plan.sideBySide && <View style={{ width: plan.forecastWidth }}>{forecast}</View>}
        {!plan.sideBySide && (plan.hours > 0 || plan.days > 0) && forecast}
      </View>
      {plan.metrics && <View testID='weather-metrics' style={{ flexDirection: 'row', gap: 14 * scale,
        borderTopWidth: scale, borderTopColor: theme.colors.glassBorder, paddingTop: 6 * scale }}>
        {metrics.map(metric => <View key={metric.icon} style={{ flex: 1, minWidth: 0,
          flexDirection: 'row', alignItems: 'center', gap: 5 * scale }}>
          <MaterialCommunityIcons name={metric.icon} size={14 * scale} color={theme.colors.focusRing} />
          <Text numberOfLines={1} style={{ flex: 1, color: theme.colors.textSecondary, fontSize: 11 * scale,
            lineHeight: 16 * scale }}>{metric.text}</Text>
        </View>)}
      </View>}
    </View>
    {plan.footer && <View testID='weather-details-hint' style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      <CardDetailsHint scale={scale} />
    </View>}
  </View>;
}
