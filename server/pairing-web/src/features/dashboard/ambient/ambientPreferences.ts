import {isRecord} from '../../../../../../shared/src/validation';

export type Ambient = {
  enabled: boolean;
  idleMinutes: 5 | 10 | 20;
  photoSource: 'gallery' | 'selected' | 'plasma' | 'none';
  photoMinutes: 1 | 3 | 5;
  infoCycleSeconds: 30 | 60 | 120;
  info: Record<'weather' | 'calendar' | 'activity' | 'tasks' | 'meals', boolean>;
  plasmaColors: [string, string, string];
};
export const DEFAULT_AMBIENT: Ambient = {enabled: true, idleMinutes: 10, photoSource: 'gallery', photoMinutes: 3, infoCycleSeconds: 60,
  info: {weather: true, calendar: true, activity: false, tasks: false, meals: false}, plasmaColors: ['#16A085', '#38BDF8', '#A78BFA']};
export const PLASMA_PRESETS = {Aurora: DEFAULT_AMBIENT.plasmaColors, Ocean: ['#0477BF', '#22D3EE', '#0D9488'], Sunset: ['#E8795B', '#F59E0B', '#A855F7'], Ember: ['#D94657', '#F97316', '#EAB308']};
function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizePlasmaColors(value: unknown): Ambient['plasmaColors'] {
  if (!Array.isArray(value) || value.length !== 3 ||
      !value.every((color) => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color))) {
    return [...DEFAULT_AMBIENT.plasmaColors];
  }
  return [value[0], value[1], value[2]];
}

/** Normalize saved values without allowing malformed settings into form controls. */
export function normalizeAmbient(value: unknown): Ambient {
  const raw = isRecord(value) ? value : {};
  const info = isRecord(raw.info) ? raw.info : {};
  return {
    enabled: booleanOrDefault(raw.enabled, DEFAULT_AMBIENT.enabled),
    idleMinutes: raw.idleMinutes === 5 || raw.idleMinutes === 10 || raw.idleMinutes === 20
      ? raw.idleMinutes : DEFAULT_AMBIENT.idleMinutes,
    photoSource: raw.photoSource === 'gallery' || raw.photoSource === 'selected' || raw.photoSource === 'plasma' || raw.photoSource === 'none'
      ? raw.photoSource : DEFAULT_AMBIENT.photoSource,
    photoMinutes: raw.photoMinutes === 1 || raw.photoMinutes === 3 || raw.photoMinutes === 5
      ? raw.photoMinutes : DEFAULT_AMBIENT.photoMinutes,
    infoCycleSeconds: raw.infoCycleSeconds === 30 || raw.infoCycleSeconds === 60 || raw.infoCycleSeconds === 120
      ? raw.infoCycleSeconds : DEFAULT_AMBIENT.infoCycleSeconds,
    info: {
      weather: booleanOrDefault(info.weather, DEFAULT_AMBIENT.info.weather),
      calendar: booleanOrDefault(info.calendar, DEFAULT_AMBIENT.info.calendar),
      activity: booleanOrDefault(info.activity, DEFAULT_AMBIENT.info.activity),
      tasks: booleanOrDefault(info.tasks, DEFAULT_AMBIENT.info.tasks),
      meals: booleanOrDefault(info.meals, DEFAULT_AMBIENT.info.meals),
    },
    plasmaColors: normalizePlasmaColors(raw.plasmaColors),
  };
}
