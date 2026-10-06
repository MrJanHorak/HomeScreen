import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let appState: ReturnType<typeof AppState.addEventListener> | undefined;

function refresh() {
  now = Date.now();
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    refresh();
    timer = setInterval(refresh, 1000);
    appState = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
      appState?.remove();
      appState = undefined;
    }
  };
}

/** One device-clock timer for the header and time-aware cards, refreshed after resume. */
export default function useTVClock(): number {
  return useSyncExternalStore(subscribe, () => now, () => now);
}
