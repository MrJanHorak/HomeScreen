import type {ReactNode} from 'react';
import {TVFocusGuideView} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';

/** Preserve widget measurements/state under ambient mode while disabling all descendant focus. */
export default function DashboardFocusFrame({hidden, style, children}: {
  hidden: boolean; style: StyleProp<ViewStyle>; children: ReactNode;
}) {
  return <TVFocusGuideView focusable={!hidden} style={[style, {opacity: hidden ? 0 : 1}]}
    pointerEvents={hidden ? 'none' : 'auto'} accessibilityElementsHidden={hidden}
    importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}>{children}</TVFocusGuideView>;
}
