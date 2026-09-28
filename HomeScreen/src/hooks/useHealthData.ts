import { useDashboard } from '../context/DashboardContext';
import { mockActivity } from '../data/mockData';

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
  try {
    const { health, isLoading, error } = useDashboard();
    return {
      data: (health as unknown as HealthActivity) || (mockActivity as unknown as HealthActivity),
      isLoading,
      error,
    };
  } catch {
    return {
      data: mockActivity as unknown as HealthActivity,
      isLoading: false,
      error: null,
    };
  }
}
