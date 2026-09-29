import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Weather, CalendarEvent, TaskItem, Activity, DashboardSummaryResponse, SavedLocation } from '../../../shared/src/types';
import { fetchDashboardSummary, executeTVAction } from '../services/api';
import {
  DEFAULT_LOCATIONS,
  ExtendedWeather,
  getWeatherForLocation,
  loadStoredLocations,
  persistLocations,
} from '../services/weatherLocationService';

interface DashboardContextValue {
  weather: ExtendedWeather | null;
  schedule: CalendarEvent[];
  tasks: TaskItem[];
  health: Activity | null;
  isLoading: boolean;
  isLive: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;

  // Multi-location Weather Support
  savedLocations: SavedLocation[];
  activeLocation: SavedLocation;
  setActiveLocation: (loc: SavedLocation) => void;
  cycleNextLocation: () => void;
  addLocation: (name: string, query: string) => Promise<void>;
  removeLocation: (id: string) => Promise<void>;
  setDefaultLocation: (id: string) => Promise<void>;
  getWeatherForLoc: (loc: SavedLocation) => ExtendedWeather;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Auto-refresh every 5 minutes

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [rawLiveWeather, setRawLiveWeather] = useState<Weather | null>(null);
  const [schedule, setSchedule] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [health, setHealth] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-location state
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(DEFAULT_LOCATIONS);
  const [activeLocation, setActiveLocationState] = useState<SavedLocation>(DEFAULT_LOCATIONS[0]);

  // Load persisted locations on mount
  useEffect(() => {
    loadStoredLocations().then(({ locations, activeId }) => {
      setSavedLocations(locations);
      const active = locations.find((l) => l.id === activeId) || locations[0];
      setActiveLocationState(active);
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data: DashboardSummaryResponse = await fetchDashboardSummary();

      setRawLiveWeather(data.weather);
      setSchedule(data.schedule || []);
      setTasks(data.tasks || []);
      setHealth(data.health);
      setIsLive(true);

      // If backend has user's saved locations, sync with local state
      if (data.savedLocations && data.savedLocations.length > 0) {
        setSavedLocations(data.savedLocations);
        const defaultLoc = data.savedLocations.find((l) => l.isDefault) || data.savedLocations[0];
        setActiveLocationState((prev) =>
          data.savedLocations?.some((l) => l.id === prev.id) ? prev : defaultLoc
        );
        persistLocations(data.savedLocations, defaultLoc.id);
      }
    } catch (err) {
      console.warn('Backend unavailable:', err);
      setRawLiveWeather(null);
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
    const task = tasks.find((item) => item.id === taskId);
    setTasks((prev) => prev.filter((item) => item.id !== taskId));

    try {
      await executeTVAction('completeTask', { taskId, tasklistId: task?.tasklistId });
    } catch (err) {
      console.error('Failed to complete task on backend:', err);
      loadData();
    }
  }, [loadData, tasks]);

  // Multi-location actions
  const setActiveLocation = useCallback((loc: SavedLocation) => {
    setActiveLocationState(loc);
    persistLocations(savedLocations, loc.id);
  }, [savedLocations]);

  const cycleNextLocation = useCallback(() => {
    setSavedLocations((currentLocs) => {
      const currentIndex = currentLocs.findIndex((l) => l.id === activeLocation.id);
      const nextIndex = (currentIndex + 1) % currentLocs.length;
      const nextLoc = currentLocs[nextIndex];
      setActiveLocationState(nextLoc);
      persistLocations(currentLocs, nextLoc.id);
      return currentLocs;
    });
  }, [activeLocation.id]);

  const addLocation = useCallback(async (name: string, query: string) => {
    const newLoc: SavedLocation = {
      id: `loc-${Date.now()}`,
      name: name.trim() || query.trim(),
      query: query.trim(),
      isDefault: false,
    };
    const updated = [...savedLocations, newLoc];
    setSavedLocations(updated);
    setActiveLocationState(newLoc);
    await persistLocations(updated, newLoc.id);

    // Sync to Firestore DB
    const targetDefault = updated.find((l) => l.isDefault) || updated[0];
    executeTVAction('updatePreferences', {
      savedLocations: updated,
      weatherCity: targetDefault.query,
    }).catch((err) => console.warn('Could not sync locations to backend:', err));
  }, [savedLocations]);

  const removeLocation = useCallback(async (id: string) => {
    if (savedLocations.length <= 1) return; // Keep at least one location
    const updated = savedLocations.filter((l) => l.id !== id);
    const nextActive = activeLocation.id === id ? updated[0] : activeLocation;
    setSavedLocations(updated);
    setActiveLocationState(nextActive);
    await persistLocations(updated, nextActive.id);

    // Sync to Firestore DB
    const targetDefault = updated.find((l) => l.isDefault) || updated[0];
    executeTVAction('updatePreferences', {
      savedLocations: updated,
      weatherCity: targetDefault.query,
    }).catch((err) => console.warn('Could not sync locations to backend:', err));
  }, [savedLocations, activeLocation]);

  const setDefaultLocation = useCallback(async (id: string) => {
    const updated = savedLocations.map((l) => ({
      ...l,
      isDefault: l.id === id,
    }));
    setSavedLocations(updated);
    const targetLoc = updated.find((l) => l.id === id);
    if (targetLoc) {
      setActiveLocationState(targetLoc);
      await persistLocations(updated, targetLoc.id);
      // Sync default preference and location list with backend
      try {
        await executeTVAction('updatePreferences', {
          savedLocations: updated,
          weatherCity: targetLoc.query,
        });
      } catch (e) {
        console.warn('Could not sync default location to backend:', e);
      }
    }
  }, [savedLocations]);


  const getWeatherForLoc = useCallback(
    (loc: SavedLocation): ExtendedWeather => {
      return getWeatherForLocation(loc, rawLiveWeather);
    },
    [rawLiveWeather]
  );

  // Computed weather for the currently active location
  const currentActiveWeather: ExtendedWeather = getWeatherForLocation(activeLocation, rawLiveWeather);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <DashboardContext.Provider
      value={{
        weather: currentActiveWeather,
        schedule,
        tasks,
        health,
        isLoading,
        isLive,
        error,
        refresh: loadData,
        completeTask,

        savedLocations,
        activeLocation,
        setActiveLocation,
        cycleNextLocation,
        addLocation,
        removeLocation,
        setDefaultLocation,
        getWeatherForLoc,
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

