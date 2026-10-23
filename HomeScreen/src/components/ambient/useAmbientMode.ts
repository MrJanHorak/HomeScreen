import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Platform, TVEventHandler } from 'react-native';

/** Idle time is measured from remote or keyboard input while the app is foregrounded. */
export function useAmbientMode(
  enabled: boolean,
  idleMinutes: number,
  suspended: boolean,
) {
  const [active, setActive] = useState(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background',
  );
  const [activity, setActivity] = useState(0);

  const wake = useCallback(() => {
    setActive(false);
    setActivity((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!Platform.isTV) return;
    const subscription = TVEventHandler.addListener((event) => {
      // The select release can arrive after its onPress opens the preview.
      // Ambient's focused control owns Select so its release cannot activate a dashboard item.
      if (
        event?.eventType &&
        event.eventKeyAction !== 1 &&
        !(activeRef.current && event.eventType === 'select') &&
        event.eventType !== 'focus' &&
        event.eventType !== 'blur'
      )
        wake();
    });
    return () => subscription?.remove();
  }, [wake]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onInput = () => wake();
    window.addEventListener('keydown', onInput);
    window.addEventListener('pointerdown', onInput);
    return () => {
      window.removeEventListener('keydown', onInput);
      window.removeEventListener('pointerdown', onInput);
    };
  }, [wake]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      wake();
    });
    return () => subscription.remove();
  }, [wake]);

  useEffect(() => {
    if (!enabled || suspended || !foreground) {
      setActive(false);
      return;
    }
    if (active) return;
    const timer = setTimeout(() => setActive(true), idleMinutes * 60_000);
    return () => clearTimeout(timer);
  }, [active, activity, enabled, foreground, idleMinutes, suspended]);

  useEffect(() => {
    if (!active || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        wake();
        return true;
      },
    );
    return () => subscription.remove();
  }, [active, wake]);

  return { active, wake, preview: () => setActive(true) };
}

export default useAmbientMode;
