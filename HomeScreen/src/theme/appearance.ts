import type { PaletteChoice } from './tvTheme';
import { normalizeHexColor } from './tvTheme';
import { validGrid } from '../../../server/functions/src/utils/dashboardLayout';
import type { DashboardGridLayout } from '../../../server/functions/src/utils/dashboardLayout';
import { validCardStyles } from '../../../server/functions/src/utils/cardStyle';
import type { CardStyles } from '../../../server/functions/src/utils/cardStyle';
import { DEFAULT_PHOTO_ZOOM, normalizePhotoZoom } from '../../../server/functions/src/utils/photoFraming';

export const CARD_IDS = ['weather', 'schedule', 'activity', 'media', 'meal', 'todo'] as const;
export type CardId = typeof CARD_IDS[number];
export type LayoutId = 'balanced' | 'agenda' | 'wellness' | 'calm' | 'custom';
export type CardSize = 'standard' | 'wide';

export interface CardPreference {
  id: CardId;
  visible: boolean;
  size: CardSize;
}

export interface DashboardAppearance {
  layout: LayoutId;
  palette: PaletteChoice;
  customAccent: string;
  background: 'photo' | 'solid' | 'google-photo';
  backgroundColor: string;
  backgroundZoom: number;
  cards: CardPreference[];
  grid: DashboardGridLayout | null;
  cardStyles: CardStyles;
  ambient: AmbientPreference;
}

export interface AmbientPreference {
  enabled: boolean;
  idleMinutes: 5 | 10 | 20;
  photoSource: 'gallery' | 'selected' | 'plasma' | 'none';
  photoMinutes: 1 | 3 | 5;
  infoCycleSeconds: 30 | 60 | 120;
  info: Record<AmbientInfoId, boolean>;
  plasmaColors: [string, string, string];
}

export const AMBIENT_INFO_IDS = ['weather', 'calendar', 'activity', 'tasks', 'meals'] as const;
export type AmbientInfoId = typeof AMBIENT_INFO_IDS[number];

export const PLASMA_PRESETS: Record<string, [string, string, string]> = {
  Aurora: ['#16A085', '#38BDF8', '#A78BFA'],
  Ocean: ['#0477BF', '#22D3EE', '#0D9488'],
  Sunset: ['#E8795B', '#F59E0B', '#A855F7'],
  Ember: ['#D94657', '#F97316', '#EAB308'],
};

export const DEFAULT_AMBIENT: AmbientPreference = {
  enabled: true, idleMinutes: 10, photoSource: 'gallery',
  photoMinutes: 3, infoCycleSeconds: 60,
  info: { weather: true, calendar: true, activity: false, tasks: false, meals: false },
  plasmaColors: PLASMA_PRESETS.Aurora,
};

export const CARD_LABELS: Record<CardId, string> = {
  weather: 'Weather', schedule: 'Schedule', activity: 'Activity',
  media: 'Media', meal: 'Meals', todo: 'Tasks',
};

export const LAYOUTS: Record<Exclude<LayoutId, 'custom'>, { label: string; description: string; cards: CardPreference[] }> = {
  balanced: {
    label: 'Balanced', description: 'All six cards, with the schedule prominent.',
    cards: [
      { id: 'weather', visible: true, size: 'standard' },
      { id: 'schedule', visible: true, size: 'wide' },
      { id: 'activity', visible: true, size: 'standard' },
      { id: 'media', visible: true, size: 'standard' },
      { id: 'meal', visible: true, size: 'standard' },
      { id: 'todo', visible: true, size: 'standard' },
    ],
  },
  agenda: {
    label: 'Agenda', description: 'Schedule and tasks first.',
    cards: [
      { id: 'schedule', visible: true, size: 'wide' },
      { id: 'todo', visible: true, size: 'wide' },
      { id: 'weather', visible: true, size: 'standard' },
      { id: 'activity', visible: true, size: 'standard' },
      { id: 'meal', visible: true, size: 'standard' },
      { id: 'media', visible: false, size: 'standard' },
    ],
  },
  wellness: {
    label: 'Wellness', description: 'Activity and weather first.',
    cards: [
      { id: 'activity', visible: true, size: 'wide' },
      { id: 'weather', visible: true, size: 'wide' },
      { id: 'schedule', visible: true, size: 'standard' },
      { id: 'todo', visible: true, size: 'standard' },
      { id: 'meal', visible: true, size: 'standard' },
      { id: 'media', visible: false, size: 'standard' },
    ],
  },
  calm: {
    label: 'Calm', description: 'Four roomy cards with less to scan.',
    cards: [
      { id: 'weather', visible: true, size: 'standard' },
      { id: 'schedule', visible: true, size: 'wide' },
      { id: 'activity', visible: true, size: 'standard' },
      { id: 'todo', visible: true, size: 'wide' },
      { id: 'meal', visible: false, size: 'standard' },
      { id: 'media', visible: false, size: 'standard' },
    ],
  },
};

