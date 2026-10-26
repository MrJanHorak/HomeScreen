import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import type {
  Weather,
  CalendarEvent,
  TaskItem,
  Activity,
  DashboardSummaryResponse,
  SavedLocation,
  MealPlanSummary,
  DashboardSources,
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
import {markStartup} from '../services/startupTiming';
import {preferWeather, weatherLocationKey, weatherRefreshInterval} from '../services/weatherState';
import {
  DEFAULT_LOCATIONS,
  ExtendedWeather,
  getWeatherForLocation,
  loadStoredLocations,
  persistLocations,
} from '../services/weatherLocationService';

interface DashboardContextValue {
  sources?: DashboardSources;
  canCompleteTasks: boolean;
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
  const [sources, setSources] = useState<DashboardSources | undefined>(undefined);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Multi-location state
  const [savedLocations, setSavedLocations] =
    useState<SavedLocation[]>(DEFAULT_LOCATIONS);
  const [activeLocation, setActiveLocationState] = useState<SavedLocation>(
    DEFAULT_LOCATIONS[0],
  );
  const locationsRef = useRef(savedLocations);
  locationsRef.current = savedLocations;
  const defaultLocation = savedLocations.find((location) => location.isDefault) || savedLocations[0];
  const defaultWeatherKey = JSON.stringify([defaultLocation.id, defaultLocation.query]);
  const previousDefaultWeatherKey = useRef(defaultWeatherKey);
  const sessionRef = useRef<ReturnType<typeof createDashboardSession> | null>(null);
  const summaryRef = useRef<DashboardSummaryResponse | null>(null);
  const mountedRef = useRef(false);
  const accountRef = useRef(uid);
  accountRef.current = uid;
  const weatherRequests = useRef(new Map<string, Promise<void>>());
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
    setWeatherByLocation({});
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
    markStartup(cached ? 'cache-applied' : 'live-applied');
    summaryRef.current = data;
    setSources(data.sources);
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
      setWeatherByLocation((previous) => {
        const key = weatherLocationKey(defaultLocation);
        const weather = keepIfUnchanged(previous[key], preferWeather(previous[key], data.weather));
        return weather === previous[key] ? previous : { ...previous, [key]: weather };
      });
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
    markStartup('dashboard-effect');
    const session = createDashboardSession({
      restore: () => loadDashboardCache(uid),
      fetch: fetchDashboardSummary,
      save: (data) => saveDashboardCache(uid, data),
      apply: applySummary,
      failed: (err) => {
        setIsLive(false);
        const previous = summaryRef.current;
        const failedSource = (name: keyof DashboardSources) => {
          const source = previous?.sources?.[name];
          return source?.status === 'not_connected' ? source : {
            status: 'unavailable' as const,
            updatedAt: source ? source.updatedAt : previous?.updatedAt,
          };
        };
        setSources({calendar: failedSource('calendar'), tasks: failedSource('tasks')});
        setError(err instanceof Error ? err.message : 'Failed to fetch live data');
      },
      settled: () => setIsLoading(false),
    });
    sessionRef.current = session;
    void session.restore();
    session.start(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
    const appState = AppState.addEventListener('change', (state) => session.setForeground(state === 'active'));
    return () => {
      mountedRef.current = false;
      session.dispose();
      sessionRef.current = null;
      appState.remove();
    };
  }, [uid, applySummary]);

  const canCompleteTasks = isLive && !isCached && (!sources || sources.tasks.status === 'ok');
  const completeTask = useCallback(
    async (taskId: string) => {
      if (!canCompleteTasks) return;
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
    [loadData, tasks, canCompleteTasks],
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
      getWeatherForLocation(loc, weatherByLocation[weatherLocationKey(loc)]),
    [weatherByLocation],
  );

  const currentActiveWeather = getWeatherForLoc(activeLocation);

  const loadLocationWeather = useCallback((loc: SavedLocation): Promise<void> => {
    if (!uid) return Promise.resolve();
    const key = weatherLocationKey(loc);
    const requestKey = `${uid}:${key}`;
    const pending = weatherRequests.current.get(requestKey);
    if (pending) return pending;
    const current = () => mountedRef.current && accountRef.current === uid &&
      locationsRef.current.some((saved) => weatherLocationKey(saved) === key);
    const request = (async () => {
      let result: Weather;
      try {
        result = await fetchLocationWeather(loc.query);
      } catch (error) {
        console.warn(`Weather unavailable for ${loc.query}:`, error);
        result = {temp: '--', condition: 'Unavailable'};
      }
      if (!current()) return;
      setWeatherByLocation((previous) => {
        if (!current()) return previous;
        const weather = keepIfUnchanged(previous[key], preferWeather(previous[key], result));
        return weather === previous[key] ? previous : {...previous, [key]: weather};
      });
    })();
    weatherRequests.current.set(requestKey, request);
    void request.finally(() => weatherRequests.current.delete(requestKey));
    return request;
  }, [uid]);

  // Prefetch every secondary city. Tab selection does not start another request.
  const secondaryWeatherKey = JSON.stringify(savedLocations.filter((loc) => loc.id !== defaultLocation.id)
    .map((loc) => [loc.id, loc.query]));
  useEffect(() => {
    if (!uid) return;
    const secondary = locationsRef.current.filter((loc) => loc.id !== defaultLocation.id);
    if (!secondary.length) return;
    const refreshCities = () => {
      if (AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
      void Promise.all(secondary.map(loadLocationWeather));
    };
    refreshCities();
    const interval = setInterval(refreshCities, weatherRefreshInterval(secondary.length));
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshCities();
    });
    return () => {clearInterval(interval); listener.remove();};
  }, [uid, secondaryWeatherKey, defaultLocation.id, loadLocationWeather]);

  const refresh = useCallback(async () => {
    await Promise.all([
      loadData(),
      ...savedLocations.filter((loc) => loc.id !== defaultLocation.id).map(loadLocationWeather),
    ]);
  }, [savedLocations, defaultLocation.id, loadData, loadLocationWeather]);

  // A new default city needs weather, not another fetch of the entire dashboard.
  // Ignore list/name changes and the initial render, which already fetches a summary.
  useEffect(() => {
    if (previousDefaultWeatherKey.current === defaultWeatherKey) return;
    previousDefaultWeatherKey.current = defaultWeatherKey;
    void loadLocationWeather(defaultLocation);
  }, [defaultWeatherKey, defaultLocation, loadLocationWeather]);

  return (
    <DashboardContext.Provider
      value={{
        sources,
        canCompleteTasks,
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
