import {DEFAULT_READING, normalizeReading} from '../../../../functions/src/utils/reading';
import type {ReadingPreference} from '../../../../functions/src/utils/reading';
import {isRecord} from '../../../../../shared/src/validation';
import {validGrid} from '../../../../functions/src/utils/dashboardLayout';
import type {DashboardGridLayout} from '../../../../functions/src/utils/dashboardLayout';
import {validCardStyles} from '../../../../functions/src/utils/cardStyle';
import type {CardStyles} from '../../../../functions/src/utils/cardStyle';
import {validWidgetLayout} from '../../../../functions/src/utils/widgets';
import type {WidgetLayout} from '../../../../functions/src/utils/widgets';
import {DEFAULT_PHOTO_ZOOM, normalizePhotoZoom} from '../../../../functions/src/utils/photoFraming';
import {normalizeAmbient} from './ambient/ambientPreferences';
import type {Ambient} from './ambient/ambientPreferences';

export type CardId = 'weather' | 'schedule' | 'activity' | 'media' | 'meal' | 'todo';
export interface Card {
  id: CardId;
  visible: boolean;
  size: 'standard' | 'wide';
}
export type Appearance = {
  reading?: ReadingPreference;
  widgetLayout?: WidgetLayout | null;
  layout: 'balanced' | 'agenda' | 'wellness' | 'calm' | 'custom';
  palette: 'night' | 'forest' | 'plum' | 'contrast' | 'custom';
  customAccent: string;
  background: 'photo' | 'solid' | 'google-photo';
  backgroundColor: string;
  backgroundZoom: number;
  cards: Card[];
  ambient?: Ambient;
  grid: DashboardGridLayout | null;
  cardStyles: CardStyles;
};

export const CARD_LABELS: Record<CardId, string> = {
  weather: 'Weather', schedule: 'Schedule', activity: 'Activity',
  media: 'Continue watching', meal: 'Meals', todo: 'Tasks',
};
const order: CardId[] = ['weather', 'schedule', 'activity', 'media', 'meal', 'todo'];
export const LAYOUT_PRESETS: Record<Exclude<Appearance['layout'], 'custom'>, Card[]> = {
  balanced: [
    {id: 'weather', visible: true, size: 'standard'}, {id: 'schedule', visible: true, size: 'wide'},
    {id: 'activity', visible: true, size: 'standard'}, {id: 'media', visible: true, size: 'standard'},
    {id: 'meal', visible: true, size: 'standard'}, {id: 'todo', visible: true, size: 'standard'},
  ],
  agenda: [
    {id: 'schedule', visible: true, size: 'wide'}, {id: 'todo', visible: true, size: 'wide'},
    {id: 'weather', visible: true, size: 'standard'}, {id: 'activity', visible: true, size: 'standard'},
    {id: 'meal', visible: true, size: 'standard'}, {id: 'media', visible: false, size: 'standard'},
  ],
  wellness: [
    {id: 'activity', visible: true, size: 'wide'}, {id: 'weather', visible: true, size: 'wide'},
    {id: 'schedule', visible: true, size: 'standard'}, {id: 'todo', visible: true, size: 'standard'},
    {id: 'meal', visible: true, size: 'standard'}, {id: 'media', visible: false, size: 'standard'},
  ],
  calm: [
    {id: 'weather', visible: true, size: 'standard'}, {id: 'schedule', visible: true, size: 'wide'},
    {id: 'activity', visible: true, size: 'standard'}, {id: 'todo', visible: true, size: 'wide'},
    {id: 'meal', visible: false, size: 'standard'}, {id: 'media', visible: false, size: 'standard'},
  ],
};
const defaults: Appearance = {
  reading: DEFAULT_READING,
  layout: 'balanced', palette: 'night', customAccent: '#38BDF8',
  background: 'photo', backgroundColor: '#0F172A', backgroundZoom: DEFAULT_PHOTO_ZOOM, cards: LAYOUT_PRESETS.balanced, grid: null, cardStyles: {},
};
export const PALETTE_COLORS: Record<Appearance['palette'], {background: string; accent: string}> = {
  night: {background: '#0F172A', accent: '#38BDF8'},
  forest: {background: '#0C1E1A', accent: '#86E3BB'},
  plum: {background: '#20152E', accent: '#E3B5FF'},
  contrast: {background: '#050505', accent: '#FDE047'},
  custom: {background: '#0F172A', accent: '#38BDF8'},
};

export function copyCards(cards: Card[]): Card[] {
  return cards.map((card) => ({...card}));
}

function validCard(value: unknown): value is Card {
  return isRecord(value) && order.includes(value.id as CardId) && typeof value.visible === 'boolean' &&
    (value.size === 'wide' || value.size === 'standard');
}

function validLayout(value: unknown): value is Appearance['layout'] {
  return typeof value === 'string' && ['balanced', 'agenda', 'wellness', 'calm', 'custom'].includes(value);
}

function validPalette(value: unknown): value is Appearance['palette'] {
  return typeof value === 'string' && ['night', 'forest', 'plum', 'contrast', 'custom'].includes(value);
}

function colorOrDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

/** Repair legacy settings while copying only recognized appearance fields. */
export function normalizeAppearance(value: unknown): Appearance {
  if (!isRecord(value)) return {...defaults, reading: normalizeReading(null), cards: copyCards(defaults.cards), cardStyles: {}};
  const cards = Array.isArray(value.cards) ? copyCards(value.cards.filter(validCard)) : [];
  const unique = cards.filter((card, index) => cards.findIndex((other) => other.id === card.id) === index);
  for (const id of order) {
    if (!unique.some((card) => card.id === id)) unique.push({id, visible: true, size: 'standard'});
  }
  if (!unique.some((card) => card.visible)) unique[0].visible = true;
  return {
    layout: validLayout(value.layout) ? value.layout : 'balanced',
    ...(validWidgetLayout(value.widgetLayout) ? {widgetLayout: structuredClone(value.widgetLayout)} : value.widgetLayout === null ? {widgetLayout: null} : {}),
    palette: validPalette(value.palette) ? value.palette : 'night',
    reading: normalizeReading(value.reading),
    customAccent: colorOrDefault(value.customAccent, defaults.customAccent),
    backgroundColor: colorOrDefault(value.backgroundColor, defaults.backgroundColor),
    background: value.background === 'solid' || value.background === 'google-photo' ? value.background : 'photo',
    backgroundZoom: normalizePhotoZoom(value.backgroundZoom),
    cards: copyCards(unique),
    grid: validGrid(value.grid, unique) ? structuredClone(value.grid) : null,
    cardStyles: validCardStyles(value.cardStyles) ? structuredClone(value.cardStyles) : {},
    ambient: value.ambient ? normalizeAmbient(value.ambient) : undefined,
  };
}

export function appearanceDifferences(draft: Appearance, published: Appearance): string[] {
  const groups: [string, (keyof Appearance)[]][] = [
    ['layout and cards', ['layout', 'cards', 'grid', 'widgetLayout']],
    ['fonts and reading', ['reading']],
    ['colors', ['palette', 'customAccent']],
    ['background', ['background', 'backgroundColor', 'backgroundZoom']],
    ['card styles', ['cardStyles']],
    ['ambient mode', ['ambient']],
  ];
  return groups.filter(([, keys]) => keys.some((key) => JSON.stringify(draft[key]) !== JSON.stringify(published[key])))
    .map(([name]) => name);
}
