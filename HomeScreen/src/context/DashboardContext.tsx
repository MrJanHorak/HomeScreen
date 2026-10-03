import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Weather, CalendarEvent, TaskItem, Activity, DashboardSummaryResponse,
  SavedLocation, MealPlanSummary } from '../../../shared/src/types';
import { fetchDashboardSummary, fetchLocationWeather, executeTVAction } from '../services/api';
import { useAuth } from './AuthContext';
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
  upcomingEvents: CalendarEvent[];
  meals: MealPlanSummary;
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

function keepIfUnchanged<T>(previous: T, next: T): T {
  return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid || '';
  const [weatherByLocation, setWeatherByLocation] = useState<Record<string, Weather>>({});
  const [schedule, setSchedule] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [meals, setMeals] = useState<MealPlanSummary>({status: 'not_connected', items: []});
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
    loadStoredLocations(uid).then(({ locations, activeId }) => {
      setSavedLocations(locations);
      const active = locations.find((l) => l.id === activeId) || locations[0];
      setActiveLocationState(active);
    });
  }, [uid]);

  const loadData = useCallback(async () => {
    try {
      const data: DashboardSummaryResponse = await fetchDashboardSummary();

      setSchedule((previous) => keepIfUnchanged(previous, data.schedule || []));
      setUpcomingEvents((previous) => keepIfUnchanged(previous, data.upcomingEvents || []));
      setMeals((previous) => keepIfUnchanged(previous, data.meals || {status: 'not_connected', items: []}));
      setTasks((previous) => keepIfUnchanged(previous, data.tasks || []));
      setHealth((previous) => keepIfUnchanged(previous, data.health));
      const defaultLocation = savedLocations.find((location) => location.isDefault) || savedLocations[0];
      if (defaultLocation && data.weather) {
        setWeatherByLocation((previous) => ({
          ...previous,
          [defaultLocation.id]: keepIfUnchanged(previous[defaultLocation.id], data.weather),
        }));
      }
      setIsLive(true);
      setError(null);

    } catch (err) {
      console.warn('Backend unavailable:', err);
      // Keep the last successful snapshot visible during a temporary outage.
      setIsLive(false);
      setError(err instanceof Error ? err.message : 'Failed to fetch live data');
    } finally {
      setIsLoading(false);
    }
  }, [savedLocations]);

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
    void persistLocations(savedLocations, loc.id, uid);
  }, [savedLocations, uid]);

  const cycleNextLocation = useCallback(() => {
    if (savedLocations.length < 2) return;
    const currentIndex = savedLocations.findIndex((loc) => loc.id === activeLocation.id);
    const nextLoc = savedLocations[(currentIndex + 1) % savedLocations.length];
    setActiveLocationState(nextLoc);
    void persistLocations(savedLocations, nextLoc.id, uid);
  }, [activeLocation.id, savedLocations, uid]);

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
    await persistLocations(updated, newLoc.id, uid);

    // Sync to Firestore DB
    const targetDefault = updated.find((l) => l.isDefault) || updated[0];
    executeTVAction('updatePreferences', {
      savedLocations: updated,
      weatherCity: targetDefault.query,
    }).catch((err) => console.warn('Could not sync locations to backend:', err));
  }, [savedLocations, uid]);

  const removeLocation = useCallback(async (id: string) => {
    if (savedLocations.length <= 1) return; // Keep at least one location
    const remaining = savedLocations.filter((l) => l.id !== id);
    const defaultId = remaining.find((loc) => loc.isDefault)?.id || remaining[0].id;
    const updated = remaining.map((loc) => ({ ...loc, isDefault: loc.id === defaultId }));
    const nextActive = activeLocation.id === id ? updated[0] : activeLocation;
    setSavedLocations(updated);
    setActiveLocationState(nextActive);
    await persistLocations(updated, nextActive.id, uid);

    // Sync to Firestore DB
    const targetDefault = updated.find((l) => l.isDefault) || updated[0];
    executeTVAction('updatePreferences', {
      savedLocations: updated,
      weatherCity: targetDefault.query,
    }).catch((err) => console.warn('Could not sync locations to backend:', err));
  }, [savedLocations, activeLocation, uid]);

  const setDefaultLocation = useCallback(async (id: string) => {
    const updated = savedLocations.map((l) => ({
      ...l,
      isDefault: l.id === id,
    }));
    setSavedLocations(updated);
    const targetLoc = updated.find((l) => l.id === id);
    if (targetLoc) {
      setActiveLocationState(targetLoc);
      await persistLocations(updated, targetLoc.id, uid);
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
  }, [savedLocations, uid]);


  const getWeatherForLoc = useCallback(
    (loc: SavedLocation): ExtendedWeather =>
      getWeatherForLocation(loc, weatherByLocation[loc.id]),
    [weatherByLocation]
  );

  const currentActiveWeather = getWeatherForLoc(activeLocation);

  const loadLocationWeather = useCallback(async (loc: SavedLocation) => {
    try {
      const result = await fetchLocationWeather(loc.query);
      setWeatherByLocation((previous) => {
        if (keepIfUnchanged(previous[loc.id], result) === previous[loc.id]) return previous;
        return { ...previous, [loc.id]: result };
      });
    } catch (error) {
      console.warn(`Weather unavailable for ${loc.query}:`, error);
      setWeatherByLocation((previous) => {
        // A failed refresh should not replace weather we already displayed.
        if (previous[loc.id]) return previous;
        return { ...previous, [loc.id]: { temp: '--', condition: 'Unavailable' } };
      });
    }
  }, []);

  useEffect(() => {
    if (activeLocation.isDefault) return;
    void loadLocationWeather(activeLocation);
    const interval = setInterval(() => void loadLocationWeather(activeLocation), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeLocation, loadLocationWeather]);

  const refresh = useCallback(async () => {
    await Promise.all([loadData(), ...(activeLocation.isDefault ? [] : [loadLocationWeather(activeLocation)])]);
  }, [activeLocation, loadData, loadLocationWeather]);

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
        upcomingEvents,
        meals,
        tasks,
        health,
        isLoading,
        isLive,
        error,
        refresh,
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

