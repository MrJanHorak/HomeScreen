import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Weather, CalendarEvent, TaskItem, Activity, DashboardSummaryResponse } from '../../../shared/src/types';
import { fetchDashboardSummary, executeTVAction } from '../services/api';

interface DashboardContextValue {
  weather: Weather | null;
  schedule: CalendarEvent[];
  tasks: TaskItem[];
  health: Activity | null;
  isLoading: boolean;
  isLive: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Auto-refresh every 5 minutes

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [schedule, setSchedule] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [health, setHealth] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data: DashboardSummaryResponse = await fetchDashboardSummary();

      setWeather(data.weather);
      setSchedule(data.schedule || []);
      setTasks(data.tasks || []);
      setHealth(data.health);
      setIsLive(true);
    } catch (err) {
      console.warn('Backend unavailable:', err);
      setWeather(null);
      setSchedule([]);
      setTasks([]);
      setHealth(null);
      setIsLive(false);
      setError(err instanceof Error ? err.message : 'Failed to fetch live data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    // Optimistic UI update
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await executeTVAction('completeTask', { taskId });
    } catch (err) {
      console.error('Failed to complete task on backend:', err);
      // Re-sync on failure
      loadData();
    }
  }, [loadData]);

  useEffect(() => {
    loadData();

    // Auto-refresh interval while TV app is running
    const interval = setInterval(loadData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <DashboardContext.Provider
      value={{
        weather,
        schedule,
        tasks,
        health,
        isLoading,
        isLive,
        error,
        refresh: loadData,
        completeTask,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
