import { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface WeatherIconConfig {
  name: MaterialIconName;
  family: string;
}

export const formatTemperature = (temp: number) => {
  if (!temp) return '--°';
  const roundedTemp = Math.round(temp);
  return `${roundedTemp}°`;
};

export const formatHighLow = (high: number, low: number) => {
  const formattedHigh = formatTemperature(high);
  const formattedLow = formatTemperature(low);

  return `H: ${formattedHigh} L:${formattedLow}`;
};

export const getWeatherIconName = (condition: string): WeatherIconConfig => {
  switch (condition) {
    case 'moon':
      return { name: 'weather-night', family: 'MaterialCommunityIcons' };
    case 'sun':
      return { name: 'weather-sunny', family: 'MaterialCommunityIcons' };
    case 'cloud-sun':
      return {
        name: 'weather-partly-cloudy',
        family: 'MaterialCommunityIcons',
      };
    case 'cloud-rain':
      return { name: 'weather-rainy', family: 'MaterialCommunityIcons' };
    default:
      return { name: 'weather-cloudy', family: 'MaterialCommunityIcons' };
  }
};

export const formatWind = (speed: number, directon: string) => {
  return `${speed} mph ${directon}`;
};
