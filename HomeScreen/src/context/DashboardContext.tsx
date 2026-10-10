import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import type {
  Weather,
  CalendarEvent,
  TaskItem,
  Activity,
  DashboardSummaryResponse,
  SavedLocation,
  MealPlanSummary,
} from '../../../shared/src/types';
import type { UserPreferences } from '../../../shared/src/types';
import {
  fetchDashboardSummary,
  fetchLocationWeather,
  executeTVAction,
} from '../services/api';
import { getUserPreferences, saveUserPreferences } from '../services/api';
import { useAuth } from './AuthContext';
import { loadDashboardCache, saveDashboardCache } from '../services/dashboardCache';
import { createDashboardSession } from '../services/dashboardSession';
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
  isCached: boolean;
  lastUpdated: string | null;
  error: string | null;
  locationError: string | null;
  refresh: () => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;

  // Multi-location Weather Support
  savedLocations: SavedLocation[];
  activeLocation: SavedLocation;
  setActiveLocation: (loc: SavedLocation) => void;
  cycleNextLocation: () => void;
  addLocation: (name: string, query: string) => Promise<boolean>;
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
  const [weatherByLocation, setWeatherByLocation] = useState<
    Record<string, Weather>
  >({});
  const [schedule, setSchedule] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [meals, setMeals] = useState<MealPlanSummary>({
    status: 'not_connected',
    items: [],
  });
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [health, setHealth] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isCached, setIsCached] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Multi-location state
  const [savedLocations, setSavedLocations] =
    useState<SavedLocation[]>(DEFAULT_LOCATIONS);
  const [activeLocation, setActiveLocationState] = useState<SavedLocation>(
    DEFAULT_LOCATIONS[0],
  );
  const locationsRef = useRef(savedLocations);
  locationsRef.current = savedLocations;
  const sessionRef = useRef<ReturnType<typeof createDashboardSession> | null>(null);
  const mountedRef = useRef(false);
  const preferenceState = useRef<{
    value: UserPreferences;
    revision: number;
    busy: boolean;
    ready: boolean;
  }>({
    value: {
      savedLocations: DEFAULT_LOCATIONS,
      activeLocationId: DEFAULT_LOCATIONS[0].id,
      stepGoal: 10000,
      distanceGoal: 8,
    },
    revision: 0,
    busy: false,
    ready: false,
  });

  // Load persisted locations on mount
  useEffect(() => {
    let mounted = true;
    const state = {
      value: preferenceState.current.value,
      revision: 0,
      busy: false,
      ready: false,
    };
    preferenceState.current = state;
    setSavedLocations(DEFAULT_LOCATIONS);
    setActiveLocationState(DEFAULT_LOCATIONS[0]);
    setLocationError(null);
    if (!uid) return;
    const local = loadStoredLocations(uid);
    void local.then(({ locations, activeId }) => {
      if (!mounted || state.ready) return;
      setSavedLocations(locations);
      setActiveLocationState(
        locations.find((loc) => loc.id === activeId) || locations[0],
      );
    });
    const sync = async () => {
      if (state.busy) return;
      state.busy = true;
      try {
        const remote = await getUserPreferences();
        if (!mounted) return;
        // Migrate existing on-TV cities once; never replace an account selection.
        if (!remote.hasSavedLocations && !state.ready) {
          const stored = await local;
          if (!mounted) return;
          if (stored.locations !== DEFAULT_LOCATIONS) {
            remote.preferences.savedLocations = stored.locations;
            remote.preferences.activeLocationId = stored.activeId;
            remote.updatedAtMs = await saveUserPreferences(
              remote.preferences,
              remote.updatedAtMs,
            );
          }
        }
        if (!mounted) return;
        state.value = remote.preferences;
        state.revision = remote.updatedAtMs;
        state.ready = true;
        setLocationError(null);
        setSavedLocations((previous) =>
          keepIfUnchanged(previous, state.value.savedLocations),
        );
        const selected =
          state.value.savedLocations.find(
            (loc) => loc.id === state.value.activeLocationId,
          ) || state.value.savedLocations[0];
        setActiveLocationState((previous) =>
          keepIfUnchanged(previous, selected),
        );
        void persistLocations(state.value.savedLocations, selected.id, uid);
      } catch (err) {
        if (mounted)
          setLocationError(
            err instanceof Error
              ? err.message
              : 'Could not sync weather settings.',
          );
      } finally {
        state.busy = false;
      }
    };
    void sync();
    const timer = setInterval(() => void sync(), 45000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [uid]);

  const saveLocations = useCallback(
    async (locations: SavedLocation[], activeId: string) => {
      const state = preferenceState.current;
      if (!state.ready || state.busy) {
        setLocationError('Weather settings are syncing. Try again shortly.');
        return false;
      }
      state.busy = true;
      try {
        const value = {
          ...state.value,
          savedLocations: locations,
          activeLocationId: activeId,
        };
        const revision = await saveUserPreferences(value, state.revision);
        if (preferenceState.current !== state) return false;
        state.value = value;
        state.revision = revision;
        setSavedLocations(locations);
        setActiveLocationState(
          locations.find((loc) => loc.id === activeId) || locations[0],
        );
        await persistLocations(locations, activeId, uid);
        setLocationError(null);
        return true;
      } catch (err) {
        if (preferenceState.current === state)
          setLocationError(
            err instanceof Error
              ? err.message
              : 'Could not save weather settings.',
          );
        return false;
      } finally {
        state.busy = false;
      }
    },
    [uid],
  );

  const applySummary = useCallback((data: DashboardSummaryResponse, cached: boolean) => {
    setSchedule((previous) => keepIfUnchanged(previous, data.schedule || []));
    setUpcomingEvents((previous) =>
      keepIfUnchanged(previous, data.upcomingEvents || []),
    );
    setMeals((previous) =>
      keepIfUnchanged(previous, data.meals || { status: 'not_connected', items: [] }),
    );
    setTasks((previous) => keepIfUnchanged(previous, data.tasks || []));
    setHealth((previous) => keepIfUnchanged(previous, data.health));
    const locations = data.savedLocations?.length ? data.savedLocations : locationsRef.current;
    const defaultLocation = locations.find((location) => location.isDefault) || locations[0];
    if (defaultLocation && data.weather) {
      setWeatherByLocation((previous) => ({
        ...previous,
        [defaultLocation.id]: keepIfUnchanged(previous[defaultLocation.id], data.weather),
      }));
    }
    setIsCached(cached);
    setLastUpdated(data.updatedAt);
    if (!cached) {
      setIsLive(true);
      setError(null);
    }
    setIsLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    await sessionRef.current?.refresh();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const session = createDashboardSession({
      restore: () => loadDashboardCache(uid),
      fetch: fetchDashboardSummary,
      save: (data) => saveDashboardCache(uid, data),
      apply: applySummary,
      failed: (err) => {
        setIsLive(false);
        setError(err instanceof Error ? err.message : 'Failed to fetch live data');
      },
      settled: () => setIsLoading(false),
    });
    sessionRef.current = session;
    void session.restore();
    void session.refresh();
    const interval = setInterval(() => void session.refresh(), REFRESH_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      session.dispose();
      sessionRef.current = null;
      clearInterval(interval);
    };
  }, [uid, applySummary]);

  const completeTask = useCallback(
    async (taskId: string) => {
      // Optimistic UI update
      const task = tasks.find((item) => item.id === taskId);
      setTasks((prev) => prev.filter((item) => item.id !== taskId));

      try {
        await executeTVAction('completeTask', {
          taskId,
          tasklistId: task?.tasklistId,
        });
      } catch (err) {
        console.error('Failed to complete task on backend:', err);
        loadData();
      }
    },
    [loadData, tasks],
  );

  // Multi-location actions
  const setActiveLocation = useCallback(
    (loc: SavedLocation) => {
      void saveLocations(savedLocations, loc.id);
    },
    [savedLocations, saveLocations],
  );

  const cycleNextLocation = useCallback(() => {
    if (savedLocations.length < 2) return;
    const currentIndex = savedLocations.findIndex(
      (loc) => loc.id === activeLocation.id,
    );
    const nextLoc = savedLocations[(currentIndex + 1) % savedLocations.length];
    void saveLocations(savedLocations, nextLoc.id);
  }, [activeLocation.id, savedLocations, saveLocations]);

  const addLocation = useCallback(
    async (name: string, query: string) => {
      if (
        savedLocations.length >= 20 ||
        savedLocations.some(
          (loc) => loc.query.toLowerCase() === query.trim().toLowerCase(),
        )
      )
        return false;
      const newLoc: SavedLocation = {
        id: `loc-${Date.now()}`,
        name: name.trim() || query.trim(),
        query: query.trim(),
        isDefault: false,
      };
      const updated = [...savedLocations, newLoc];
      return saveLocations(updated, newLoc.id);
    },
    [savedLocations, saveLocations],
  );

  const removeLocation = useCallback(
    async (id: string) => {
      if (savedLocations.length <= 1) return; // Keep at least one location
      const remaining = savedLocations.filter((l) => l.id !== id);
      const defaultId =
        remaining.find((loc) => loc.isDefault)?.id || remaining[0].id;
      const updated = remaining.map((loc) => ({
        ...loc,
        isDefault: loc.id === defaultId,
      }));
      const nextActive = activeLocation.id === id ? updated[0] : activeLocation;
      await saveLocations(updated, nextActive.id);
    },
    [savedLocations, activeLocation, saveLocations],
  );

  const setDefaultLocation = useCallback(
    async (id: string) => {
      const updated = savedLocations.map((l) => ({
        ...l,
        isDefault: l.id === id,
      }));
      const targetLoc = updated.find((l) => l.id === id);
      if (targetLoc) {
        await saveLocations(updated, targetLoc.id);
      }
    },
    [savedLocations, saveLocations],
  );

  const getWeatherForLoc = useCallback(
    (loc: SavedLocation): ExtendedWeather =>
      getWeatherForLocation(loc, weatherByLocation[loc.id]),
    [weatherByLocation],
  );

  const currentActiveWeather = getWeatherForLoc(activeLocation);

  const loadLocationWeather = useCallback(async (loc: SavedLocation) => {
    try {
      const result = await fetchLocationWeather(loc.query);
      if (!mountedRef.current) return;
      setWeatherByLocation((previous) => {
        if (keepIfUnchanged(previous[loc.id], result) === previous[loc.id])
          return previous;
        return { ...previous, [loc.id]: result };
      });
    } catch (error) {
      if (!mountedRef.current) return;
      console.warn(`Weather unavailable for ${loc.query}:`, error);
      setWeatherByLocation((previous) => {
        // A failed refresh should not replace weather we already displayed.
        if (previous[loc.id]) return previous;
        return {
          ...previous,
          [loc.id]: { temp: '--', condition: 'Unavailable' },
        };
      });
    }
  }, []);

  useEffect(() => {
    if (activeLocation.isDefault) return;
    void loadLocationWeather(activeLocation);
    const interval = setInterval(
      () => void loadLocationWeather(activeLocation),
      REFRESH_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [activeLocation, loadLocationWeather]);

  const refresh = useCallback(async () => {
    await Promise.all([
      loadData(),
      ...(activeLocation.isDefault
        ? []
        : [loadLocationWeather(activeLocation)]),
    ]);
  }, [activeLocation, loadData, loadLocationWeather]);

  // Preferences may select a new default city; refresh without restarting cache hydration.
  useEffect(() => { void loadData(); }, [savedLocations, loadData]);

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
        isCached,
        lastUpdated,
        error,
        locationError,
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
