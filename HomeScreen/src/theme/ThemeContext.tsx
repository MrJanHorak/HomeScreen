import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSavedGooglePhoto } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CardId, DashboardAppearance, DEFAULT_APPEARANCE, LAYOUTS,
  LayoutId, normalizeAppearance,
} from './appearance';
import { PaletteChoice, themeForPalette, TVTheme, TVThemeType } from './tvTheme';

const ThemeContext = createContext<TVThemeType>(TVTheme);

interface AppearanceContextValue {
  appearance: DashboardAppearance;
  ready: boolean;
  selectLayout: (layout: Exclude<LayoutId, 'custom'>) => void;
  selectPalette: (palette: PaletteChoice) => void;
  setCustomAccent: (accent: string) => void;
  setBackground: (background: DashboardAppearance['background']) => void;
  setBackgroundColor: (color: string) => void;
  photoDataUrl: string | null;
  setGooglePhoto: (dataUrl: string) => void;
  moveCard: (id: CardId, direction: -1 | 1) => void;
  toggleCard: (id: CardId) => void;
  toggleCardSize: (id: CardId) => void;
  resetAppearance: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [appearance, setAppearance] = useState<DashboardAppearance>(DEFAULT_APPEARANCE);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const ready = uid !== null && hydratedFor === uid;

  useEffect(() => {
    let cancelled = false;
    setHydratedFor(null);
    setAppearance(DEFAULT_APPEARANCE);
    setPhotoDataUrl(null);
    if (!uid) return () => { cancelled = true; };
    void AsyncStorage.getItem(`@tv_appearance_v1:${uid}`)
      .then((stored) => {
        if (cancelled) return;
        setAppearance(stored ? normalizeAppearance(JSON.parse(stored)) : DEFAULT_APPEARANCE);
      })
      .catch((error) => {
        console.warn('Could not load appearance settings:', error);
      })
      .finally(() => {
        if (!cancelled) setHydratedFor(uid);
      });
    void getSavedGooglePhoto()
      .then((dataUrl) => { if (!cancelled) setPhotoDataUrl(dataUrl); })
      .catch((error) => console.warn('Could not load Google Photos background:', error));
    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    if (!uid || !ready) return;
    void AsyncStorage.setItem(`@tv_appearance_v1:${uid}`, JSON.stringify(appearance))
      .catch((error) => console.warn('Could not save appearance settings:', error));
  }, [appearance, ready, uid]);

  const value = useMemo<AppearanceContextValue>(() => ({
    appearance,
    ready,
    photoDataUrl,
    selectLayout: (layout) => setAppearance((current) => ({
      ...current, layout, cards: LAYOUTS[layout].cards.map((card) => ({ ...card })),
    })),
    selectPalette: (palette) => setAppearance((current) => ({ ...current, palette })),
    setCustomAccent: (customAccent) => setAppearance((current) => ({ ...current, customAccent, palette: 'custom' })),
    setBackground: (background) => setAppearance((current) => ({ ...current, background })),
    setBackgroundColor: (backgroundColor) => setAppearance((current) => ({ ...current, backgroundColor, background: 'solid' })),
    setGooglePhoto: (dataUrl) => {
      setPhotoDataUrl(dataUrl);
      setAppearance((current) => ({ ...current, background: 'google-photo' }));
    },
    moveCard: (id, direction) => setAppearance((current) => {
      const cards = [...current.cards];
      const index = cards.findIndex((card) => card.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= cards.length) return current;
      [cards[index], cards[next]] = [cards[next], cards[index]];
      return { ...current, layout: 'custom', cards };
    }),
    toggleCard: (id) => setAppearance((current) => {
      const card = current.cards.find((item) => item.id === id);
      if (!card || (card.visible && current.cards.filter((item) => item.visible).length === 1)) return current;
      return {
        ...current, layout: 'custom',
        cards: current.cards.map((item) => item.id === id ? { ...item, visible: !item.visible } : item),
      };
    }),
    toggleCardSize: (id) => setAppearance((current) => ({
      ...current, layout: 'custom',
      cards: current.cards.map((item) => item.id === id
        ? { ...item, size: item.size === 'wide' ? 'standard' : 'wide' } : item),
    })),
    resetAppearance: () => setAppearance(DEFAULT_APPEARANCE),
  }), [appearance, photoDataUrl, ready]);

  const theme = useMemo(() => themeForPalette(
    appearance.palette, appearance.customAccent, appearance.backgroundColor, appearance.background
  ), [appearance.palette, appearance.customAccent, appearance.backgroundColor, appearance.background]);
  return (
    <AppearanceContext.Provider value={value}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </AppearanceContext.Provider>
  );
}

export function useTheme(): TVThemeType { return useContext(ThemeContext); }

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used within ThemeProvider');
  return context;
}
