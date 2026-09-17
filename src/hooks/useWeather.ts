import { useEffect, useState } from 'react';
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
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const getWeatherData = async () => {
    try {
      setIsLoading(true);
      setCurrentWeather(mockWeather);
      setIsLoading(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getWeatherData();
  }, []);

  return {
    data: currentWeather,
    isLoading: isLoading,
    error: error,
  };
}
