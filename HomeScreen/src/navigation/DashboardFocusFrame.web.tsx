import {useEffect, useRef} from 'react';
import type {ReactNode} from 'react';
import {View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';

export default function DashboardFocusFrame({hidden, style, children}: {
  hidden: boolean; style: StyleProp<ViewStyle>; children: ReactNode;
}) {
  const ref = useRef<View>(null);
  useEffect(() => {
    // Inert preserves layout but excludes descendants from keyboard and accessibility navigation.
    const element = ref.current as unknown as HTMLElement | null;
    if (element) element.inert = hidden;
  }, [hidden]);
  return <View ref={ref} aria-hidden={hidden} pointerEvents={hidden ? 'none' : 'auto'}
    style={[style, {opacity: hidden ? 0 : 1}]}>{children}</View>;
}
