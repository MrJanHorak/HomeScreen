import { useDashboard } from '../context/DashboardContext';
import type { Activity } from '../../../shared/src/types';

export function useHealthData(): {
  data: Activity | null;
  isLoading: boolean;
  error: string | null;
} {
  const { health, isLoading, error } = useDashboard();
  return { data: health, isLoading, error };
}
