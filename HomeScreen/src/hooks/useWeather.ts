import { useDashboard } from '../context/DashboardContext';
import type { Weather } from '../../../shared/src/types';

export function useWeather(): {
  data: Weather | null;
  isLoading: boolean;
  error: string | null;
} {
  const { weather, error } = useDashboard();
  return { data: weather, isLoading: weather?.condition === 'Loading weather', error };
}
