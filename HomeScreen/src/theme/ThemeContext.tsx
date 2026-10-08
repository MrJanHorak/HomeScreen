import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {validWidgetLayout, legacyWidgetProjection} from '../../../server/functions/src/utils/widgets';
import type {WidgetLayout} from '../../../server/functions/src/utils/widgets';
import {
  getSavedGooglePhoto,
  getSavedGooglePhotos,
  getUserAppearance,
  saveUserAppearance,
} from '../services/api';
import type { SelectedPhoto } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AmbientPreference,
  CardId,
  DashboardAppearance,
  DEFAULT_APPEARANCE,
  LAYOUTS,
  LayoutId,
  normalizeAppearance,
} from './appearance';
import {
  PaletteChoice,
  themeForPalette,
  TVTheme,
  TVThemeType,
} from './tvTheme';

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
  ambientPhotos: SelectedPhoto[];
  setGooglePhotos: (photos: SelectedPhoto[], useAsBackground: boolean) => void;
  setAmbientPreference: (changes: Partial<AmbientPreference>) => void;
  moveCard: (id: CardId, direction: -1 | 1) => void;
  toggleCard: (id: CardId) => void;
  toggleCardSize: (id: CardId) => void;
  resetAppearance: () => void;
  setWidgetLayout: (layout: WidgetLayout) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [appearance, setAppearance] =
    useState<DashboardAppearance>(DEFAULT_APPEARANCE);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [ambientPhotos, setAmbientPhotos] = useState<SelectedPhoto[]>([]);
  const photoRevision = useRef(-1);
  const photoSelectionVersion = useRef(0);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const syncedJson = useRef<string | null>(null);
  const pendingWrites = useRef(0);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const ready = uid !== null && hydratedFor === uid;

  useEffect(() => {
    let cancelled = false;
    const currentGeneration = ++generation.current;
    setHydratedFor(null);
    setAppearance(DEFAULT_APPEARANCE);
    setPhotoDataUrl(null);
    setAmbientPhotos([]);
    photoRevision.current = -1;
    syncedJson.current = null;
    if (!uid)
      return () => {
        cancelled = true;
      };
    void (async () => {
      let local = DEFAULT_APPEARANCE;
      try {
        const stored = await AsyncStorage.getItem(`@tv_appearance_v1:${uid}`);
        if (stored) local = normalizeAppearance(JSON.parse(stored));
      } catch (error) {
        console.warn('Could not load local appearance settings:', error);
      }
      try {
        const remote = await getUserAppearance();
        if (cancelled) return;
        if (remote.appearance) {
          if (
            Platform.OS === 'web' &&
            !remote.seededFromWeb &&
            JSON.stringify(local) !== JSON.stringify(DEFAULT_APPEARANCE)
          ) {
            setAppearance(local);
            pendingWrites.current += 1;
            try {
              await saveUserAppearance(local);
              if (!cancelled && generation.current === currentGeneration)
                syncedJson.current = JSON.stringify(local);
            } finally {
              pendingWrites.current -= 1;
            }
          } else {
            const normalized = normalizeAppearance(remote.appearance);
            syncedJson.current = JSON.stringify(normalized);
            setAppearance(normalized);
          }
        } else {
          setAppearance(local);
          if (
            Platform.OS === 'web' &&
            JSON.stringify(local) !== JSON.stringify(DEFAULT_APPEARANCE)
          ) {
            pendingWrites.current += 1;
            try {
              await saveUserAppearance(local);
              if (!cancelled && generation.current === currentGeneration)
                syncedJson.current = JSON.stringify(local);
            } finally {
              pendingWrites.current -= 1;
            }
          } else {
            syncedJson.current = JSON.stringify(local);
          }
        }
      } catch (error) {
        console.warn('Could not sync appearance settings:', error);
        if (!cancelled) {
          syncedJson.current = JSON.stringify(local);
          setAppearance(local);
        }
      } finally {
        if (!cancelled) setHydratedFor(uid);
      }
    })();
    void getSavedGooglePhoto()
      .then((dataUrl) => {
        if (!cancelled) setPhotoDataUrl(dataUrl);
      })
      .catch((error) =>
        console.warn('Could not load Google Photos background:', error),
      );
    void getSavedGooglePhotos()
      .then((photos) => {
        if (!cancelled) setAmbientPhotos(photos);
      })
      .catch((error) =>
        console.warn('Could not load Google Photos gallery:', error),
      );
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !ready) return;
    const serialized = JSON.stringify(appearance);
    void AsyncStorage.setItem(`@tv_appearance_v1:${uid}`, serialized).catch(
      (error) => console.warn('Could not save appearance settings:', error),
    );
    if (
      serialized === syncedJson.current ||
      (syncedJson.current === null &&
        serialized === JSON.stringify(DEFAULT_APPEARANCE))
    )
      return;
    const currentGeneration = generation.current;
    pendingWrites.current += 1;
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (generation.current !== currentGeneration) return;
        await saveUserAppearance(appearance);
        if (generation.current === currentGeneration)
          syncedJson.current = serialized;
      })
      .catch((error) =>
        console.warn('Could not save shared appearance settings:', error),
      )
      .finally(() => {
        pendingWrites.current -= 1;
      });
  }, [appearance, ready, uid]);

  useEffect(() => {
    if (!uid || !ready) return;
    const currentGeneration = generation.current;
    const timer = setInterval(() => {
      if (pendingWrites.current) return;
      void getUserAppearance()
        .then((remote) => {
          if (generation.current !== currentGeneration || pendingWrites.current)
            return;
          if ((remote.photoUpdatedAtMs || 0) !== photoRevision.current) {
            const selectionVersion = photoSelectionVersion.current;
            void Promise.all([getSavedGooglePhoto(), getSavedGooglePhotos()])
              .then(([photo, photos]) => {
                if (
                  generation.current !== currentGeneration ||
                  photoSelectionVersion.current !== selectionVersion
                )
                  return;
                photoRevision.current = remote.photoUpdatedAtMs || 0;
                setPhotoDataUrl(photo);
                setAmbientPhotos(photos);
              })
              .catch((error) =>
                console.warn('Could not refresh shared photos:', error),
              );
          }
          if (!remote.appearance) return;
          const normalized = normalizeAppearance(remote.appearance);
          const serialized = JSON.stringify(normalized);
          if (serialized !== syncedJson.current) {
            syncedJson.current = serialized;
            setAppearance(normalized);
          }
        })
        .catch((error) =>
          console.warn('Could not refresh shared appearance settings:', error),
        );
    }, 45_000);
    return () => clearInterval(timer);
  }, [ready, uid]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      appearance,
      ready,
      photoDataUrl,
      ambientPhotos,
      selectLayout: (layout) =>
        setAppearance((current) => ({
          ...current,
          layout,
          grid: null,
          cards: LAYOUTS[layout].cards.map((card) => ({ ...card })),
        })),
      selectPalette: (palette) =>
        setAppearance((current) => ({ ...current, palette })),
      setCustomAccent: (customAccent) =>
        setAppearance((current) => ({
          ...current,
          customAccent,
          palette: 'custom',
        })),
      setBackground: (background) =>
        setAppearance((current) => ({ ...current, background })),
      setBackgroundColor: (backgroundColor) =>
        setAppearance((current) => ({
          ...current,
          backgroundColor,
          background: 'solid',
        })),
      setGooglePhotos: (photos, useAsBackground) => {
        photoSelectionVersion.current++;
        if (!photos.length) return;
        setAmbientPhotos(photos);
        if (useAsBackground) setPhotoDataUrl(photos[0].dataUrl);
        setAppearance((current) => ({
          ...current,
          background: useAsBackground ? 'google-photo' : current.background,
          ambient: { ...current.ambient, photoSource: 'selected' },
        }));
      },
      setAmbientPreference: (changes) =>
        setAppearance((current) => ({
          ...current,
          ambient: { ...current.ambient, ...changes },
        })),
      moveCard: (id, direction) =>
        setAppearance((current) => {
          const cards = [...current.cards];
          const index = cards.findIndex((card) => card.id === id);
          const next = index + direction;
          if (index < 0 || next < 0 || next >= cards.length) return current;
          [cards[index], cards[next]] = [cards[next], cards[index]];
          return { ...current, layout: 'custom', grid: null, cards };
        }),
      toggleCard: (id) =>
        setAppearance((current) => {
          const card = current.cards.find((item) => item.id === id);
          if (
            !card ||
            (card.visible &&
              current.cards.filter((item) => item.visible).length === 1)
          )
            return current;
          return {
            ...current,
            layout: 'custom',
            grid: null,
            cards: current.cards.map((item) =>
              item.id === id ? { ...item, visible: !item.visible } : item,
            ),
          };
        }),
      toggleCardSize: (id) =>
        setAppearance((current) => ({
          ...current,
          layout: 'custom',
          grid: null,
          cards: current.cards.map((item) =>
            item.id === id
              ? { ...item, size: item.size === 'wide' ? 'standard' : 'wide' }
              : item,
          ),
        })),
      setWidgetLayout: (widgetLayout) => {
        if (validWidgetLayout(widgetLayout)) setAppearance((current) => ({...current, widgetLayout,
          ...legacyWidgetProjection(widgetLayout), layout: 'custom'}));
      },
      resetAppearance: () => setAppearance((current) => ({...DEFAULT_APPEARANCE, ...(current.widgetLayout ? {widgetLayout: current.widgetLayout} : {})})),
    }),
    [ambientPhotos, appearance, photoDataUrl, ready],
  );

  const theme = useMemo(
    () =>
      themeForPalette(
        appearance.palette,
        appearance.customAccent,
        appearance.backgroundColor,
        appearance.background,
      ),
    [
      appearance.palette,
      appearance.customAccent,
      appearance.backgroundColor,
      appearance.background,
    ],
  );
  return (
    <AppearanceContext.Provider value={value}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </AppearanceContext.Provider>
  );
}

export function useTheme(): TVThemeType {
  return useContext(ThemeContext);
}

/** Scope custom card colors to that card's content, leaving the page theme intact. */
export function CardThemeProvider({
  theme,
  children,
}: {
  theme: TVThemeType;
  children: React.ReactNode;
}) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context)
    throw new Error('useAppearance must be used within ThemeProvider');
  return context;
}
