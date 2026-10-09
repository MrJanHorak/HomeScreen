const listeners = new Set<(enabled: boolean) => void>();
const appListeners = new Set<(state: string) => void>();
Object.assign(window, {
  setTestScreenReader: (enabled: boolean) => listeners.forEach((listener) => listener(enabled)),
  setTestAppState: (state: string) => appListeners.forEach((listener) => listener(state)),
});
export const narrationEnvironment = {
  canDetectScreenReader: true,
  initialAppState: 'active',
  readScreenReader: async () => false,
  onScreenReaderChange: (listener: (enabled: boolean) => void) => {
    listeners.add(listener); return {remove: () => listeners.delete(listener)};
  },
  onAppStateChange: (listener: (state: string) => void) => {
    appListeners.add(listener); return {remove: () => appListeners.delete(listener)};
  },
};
