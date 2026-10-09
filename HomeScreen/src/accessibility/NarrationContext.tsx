import React, {createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Voice} from 'expo-speech';
import {availableVoices, speechDriver} from './speechDriver';
import {narrationEnvironment} from './narrationEnvironment';
import {DEFAULT_NARRATION, NARRATION_STORAGE_KEY, NarrationController, normalizeNarration} from './narration';
import type {NarrationPreference} from './narration';

const noop = () => {};
const NarrationContext = createContext({
  preference: DEFAULT_NARRATION, ready: false, screenReader: null as boolean | null,
  canDetectScreenReader: narrationEnvironment.canDetectScreenReader,
  narrating: false,
  voices: [] as Voice[], voicesLoading: false, error: null as string | null,
  setPreference: (_changes: Partial<NarrationPreference>) => {},
  announce: (_text: string, _owner?: object, _preview?: boolean) => {},
  blur: (_owner: object) => {}, stop: noop, refreshVoices: noop,
});

export function NarrationProvider({children}: {children: React.ReactNode}) {
  const [preference, setSavedPreference] = useState(DEFAULT_NARRATION);
  const preferenceRef = useRef(preference);
  const [ready, setReady] = useState(false);
  const [screenReader, setScreenReader] = useState<boolean | null>(null);
  const [active, setActive] = useState(narrationEnvironment.initialAppState === 'active' || narrationEnvironment.initialAppState === null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const writes = useRef(Promise.resolve());
  const controller = useMemo(() => new NarrationController(speechDriver, () => {
    if (mounted.current) setError('Speech could not play. Check the TV volume and text-to-speech voice, or rebuild the TV app if it has not been updated.');
  }), []);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    let screenReaderEvent = false;
    const reader = narrationEnvironment.onScreenReaderChange((enabled) => {
      screenReaderEvent = true;
      if (enabled) controller.configure(preferenceRef.current, false);
      setScreenReader(enabled);
    });
    const app = narrationEnvironment.onAppStateChange((state) => {
      if (state !== 'active') controller.configure(preferenceRef.current, false);
      setActive(state === 'active');
    });
    void narrationEnvironment.readScreenReader().then((enabled) => {
      if (!cancelled && !screenReaderEvent) setScreenReader(enabled);
    }).catch(() => {
      if (!cancelled) setError('Could not check screen reader settings. Narration is paused to avoid overlapping speech.');
    });
    void AsyncStorage.getItem(NARRATION_STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      const saved = normalizeNarration(stored ? JSON.parse(stored) : null);
      preferenceRef.current = saved;
      setSavedPreference(saved);
    }).catch(() => {
      if (!cancelled) setError('Could not load spoken navigation preferences. You can choose them again below.');
    }).finally(() => {if (!cancelled) setReady(true);});
    return () => {cancelled = true; mounted.current = false; reader.remove(); app.remove(); controller.configure(DEFAULT_NARRATION, false); controller.stop();};
  }, [controller]);

  useLayoutEffect(() => {
    controller.configure(preference, ready && active && screenReader === false);
  }, [controller, preference, ready, active, screenReader]);

  const setPreference = useCallback((changes: Partial<NarrationPreference>) => {
    const next = normalizeNarration({...preferenceRef.current, ...changes});
    preferenceRef.current = next;
    controller.configure(next, ready && active && screenReader === false);
    setSavedPreference(next);
    setError(null);
    writes.current = writes.current.then(() => AsyncStorage.setItem(NARRATION_STORAGE_KEY, JSON.stringify(next))).catch(() => {
      if (mounted.current) setError('Spoken navigation changed, but could not be saved for next time.');
    });
  }, [controller, ready, active, screenReader]);

  const refreshVoices = useCallback(() => {
    setVoicesLoading(true);
    setError(null);
    void availableVoices().then((items) => {
      if (mounted.current) setVoices(items.sort((a, b) => a.language.localeCompare(b.language) || a.name.localeCompare(b.name)));
    }).catch(() => {
      if (mounted.current) setError('Voices are unavailable. Check the device text-to-speech settings, or install the updated TV app.');
    }).finally(() => {if (mounted.current) setVoicesLoading(false);});
  }, []);

  const value = useMemo(() => ({preference, ready, screenReader, canDetectScreenReader: narrationEnvironment.canDetectScreenReader, voices, voicesLoading, error, setPreference,
    narrating: preference.enabled && ready && active && screenReader === false,
    announce: controller.announce, blur: controller.blur, stop: controller.stop, refreshVoices}),
  [preference, ready, active, screenReader, voices, voicesLoading, error, setPreference, controller, refreshVoices]);
  return <NarrationContext.Provider value={value}>{children}</NarrationContext.Provider>;
}

export const useNarration = () => useContext(NarrationContext);
