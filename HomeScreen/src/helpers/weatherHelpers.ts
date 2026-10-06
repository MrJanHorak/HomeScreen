import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface WeatherIconConfig {
  name: MaterialIconName;
  family: string;
}

export const formatTemperature = (temp: number | null | undefined) => {
  if (temp == null || !Number.isFinite(temp)) return '--°';
  const roundedTemp = Math.round(temp);
  return `${roundedTemp}°`;
};

export const formatHighLow = (high: number, low: number) => {
  const formattedHigh = formatTemperature(high);
  const formattedLow = formatTemperature(low);

  return `H: ${formattedHigh} L:${formattedLow}`;
};

/** Supplied icon tokens preserve night/partly-cloudy conditions; unknown is not sunny. */
export function weatherConditionIcon(icon?: string, condition?: string): MaterialIconName | undefined {
  const tokens: Record<string, MaterialIconName> = {
    moon: 'weather-night', sun: 'weather-sunny',
    'cloud-sun': 'weather-partly-cloudy', 'cloud-moon': 'weather-night-partly-cloudy',
    'cloud-rain': 'weather-rainy', snowflake: 'weather-snowy',
  };
  const value = (condition || icon || '').toLowerCase();
  // The upstream token groups storms with rain: prefer the more specific condition.
  if (value.includes('thunder') || value.includes('lightning')) return 'weather-lightning';
  if (icon && tokens[icon]) return tokens[icon];
  if (value.includes('rain') || value.includes('drizzle')) return 'weather-rainy';
  if (value.includes('snow')) return 'weather-snowy';
  if (value.includes('fog') || value.includes('mist') || value.includes('haze')) return 'weather-fog';
  if (value.includes('partly') || value.includes('few clouds') || value.includes('scattered')) return 'weather-partly-cloudy';
  if (value.includes('cloud')) return 'weather-cloudy';
  if (value.includes('clear')) return 'weather-sunny';
  return undefined;
}

export const getWeatherIconName = (condition: string): WeatherIconConfig => ({
  name: weatherConditionIcon(condition) ?? 'weather-cloudy',
  family: 'MaterialCommunityIcons',
});

/** Probability is already a percentage in the API; missing/invalid is not zero. */
export function rainProbability(pop?: string): number | null {
  if (!pop || !/^\s*\d+(?:\.\d+)?%\s*$/.test(pop)) return null;
  const value = Number(pop.trim().slice(0, -1));
  return value >= 0 && value <= 100 ? value : null;
}

export const formatWind = (speed: number, directon: string) => {
  return `${speed} mph ${directon}`;
};
