import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { useAuth } from '../context/AuthContext';
import {syncDeviceApps} from '../services/api';

export interface LaunchableApp {
  packageName: string;
  label: string;
  imageUri: string | null;
}

interface FavoriteAppPreferences {
  visible: boolean;
  packages: string[];
}

interface TvAppsModule {
  getLaunchableApps(): Promise<LaunchableApp[]>;
  launchApp(packageName: string): Promise<boolean>;
}

interface FavoriteAppsContextValue {
  availableApps: LaunchableApp[];
  favoriteApps: LaunchableApp[];
  visible: boolean;
  status: 'loading' | 'ready' | 'unavailable' | 'error';
  syncError: string | null;
  setVisible(visible: boolean): void;
  toggleFavorite(packageName: string): void;
  moveFavorite(packageName: string, direction: -1 | 1): void;
  refresh(): Promise<void>;
  launchApp(packageName: string): Promise<boolean>;
}

const STORAGE_PREFIX = '@tv_favorite_apps_v1:';
const EMPTY: FavoriteAppPreferences = { visible: false, packages: [] };
const nativeApps = Platform.OS === 'android'
  ? requireOptionalNativeModule<TvAppsModule>('TvWatchNext')
  : null;
const FavoriteAppsContext = createContext<FavoriteAppsContextValue | null>(null);

export function FavoriteAppsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<FavoriteAppPreferences>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [availableApps, setAvailableApps] = useState<LaunchableApp[]>([]);
  const [status, setStatus] = useState<FavoriteAppsContextValue['status']>('loading');
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncState = useRef({revision: 0, ready: false, busy: false, preferences: EMPTY});
  const preferencesRef = useRef(preferences); preferencesRef.current = preferences;

  const refresh = useCallback(async () => {
    if (!nativeApps || typeof nativeApps.getLaunchableApps !== 'function') {
      setStatus('unavailable');
      return;
    }
    try {
      const apps = await nativeApps.getLaunchableApps();
      setAvailableApps(apps);
      setStatus('ready');
    } catch (error) {
      console.warn('Could not list TV apps:', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setPreferences(EMPTY);
    if (!user) return () => { active = false; };
    void AsyncStorage.getItem(`${STORAGE_PREFIX}${user.uid}`).then((saved) => {
      if (!active) return;
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const value = parsed as Partial<FavoriteAppPreferences>;
          setPreferences({
            visible: value.visible === true,
            packages: Array.isArray(value.packages)
              ? [...new Set(value.packages.filter((item): item is string => typeof item === 'string'))]
              : [],
          });
        }
      }
    }).catch((error) => console.warn('Could not load favorite apps:', error))
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [user?.uid]);

  useEffect(() => {
    if (!loaded || !user) return;
    void AsyncStorage.setItem(`${STORAGE_PREFIX}${user.uid}`, JSON.stringify(preferences))
      .catch((error) => console.warn('Could not save favorite apps:', error));
  }, [loaded, preferences, user?.uid]);

  useEffect(() => {
    void refresh();
    if (Platform.OS !== 'android') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    const state = {revision: 0, ready: false, busy: false, preferences: preferencesRef.current};
    syncState.current = state;
    let active = true;
    if (!loaded || !user || status !== 'ready') return () => { active = false; };
    const sync = async () => {
      if (state.busy) return;
      state.busy = true;
      try {
        const remote = await syncDeviceApps(state.ready ? undefined : {
          apps: availableApps.slice(0,150).map((app) => ({packageName: app.packageName, label: app.label.slice(0,80)})),
          initialPreferences: {...state.preferences, packages: state.preferences.packages.filter((name) => availableApps.some((app) => app.packageName === name)).slice(0,150)},
        });
        if (!active || !remote.preferences) return;
        state.revision = remote.updatedAtMs; state.preferences = remote.preferences; state.ready = true;
        setPreferences(remote.preferences); setSyncError(null);
      } catch (error) { if (active) setSyncError(error instanceof Error ? error.message : 'Could not sync favorite apps.'); }
      finally { state.busy = false; }
    };
    void sync(); const timer = setInterval(() => void sync(), 45000);
    return () => { active = false; clearInterval(timer); };
  }, [loaded, user?.uid, availableApps, status]);

  const changePreferences = useCallback(async (change: (current: FavoriteAppPreferences) => FavoriteAppPreferences) => {
    const state = syncState.current;
    if (!state.ready || state.busy) { setSyncError('Favorite apps are syncing. Try again shortly.'); return; }
    const next = change(state.preferences);
    if (next === state.preferences) return;
    state.busy = true;
    try {
      const result = await syncDeviceApps({preferences: next, expectedUpdatedAtMs: state.revision});
      if (syncState.current !== state) return;
      state.revision = result.updatedAtMs; state.preferences = next; setPreferences(next); setSyncError(null);
    } catch (error) { if (syncState.current === state) setSyncError(error instanceof Error ? error.message : 'Could not save favorite apps.'); }
    finally { state.busy = false; }
  }, []);

  const setVisible = useCallback((visible: boolean) => {
    void changePreferences((current) => ({ ...current, visible }));
  }, [changePreferences]);

  const toggleFavorite = useCallback((packageName: string) => {
    void changePreferences((current) => ({
      ...current,
      packages: current.packages.includes(packageName)
        ? current.packages.filter((name) => name !== packageName)
        : [...current.packages, packageName],
    }));
  }, [changePreferences]);

  const moveFavorite = useCallback((packageName: string, direction: -1 | 1) => {
    void changePreferences((current) => {
      const packages = [...current.packages];
      const index = packages.indexOf(packageName);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= packages.length) return current;
      [packages[index], packages[next]] = [packages[next], packages[index]];
      return { ...current, packages };
    });
  }, [changePreferences]);

  const launchApp = useCallback(async (packageName: string) => {
    if (!nativeApps || typeof nativeApps.launchApp !== 'function') return false;
    try { return await nativeApps.launchApp(packageName); }
    catch (error) {
      console.warn(`Could not launch ${packageName}:`, error);
      return false;
    }
  }, []);

  const favoriteApps = useMemo(() => {
    const byPackage = new Map(availableApps.map((app) => [app.packageName, app]));
    return preferences.packages.map((name) => byPackage.get(name))
      .filter((app): app is LaunchableApp => Boolean(app));
  }, [availableApps, preferences.packages]);

  const value = useMemo<FavoriteAppsContextValue>(() => ({
    availableApps, favoriteApps, visible: Platform.OS === 'android' && loaded && preferences.visible,
    status, syncError, setVisible, toggleFavorite, moveFavorite, refresh, launchApp,
  }), [availableApps, favoriteApps, loaded, preferences.visible, status,
    syncError, setVisible, toggleFavorite, moveFavorite, refresh, launchApp]);

  return <FavoriteAppsContext.Provider value={value}>{children}</FavoriteAppsContext.Provider>;
}

export function useFavoriteApps(): FavoriteAppsContextValue {
  const value = useContext(FavoriteAppsContext);
  if (!value) throw new Error('useFavoriteApps must be used inside FavoriteAppsProvider');
  return value;
}
