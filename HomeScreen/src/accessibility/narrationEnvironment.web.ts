import {AppState} from 'react-native';
// Browsers do not expose screen reader detection. React Native Web's stub always returns true.
export const narrationEnvironment = {
  canDetectScreenReader: false,
  initialAppState: AppState.currentState,
  readScreenReader: async () => false,
  onScreenReaderChange: (_listener: (enabled: boolean) => void) => ({remove: () => {}}),
  onAppStateChange: (listener: (state: string) => void) => AppState.addEventListener('change', listener),
};
