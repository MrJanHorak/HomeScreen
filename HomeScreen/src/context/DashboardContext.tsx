import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Weather, CalendarEvent, TaskItem, Activity, DashboardSummaryResponse } from '../../../shared/src/types';
import { fetchDashboardSummary, executeTVAction } from '../services/api';
import { mockWeather, mockCalendarEvents, mockActivity } from '../data/mockData';

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

export function DashboardProvider({ children, userId = 'user-001' }: { children: ReactNode; userId?: string }) {
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
      const data: DashboardSummaryResponse = await fetchDashboardSummary(userId);

      setWeather(data.weather);
      setSchedule(data.schedule || []);
      setTasks(data.tasks || []);
      setHealth(data.health);
      setIsLive(true);
    } catch (err) {
      console.warn('Backend unavailable, falling back to mock data:', err);
      // Graceful offline fallback
      setWeather(mockWeather as unknown as Weather);
      setSchedule(mockCalendarEvents as unknown as CalendarEvent[]);
      setTasks([
        { id: 't1', title: 'Laundry', due: 'Today', completed: false },
        { id: 't2', title: 'Walk the dog', due: 'Today', completed: false },
        { id: 't3', title: 'Oil change on Element', due: 'Tomorrow', completed: false },
      ]);
      setHealth(mockActivity as unknown as Activity);
      setIsLive(false);
      setError(err instanceof Error ? err.message : 'Failed to fetch live data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const completeTask = useCallback(async (taskId: string) => {
    // Optimistic UI update
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await executeTVAction('completeTask', { taskId }, userId);
    } catch (err) {
      console.error('Failed to complete task on backend:', err);
      // Re-sync on failure
      loadData();
    }
  }, [userId, loadData]);

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
