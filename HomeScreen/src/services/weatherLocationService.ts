import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedLocation, Weather } from '../../../shared/src/types';

export const STORAGE_KEY_LOCATIONS = '@tv_weather_locations_v1';
export const STORAGE_KEY_ACTIVE_LOC = '@tv_weather_active_loc_v1';

export const DEFAULT_LOCATIONS: SavedLocation[] = [
  { id: 'loc-new-york', name: 'New York', query: 'New York, US', isDefault: true },
];

export const PRESET_CITIES = [
  { name: 'New York', query: 'New York, US' },
  { name: 'Los Angeles', query: 'Los Angeles, US' },
  { name: 'Miami', query: 'Miami, US' },
  { name: 'Denver', query: 'Denver, US' },
  { name: 'Paris', query: 'Paris, FR' },
  { name: 'Berlin', query: 'Berlin, DE' },
  { name: 'Rome', query: 'Rome, IT' },
  { name: 'Sydney', query: 'Sydney, AU' },
  { name: 'Honolulu', query: 'Honolulu, US' },
];

export type ExtendedWeather = Weather;

/** Keep the selected location's label alongside its live weather. */
export function getWeatherForLocation(location: SavedLocation, weather?: Weather | null): ExtendedWeather {
  return {
    ...(weather || { temp: '--', condition: 'Loading weather' }),
    location: `${location.name} (${location.query})`,
  };
}

export async function loadStoredLocations(): Promise<{
  locations: SavedLocation[];
  activeId: string;
}> {
  try {
    const [rawLocs, rawActive] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_LOCATIONS),
      AsyncStorage.getItem(STORAGE_KEY_ACTIVE_LOC),
    ]);
    const parsed: unknown = rawLocs ? JSON.parse(rawLocs) : DEFAULT_LOCATIONS;
    const locations = Array.isArray(parsed) && parsed.length > 0 && parsed.every((loc) =>
      loc && typeof loc.id === 'string' && typeof loc.name === 'string' &&
      typeof loc.query === 'string'
    ) ? parsed as SavedLocation[] : DEFAULT_LOCATIONS;
    const defaultLoc = locations.find((loc) => loc.isDefault) || locations[0];
    const activeId = rawActive && locations.some((loc) => loc.id === rawActive)
      ? rawActive : defaultLoc.id;
    return { locations, activeId };
  } catch (error) {
    console.warn('Failed to load stored locations:', error);
    return { locations: DEFAULT_LOCATIONS, activeId: DEFAULT_LOCATIONS[0].id };
  }
}

export async function persistLocations(locations: SavedLocation[], activeId: string): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations)),
      AsyncStorage.setItem(STORAGE_KEY_ACTIVE_LOC, activeId),
    ]);
  } catch (error) {
    console.error('Failed to save locations:', error);
  }
}
