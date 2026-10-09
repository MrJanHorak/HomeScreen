import {AccessibilityInfo, AppState} from 'react-native';
export const narrationEnvironment = {
  canDetectScreenReader: true,
  initialAppState: AppState.currentState,
  readScreenReader: () => AccessibilityInfo.isScreenReaderEnabled(),
  onScreenReaderChange: (listener: (enabled: boolean) => void) => AccessibilityInfo.addEventListener('screenReaderChanged', listener),
  onAppStateChange: (listener: (state: string) => void) => AppState.addEventListener('change', listener),
};