export const DEFAULT_APPEARANCE: DashboardAppearance = {
  layout: 'balanced', palette: 'night', customAccent: '#38BDF8',
  background: 'photo', backgroundColor: '#0F172A', backgroundZoom: DEFAULT_PHOTO_ZOOM,
  cards: LAYOUTS.balanced.cards,
  grid: null,
  cardStyles: {},
  ambient: DEFAULT_AMBIENT,
};

/** One or two TV rows, with the card order and widths shared by the picker preview. */
export function getCardRows(cards: CardPreference[]): CardPreference[][] {
  const visible = cards.filter((card) => card.visible);
  const split = Math.ceil(visible.length / 2);
  return [visible.slice(0, split), visible.slice(split)].filter((row) => row.length > 0);
}

const VALID_LAYOUTS: LayoutId[] = ['balanced', 'agenda', 'wellness', 'calm', 'custom'];
const VALID_PALETTES: PaletteChoice[] = ['night', 'forest', 'plum', 'contrast', 'custom'];

/** Accept saved preferences from older versions without losing new cards. */
export function normalizeAppearance(value: unknown): DashboardAppearance {
  if (!value || typeof value !== 'object') return DEFAULT_APPEARANCE;
  const raw = value as Partial<DashboardAppearance>;
  const layout = raw.layout && VALID_LAYOUTS.includes(raw.layout)
    ? raw.layout : 'balanced';
  const palette = raw.palette && VALID_PALETTES.includes(raw.palette)
    ? raw.palette : 'night';
  const background = raw.background === 'solid' || raw.background === 'google-photo' ? raw.background : 'photo';
  const customAccent = normalizeHexColor(raw.customAccent || '') || DEFAULT_APPEARANCE.customAccent;
  const backgroundColor = normalizeHexColor(raw.backgroundColor || '') || DEFAULT_APPEARANCE.backgroundColor;
  const seen = new Set<CardId>();
  const cards: CardPreference[] = [];
  if (Array.isArray(raw.cards)) {
    for (const item of raw.cards) {
      if (!item || !CARD_IDS.includes(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      cards.push({ id: item.id, visible: item.visible !== false, size: item.size === 'wide' ? 'wide' : 'standard' });
    }
  }
  for (const item of LAYOUTS.balanced.cards) {
    if (!seen.has(item.id)) cards.push({ ...item });
  }
  if (!cards.some((card) => card.visible)) cards[0].visible = true;
  const ambientRaw = raw.ambient;
  const infoRaw = ambientRaw?.info;
  const inputColors = ambientRaw?.plasmaColors;
  const plasmaColors = Array.isArray(inputColors) && inputColors.length === 3
    ? inputColors.map((color) => normalizeHexColor(typeof color === 'string' ? color : '')) : [];
  const ambient: AmbientPreference = {
    enabled: typeof ambientRaw?.enabled === 'boolean' ? ambientRaw.enabled : DEFAULT_AMBIENT.enabled,
    idleMinutes: ambientRaw?.idleMinutes === 5 || ambientRaw?.idleMinutes === 20
      ? ambientRaw.idleMinutes : 10,
    photoSource: ambientRaw?.photoSource === 'selected' || ambientRaw?.photoSource === 'none' ||
      ambientRaw?.photoSource === 'plasma'
      ? ambientRaw.photoSource : 'gallery',
    photoMinutes: ambientRaw?.photoMinutes === 1 || ambientRaw?.photoMinutes === 5
      ? ambientRaw.photoMinutes : 3,
    infoCycleSeconds: ambientRaw?.infoCycleSeconds === 30 || ambientRaw?.infoCycleSeconds === 120
      ? ambientRaw.infoCycleSeconds : 60,
    info: Object.fromEntries(AMBIENT_INFO_IDS.map((id) => [
      id, typeof infoRaw?.[id] === 'boolean' ? infoRaw[id] : DEFAULT_AMBIENT.info[id],
    ])) as AmbientPreference['info'],
    plasmaColors: plasmaColors.length === 3 && plasmaColors.every(Boolean)
      ? plasmaColors as [string, string, string] : PLASMA_PRESETS.Aurora,
  };
  const grid = validGrid(raw.grid, cards) ? raw.grid : null;
  const cardStyles = validCardStyles(raw.cardStyles) ? raw.cardStyles : {};
  return { layout: grid ? 'custom' : layout, palette, customAccent, background, backgroundColor, backgroundZoom: normalizePhotoZoom(raw.backgroundZoom), cards, ambient, grid, cardStyles };
}
