import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import type { Permission } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { useAuth } from '../context/AuthContext';

const READ_TV_LISTINGS = 'android.permission.READ_TV_LISTINGS' as Permission;
const PREFERENCES_KEY = 'tv-watch-next-preferences-v1';

export interface WatchNextItem {
  id: number;
  title: string;
  packageName: string | null;
  appName: string | null;
  lastEngagementMs: number | null;
  positionMs: number | null;
  durationMs: number | null;
  posterUri: string | null;
  episodeTitle: string | null;
  season: string | null;
  episode: string | null;
}

export interface HiddenWatchItem {
  key: string;
  title: string;
  appName: string;
}

interface WatchPreferences {
  featuredKey: string | null;
  hidden: HiddenWatchItem[];
}

interface TvWatchNextModule {
  getContinueWatching(): Promise<WatchNextItem[]>;
  openProgram(id: number): Promise<boolean>;
}

type WatchStatus = 'web' | 'loading' | 'permission' | 'unavailable' | 'ready' | 'error';

interface WatchNextContextValue {
  items: WatchNextItem[];
  hidden: HiddenWatchItem[];
  status: WatchStatus;
  refresh(): Promise<void>;
  requestAccess(): Promise<void>;
  openProgram(id: number): Promise<boolean>;
  feature(item: WatchNextItem): Promise<void>;
  hide(item: WatchNextItem): Promise<void>;
  restore(key: string): Promise<void>;
}

const nativeWatchNext = Platform.OS === 'android'
  ? requireOptionalNativeModule<TvWatchNextModule>('TvWatchNext')
  : null;
const WatchNextContext = createContext<WatchNextContextValue | null>(null);
const emptyPreferences: WatchPreferences = { featuredKey: null, hidden: [] };

// Keep a series hidden when its Play Next row changes to a later episode.
export function watchNextKey(item: WatchNextItem): string {
  return `${item.packageName || 'unknown'}:${item.title.trim().toLowerCase()}`;
}

export function WatchNextProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid || '';
  const preferenceKey = `${PREFERENCES_KEY}:${uid}`;
  const [rawItems, setRawItems] = useState<WatchNextItem[]>([]);
  const [preferences, setPreferences] = useState<WatchPreferences | null>(null);
  const preferencesRef = useRef<WatchPreferences>(emptyPreferences);
  const [status, setStatus] = useState<WatchStatus>(Platform.OS === 'android' ? 'loading' : 'web');

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (!nativeWatchNext) {
      setStatus('unavailable');
      return;
    }
    try {
      if (!(await PermissionsAndroid.check(READ_TV_LISTINGS))) {
        setRawItems([]);
        setStatus('permission');
        return;
      }
      setRawItems(await nativeWatchNext.getContinueWatching());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      if (Platform.OS !== 'android') {
        setPreferences(emptyPreferences);
        return;
      }
      try {
        await AsyncStorage.removeItem(PREFERENCES_KEY);
        const saved = await AsyncStorage.getItem(preferenceKey);
        if (saved && active) {
          const parsed = JSON.parse(saved) as Partial<WatchPreferences>;
          const next: WatchPreferences = {
            featuredKey: typeof parsed.featuredKey === 'string' ? parsed.featuredKey : null,
            hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter(
              entry => typeof entry?.key === 'string' && typeof entry?.title === 'string' && typeof entry?.appName === 'string'
            ) : [],
          };
          preferencesRef.current = next;
          setPreferences(next);
        } else if (active) {
          setPreferences(emptyPreferences);
        }
      } catch {
        if (active) setPreferences(emptyPreferences);
      }
      if (active) void refresh();
    }
    void initialize();
    if (Platform.OS !== 'android') return () => { active = false; };
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => { active = false; subscription.remove(); };
  }, [refresh, preferenceKey]);

  const save = useCallback(async (next: WatchPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    await AsyncStorage.setItem(preferenceKey, JSON.stringify(next));
  }, [preferenceKey]);

  const feature = useCallback(async (item: WatchNextItem) => {
    await save({ ...preferencesRef.current, featuredKey: watchNextKey(item) });
  }, [save]);

  const hide = useCallback(async (item: WatchNextItem) => {
    const key = watchNextKey(item);
    const current = preferencesRef.current;
    if (current.hidden.some(entry => entry.key === key)) return;
    await save({
      featuredKey: current.featuredKey === key ? null : current.featuredKey,
      hidden: [...current.hidden, {
        key,
        title: item.title,
        appName: item.appName || item.packageName || 'TV app',
      }],
    });
  }, [save]);

  const restore = useCallback(async (key: string) => {
    await save({
      ...preferencesRef.current,
      hidden: preferencesRef.current.hidden.filter(entry => entry.key !== key),
    });
  }, [save]);

  const items = useMemo(() => {
    if (!preferences) return [];
    const hiddenKeys = new Set(preferences.hidden.map(entry => entry.key));
    const visible = rawItems.filter(item => !hiddenKeys.has(watchNextKey(item)));
    if (!preferences.featuredKey) return visible;
    const index = visible.findIndex(item => watchNextKey(item) === preferences.featuredKey);
    if (index < 1) return visible;
    return [visible[index], ...visible.slice(0, index), ...visible.slice(index + 1)];
  }, [rawItems, preferences]);

  const requestAccess = useCallback(async () => {
    if (Platform.OS !== 'android' || !nativeWatchNext) return;
    try {
      const result = await PermissionsAndroid.request(READ_TV_LISTINGS, {
        title: 'Continue Watching',
        message: 'Allow this dashboard to show unfinished titles from your TV’s Play Next row.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      });
      if (result === PermissionsAndroid.RESULTS.GRANTED) await refresh();
    } catch {
      setStatus('error');
    }
  }, [refresh]);

  const openProgram = useCallback(async (id: number) => {
    if (!nativeWatchNext) return false;
    try { return await nativeWatchNext.openProgram(id); }
    catch { return false; }
  }, []);

  const value = useMemo<WatchNextContextValue>(() => ({
    items,
    hidden: preferences?.hidden || [],
    status,
    refresh,
    requestAccess,
    openProgram,
    feature,
    hide,
    restore,
  }), [items, preferences, status, refresh, requestAccess, openProgram, feature, hide, restore]);

  return <WatchNextContext.Provider value={value}>{children}</WatchNextContext.Provider>;
}

export function useWatchNext(): WatchNextContextValue {
  const value = useContext(WatchNextContext);
  if (!value) throw new Error('useWatchNext must be used inside WatchNextProvider');
  return value;
}
