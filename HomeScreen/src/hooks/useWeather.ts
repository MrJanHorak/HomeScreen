import { useDashboard } from '../context/DashboardContext';
import { mockWeather } from '../data/mockData';

export type ForecastItem = {
  day: string;
  condition: string;
  icon: string;
  high: number;
  low: number;
};

export interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  conditionIcon: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  high: number;
  low: number;
  forecast: ForecastItem[];
}

export function useWeather(): {
  data: WeatherData | null;
  isLoading: boolean;
  error: string | null;
} {
  try {
    const { weather, isLoading, error } = useDashboard();
    return {
      data: (weather as unknown as WeatherData) || (mockWeather as unknown as WeatherData),
      isLoading,
      error,
    };
  } catch {
    return {
      data: mockWeather as unknown as WeatherData,
      isLoading: false,
      error: null,
    };
  }
}
