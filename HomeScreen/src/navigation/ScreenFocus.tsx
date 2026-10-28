import React, {createContext, useCallback, useContext, useEffect, useRef} from 'react';
import {AppState, Platform} from 'react-native';
import type {View} from 'react-native';
import {FocusMemory} from './focusMemory';

const ScreenFocusContext = createContext<FocusMemory | null>(null);

export function ScreenFocusProvider({children}: {children: React.ReactNode}) {
  const memory = useRef(new FocusMemory()).current;
  return <ScreenFocusContext.Provider value={memory}>{children}</ScreenFocusContext.Provider>;
}

/** Restore after the modal/ambient tree has committed; cancel queued work when covered again. */
export function ScreenFocusRestorer({active}: {active: boolean}) {
  const memory = useContext(ScreenFocusContext);
  useEffect(() => {
    if (!memory) return;
    let first = 0, second = 0;
    let foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    const cancel = () => {cancelAnimationFrame(first); cancelAnimationFrame(second);};
    const restore = () => {
      cancel();
      memory.blocked = true;
      if (active && foreground) {
        if (!memory.hasSelection) {
          memory.blocked = false;
          // A freshly launched TV can have no native focus until an arrow is pressed.
          // Allow any intervening user focus to win before choosing Settings.
          if (Platform.isTV) first = requestAnimationFrame(() => {
            second = requestAnimationFrame(() => memory.focusDefault('header:settings'));
          });
          return;
        }
        first = requestAnimationFrame(() => {second = requestAnimationFrame(() => memory.restore());});
      }
    };
    memory.onMissingTarget = restore;
    restore();
    const app = AppState.addEventListener('change', (state) => {
      foreground = state === 'active';
      restore();
    });
    return () => {
      cancel(); memory.blocked = true; app.remove();
      if (memory.onMissingTarget === restore) memory.onMissingTarget = undefined;
    };
  }, [active, memory]);
  return null;
}

/** Only dashboard entry points participate; detail/settings controls cannot overwrite the return target. */
export function useRememberedFocus(id?: string) {
  const memory = useContext(ScreenFocusContext);
  const unregister = useRef<(() => void) | undefined>(undefined);
  const ref = useCallback((node: View | null) => {
    unregister.current?.();
    unregister.current = undefined;
    if (!node || !id || !memory) return;
    unregister.current = memory.register(id, () => {
      if (Platform.OS === 'web') (node as unknown as {focus?: () => void}).focus?.();
      else node.requestTVFocus?.();
    });
  }, [id, memory]);
  const onFocus = useCallback(() => {if (id) memory?.remember(id);}, [id, memory]);
  return {ref, onFocus};
}
