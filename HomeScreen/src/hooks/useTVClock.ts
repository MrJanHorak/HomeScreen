import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

let now = Date.now();
const listeners = new Set<() => void>();
const deadlines = new Map<() => void, number>();
let timer: ReturnType<typeof setTimeout> | undefined;
let appState: ReturnType<typeof AppState.addEventListener> | undefined;

function schedule() {
  clearTimeout(timer);
  timer = undefined;
  if (!listeners.size || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
  // Ordinary labels display minutes. Polls can request their exact closing boundary.
  const current = Date.now();
  let delay = 60_000 - current % 60_000;
  for (const deadline of deadlines.values()) {
    if (Number.isFinite(deadline) && deadline > current) delay = Math.min(delay, deadline - current);
  }
  timer = setTimeout(() => {refresh(); schedule();}, Math.min(delay, 2_147_483_647));
}

function refresh() {
  now = Date.now();
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void, deadline?: number) {
  listeners.add(listener);
  if (deadline !== undefined) deadlines.set(listener, deadline);
  refresh();
  schedule();
  if (!appState) {
    appState = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
      schedule();
    });
  }
  return () => {
    listeners.delete(listener);
    deadlines.delete(listener);
    if (!listeners.size) {
      clearTimeout(timer);
      timer = undefined;
      appState?.remove();
      appState = undefined;
    } else schedule();
  };
}

/** One device-clock timer for the header and time-aware cards, refreshed after resume. */
export default function useTVClock(deadline?: number): number {
  const subscribeToClock = useCallback((listener: () => void) => subscribe(listener, deadline), [deadline]);
  return useSyncExternalStore(subscribeToClock, () => now, () => now);
}
