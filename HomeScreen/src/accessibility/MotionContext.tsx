import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {AccessibilityInfo, AppState, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type MotionPreference = 'system' | 'reduced';
const STORAGE_KEY = '@tv_motion_v1';
const MotionContext = createContext({preference: 'system' as MotionPreference, reduced: false,
  foreground: true, ready: false, error: null as string | null, setPreference: (_value: MotionPreference) => {}});

/** Device-local preference, with OS/browser changes applied while the app is running. */
export function MotionProvider({children}: {children: React.ReactNode}) {
  const [preference, setSaved] = useState<MotionPreference>('system');
  const [systemReduced, setSystemReduced] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writes = React.useRef(Promise.resolve());
  useEffect(() => {
    let live = true;
    let systemRevision = 0;
    const media = Platform.OS === 'web' && typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined;
    const changed = (enabled: boolean) => {systemRevision++; setSystemReduced(enabled);};
    const mediaChanged = () => changed(!!media?.matches);
    const readSystem = () => {
      const revision = ++systemRevision;
      if (media) {setSystemReduced(media.matches); return;}
      void AccessibilityInfo.isReduceMotionEnabled?.().then((value) => {
        if (live && revision === systemRevision) setSystemReduced(value);
      }).catch(() => undefined);
    };
    readSystem();
    media?.addEventListener('change', mediaChanged);
    const motion = Platform.OS !== 'web' ? AccessibilityInfo.addEventListener('reduceMotionChanged', changed) : undefined;
    const app = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      if (state === 'active') readSystem();
    });
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (live) setSaved(stored === 'reduced' ? 'reduced' : 'system');
    }).catch(() => {if (live) setError('Motion preferences could not be loaded.');})
      .finally(() => {if (live) setReady(true);});
    return () => {live = false; media?.removeEventListener('change', mediaChanged); motion?.remove(); app.remove();};
  }, []);
  const setPreference = useCallback((next: MotionPreference) => {
    if (!ready) return;
    setSaved(next);
    setError(null);
    writes.current = writes.current.then(() => AsyncStorage.setItem(STORAGE_KEY, next))
      .catch(() => setError('Motion changed, but could not be saved for next time.'));
  }, [ready]);
  const value = useMemo(() => ({preference, reduced: preference === 'reduced' || systemReduced,
    foreground, ready, error, setPreference}), [preference, systemReduced, foreground, ready, error, setPreference]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export const useMotion = () => useContext(MotionContext);
