import { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import {useMotion} from '../accessibility/MotionContext';

/** Track remote focus for a group of controls and apply their common highlight. */
export function useControlFocus() {
  const theme = useTheme();
  const {reduced} = useMotion();
  const [focusedControl, setFocusedControl] = useState<string | null>(null);

  const focusProps = (id: string) => ({
    onFocus: () => setFocusedControl(id),
    onBlur: () =>
      setFocusedControl((current) => (current === id ? null : current)),
  });

  const focusStyle = (id: string) =>
    focusedControl === id
      ? {
          borderColor: theme.colors.focusRing,
          borderWidth: 3,
          transform: [{ scale: reduced ? 1 : 1.03 }],
        }
      : null;

  return { focusedControl, focusProps, focusStyle };
}
