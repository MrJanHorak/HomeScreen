import { useDashboard } from '../context/DashboardContext';

export type HealthActivity = {
  steps: number;
  stepGoal: number;
  distance: number;
  distanceGoal: number;
  calories: number;
  activeMinutes: number;
  progress: number;
};

export function useHealthData(): {
  data: HealthActivity | null;
  isLoading: boolean;
  error: string | null;
} {
  const { health, isLoading, error } = useDashboard();
  return { data: health as HealthActivity | null, isLoading, error };
}
