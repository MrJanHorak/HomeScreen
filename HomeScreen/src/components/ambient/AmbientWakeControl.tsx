import {Platform, StyleSheet} from 'react-native';
import type {ViewProps} from 'react-native';
import {requireNativeView} from 'expo';

interface WakeProps extends ViewProps {
  onWake: () => void;
}
const NativeWake = Platform.OS === 'android'
  ? requireNativeView<WakeProps>('TvWatchNext', 'AmbientWakeView') : null;

/** The ambient surface owns Android focus and consumes the key before restoring dashboard focus. */
export default function AmbientWakeControl({onWake}: {onWake: () => void}) {
  if (!NativeWake || !Platform.isTV) return null;
  return <NativeWake style={StyleSheet.absoluteFill} onWake={onWake}
    accessibilityRole='button' accessibilityLabel='Return to dashboard'/>;
}
