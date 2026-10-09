import {createContext, useContext, useEffect} from 'react';
import {useWindowDimensions} from 'react-native';
import {useTheme} from '../../theme/ThemeContext';

export const DetailFrameContext = createContext<{width: number; height: number} | null>(null);
export const DetailBackContext = createContext<((handler: () => void) => () => void) | null>(null);
export function useDetailBackHandler(handler: () => void) {
  const register = useContext(DetailBackContext);
  useEffect(() => register?.(handler), [register, handler]);
}
export function useDetailLayout() {
  const screen = useWindowDimensions();
  const frame = useContext(DetailFrameContext) || {width: screen.width - 56, height: screen.height - 100};
  const theme = useTheme();
  const fontScale = Math.max(1, screen.fontScale || 1);
  return {...frame, compact: screen.height < 700,
    twoColumns: frame.width / fontScale >= (theme.reading.font === 'opendyslexic' ? 760 : 680)};
}
