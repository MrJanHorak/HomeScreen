import { useDashboard } from '../context/DashboardContext';

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
  const { weather, isLoading, error } = useDashboard();
  return { data: weather as WeatherData | null, isLoading, error };
}
