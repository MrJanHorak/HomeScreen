import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Weather } from '../../../../../shared/src/types';
import { useDashboard } from '../../../context/DashboardContext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import { useTheme } from '../../../theme/ThemeContext';
import CardContent from '../shared/CardContent';
import type { CardDimensions, DashboardIcon, DashboardLine } from '../shared/types';

function conditionIcon(condition: string): DashboardIcon {
  const value = condition.toLowerCase();
  if (value.includes('rain') || value.includes('drizzle'))
    return 'weather-rainy';
  if (value.includes('snow')) return 'weather-snowy';
  if (value.includes('thunder')) return 'weather-lightning';
  if (value.includes('cloud')) return 'weather-cloudy';
  if (value.includes('fog') || value.includes('mist')) return 'weather-fog';
  return value.includes('clear') ? 'weather-sunny' : 'weather-partly-cloudy';
}

function weatherLines(weather: Weather | null): DashboardLine[] {
  const lines: DashboardLine[] = [];
  if (weather?.feelsLike !== undefined) {
    lines.push({
      title: `Feels like ${Math.round(weather.feelsLike)}°`,
      icon: 'thermometer',
    });
  }
  if (weather?.humidity !== undefined) {
    lines.push({
      title: `${weather.humidity}% humidity`,
      icon: 'water-percent',
    });
  }
  if (weather?.windSpeed !== undefined) {
    const direction = weather.windDirection
      ? ` · ${weather.windDirection}`
      : '';
    lines.push({
      title: `${weather.windSpeed} mph wind${direction}`,
      icon: 'weather-windy',
    });
  }
  for (const day of weather?.forecast || []) {
    lines.push({
      title: `${day.day} · ${Math.round(day.high)}° / ${Math.round(day.low)}°`,
      detail: day.condition,
      icon: conditionIcon(day.condition),
    });
  }
  for (const hour of weather?.hourly || []) {
    lines.push({
      title: `${hour.time} · ${hour.temp}`,
      detail: `${hour.pop} rain`,
      icon: 'clock-outline',
    });
  }
  return lines;
}

export default function WeatherDashboardCard({
  width,
  height,
}: CardDimensions) {
  const { weather, activeLocation } = useDashboard();
  const theme = useTheme();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  const temp = weather?.temp ?? '--';
  const temperature = temp.includes('°') ? temp : `${temp}°`;
  const showIcon = height >= 115 * scale && width >= 240 * scale;
  const iconSize = showIcon ? 34 * scale : 0;
  const highLow =
    weather?.high !== undefined
      ? `H ${Math.round(weather.high)}° · L ${Math.round(weather.low ?? weather.high)}°`
      : '';

  return (
    <CardContent
      id='weather'
      width={width}
      height={height}
      title={`${temperature} · ${weather?.condition || 'Unavailable'}`}
      subtitle={[activeLocation.name, highLow].filter(Boolean).join(' · ')}
      artWidth={iconSize}
      artHeight={iconSize}
      art={
        showIcon ? (
          <MaterialCommunityIcons
            name={conditionIcon(weather?.condition || '')}
            size={iconSize}
            color={theme.colors.focusRing}
          />
        ) : undefined
      }
      lines={weatherLines(weather)}
    />
  );
}
