import { useState, useEffect } from 'react';
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
  const [activity, setActivity] = useState<HealthActivity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const getActivityData = async () => {
    try {
      setIsLoading(true);
      setActivity(mockActivity);
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
    getActivityData();
  }, []);

  return {
    data: activity,
    isLoading: isLoading,
    error: error,
  };
}
