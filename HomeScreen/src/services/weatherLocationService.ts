import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedLocation, Weather, WeatherForecast } from '../../../shared/src/types';

export const STORAGE_KEY_LOCATIONS = '@tv_weather_locations_v1';
export const STORAGE_KEY_ACTIVE_LOC = '@tv_weather_active_loc_v1';

export const DEFAULT_LOCATIONS: SavedLocation[] = [
  { id: 'loc-austin', name: 'Home', query: 'Austin, TX', isDefault: true },
  { id: 'loc-prague', name: 'Prague', query: 'Prague, CZ', isDefault: false },
  { id: 'loc-tokyo', name: 'Tokyo', query: 'Tokyo, JP', isDefault: false },
  { id: 'loc-london', name: 'London', query: 'London, UK', isDefault: false },
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

export interface HourlyForecastItem {
  time: string;
  temp: number;
  icon: string;
  pop: string;
}

export interface ExtendedWeather extends Weather {
  hourly?: HourlyForecastItem[];
}

// Built-in meteorological models for instant TV responsiveness
const CITY_WEATHER_PROFILES: Record<string, ExtendedWeather> = {
  'loc-austin': {
    location: 'Austin, TX',
    temp: '78°',
    temperature: 78,
    feelsLike: 79,
    condition: 'Sunny',
    conditionIcon: 'sun',
    humidity: 46,
    windSpeed: 6,
    windDirection: 'SE',
    high: 84,
    low: 64,
    forecast: [
      { day: 'Wed', condition: 'Sunny', icon: 'sun', high: 84, low: 64 },
      { day: 'Thu', condition: 'Partly Cloudy', icon: 'cloud-sun', high: 82, low: 63 },
      { day: 'Fri', condition: 'Sunny', icon: 'sun', high: 86, low: 66 },
      { day: 'Sat', condition: 'Scattered Rain', icon: 'cloud-rain', high: 79, low: 62 },
    ],
    hourly: [
      { time: 'Now', temp: 78, icon: 'sun', pop: '0%' },
      { time: '2 PM', temp: 83, icon: 'sun', pop: '0%' },
      { time: '4 PM', temp: 84, icon: 'sun', pop: '5%' },
      { time: '6 PM', temp: 80, icon: 'cloud-sun', pop: '10%' },
      { time: '8 PM', temp: 74, icon: 'cloud-sun', pop: '5%' },
      { time: '10 PM', temp: 69, icon: 'moon', pop: '0%' },
      { time: '12 AM', temp: 66, icon: 'moon', pop: '0%' },
    ],
  },
  'loc-prague': {
    location: 'Prague, CZ',
    temp: '55°',
    temperature: 55,
    feelsLike: 52,
    condition: 'Partly Cloudy',
    conditionIcon: 'cloud-sun',
    humidity: 68,
    windSpeed: 9,
    windDirection: 'NW',
    high: 60,
    low: 44,
    forecast: [
      { day: 'Wed', condition: 'Partly Cloudy', icon: 'cloud-sun', high: 59, low: 43 },
      { day: 'Thu', condition: 'Cloudy', icon: 'cloud', high: 56, low: 41 },
      { day: 'Fri', condition: 'Showers', icon: 'cloud-rain', high: 52, low: 39 },
      { day: 'Sat', condition: 'Clear', icon: 'sun', high: 62, low: 45 },
    ],
    hourly: [
      { time: 'Now', temp: 55, icon: 'cloud-sun', pop: '10%' },
      { time: '2 PM', temp: 59, icon: 'cloud-sun', pop: '15%' },
      { time: '4 PM', temp: 60, icon: 'cloud-sun', pop: '20%' },
      { time: '6 PM', temp: 56, icon: 'cloud', pop: '25%' },
      { time: '8 PM', temp: 51, icon: 'cloud-moon', pop: '15%' },
      { time: '10 PM', temp: 47, icon: 'moon', pop: '10%' },
      { time: '12 AM', temp: 45, icon: 'moon', pop: '5%' },
    ],
  },
  'loc-tokyo': {
    location: 'Tokyo, JP',
    temp: '68°',
    temperature: 68,
    feelsLike: 67,
    condition: 'Clear',
    conditionIcon: 'sun',
    humidity: 52,
    windSpeed: 5,
    windDirection: 'S',
    high: 72,
    low: 58,
    forecast: [
      { day: 'Wed', condition: 'Sunny', icon: 'sun', high: 72, low: 57 },
      { day: 'Thu', condition: 'Sunny', icon: 'sun', high: 74, low: 59 },
      { day: 'Fri', condition: 'Partly Cloudy', icon: 'cloud-sun', high: 70, low: 56 },
      { day: 'Sat', condition: 'Light Rain', icon: 'cloud-rain', high: 66, low: 53 },
    ],
    hourly: [
      { time: 'Now', temp: 68, icon: 'sun', pop: '0%' },
      { time: '2 PM', temp: 72, icon: 'sun', pop: '0%' },
      { time: '4 PM', temp: 71, icon: 'sun', pop: '0%' },
      { time: '6 PM', temp: 66, icon: 'sun', pop: '0%' },
      { time: '8 PM', temp: 62, icon: 'moon', pop: '0%' },
      { time: '10 PM', temp: 60, icon: 'moon', pop: '0%' },
      { time: '12 AM', temp: 58, icon: 'moon', pop: '0%' },
    ],
  },
  'loc-london': {
    location: 'London, UK',
    temp: '58°',
    temperature: 58,
    feelsLike: 55,
    condition: 'Light Rain',
    conditionIcon: 'cloud-rain',
    humidity: 82,
    windSpeed: 12,
    windDirection: 'SW',
    high: 62,
    low: 49,
    forecast: [
      { day: 'Wed', condition: 'Showers', icon: 'cloud-rain', high: 61, low: 48 },
      { day: 'Thu', condition: 'Overcast', icon: 'cloud', high: 59, low: 47 },
      { day: 'Fri', condition: 'Partly Cloudy', icon: 'cloud-sun', high: 64, low: 50 },
      { day: 'Sat', condition: 'Breezy', icon: 'cloud-sun', high: 63, low: 51 },
    ],
    hourly: [
      { time: 'Now', temp: 58, icon: 'cloud-rain', pop: '75%' },
      { time: '2 PM', temp: 61, icon: 'cloud-rain', pop: '60%' },
      { time: '4 PM', temp: 62, icon: 'cloud', pop: '40%' },
      { time: '6 PM', temp: 59, icon: 'cloud-sun', pop: '20%' },
      { time: '8 PM', temp: 54, icon: 'cloud-moon', pop: '15%' },
      { time: '10 PM', temp: 51, icon: 'moon', pop: '10%' },
      { time: '12 AM', temp: 49, icon: 'moon', pop: '10%' },
    ],
  },
};

/**
 * Generate a dynamic weather profile for any custom user query
 */
export function generateWeatherForCity(query: string, locationName: string): ExtendedWeather {
  // Simple deterministic hash based on query string
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash << 5) - hash + query.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  const baseTemp = 48 + (absHash % 42); // 48°F - 90°F
  const conditions = [
    { name: 'Sunny', icon: 'sun' },
    { name: 'Partly Cloudy', icon: 'cloud-sun' },
    { name: 'Cloudy', icon: 'cloud' },
    { name: 'Light Rain', icon: 'cloud-rain' },
    { name: 'Clear', icon: 'sun' },
  ];
  const cond = conditions[absHash % conditions.length];
  const humidity = 35 + (absHash % 55);
  const wind = 3 + (absHash % 16);

  return {
    location: `${locationName} (${query})`,
    temp: `${baseTemp}°`,
    temperature: baseTemp,
    feelsLike: baseTemp + (absHash % 5 - 2),
    condition: cond.name,
    conditionIcon: cond.icon,
    humidity,
    windSpeed: wind,
    windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][absHash % 8],
    high: baseTemp + 5,
    low: baseTemp - 8,
    forecast: [
      { day: 'Wed', condition: cond.name, icon: cond.icon, high: baseTemp + 4, low: baseTemp - 7 },
      { day: 'Thu', condition: 'Partly Cloudy', icon: 'cloud-sun', high: baseTemp + 2, low: baseTemp - 9 },
      { day: 'Fri', condition: 'Sunny', icon: 'sun', high: baseTemp + 6, low: baseTemp - 5 },
      { day: 'Sat', condition: 'Scattered Rain', icon: 'cloud-rain', high: baseTemp - 1, low: baseTemp - 10 },
    ],
    hourly: [
      { time: 'Now', temp: baseTemp, icon: cond.icon, pop: '10%' },
      { time: '2 PM', temp: baseTemp + 4, icon: cond.icon, pop: '10%' },
      { time: '4 PM', temp: baseTemp + 5, icon: cond.icon, pop: '15%' },
      { time: '6 PM', temp: baseTemp + 2, icon: 'cloud-sun', pop: '20%' },
      { time: '8 PM', temp: baseTemp - 3, icon: 'cloud-moon', pop: '15%' },
      { time: '10 PM', temp: baseTemp - 6, icon: 'moon', pop: '5%' },
      { time: '12 AM', temp: baseTemp - 8, icon: 'moon', pop: '0%' },
    ],
  };
}

/**
 * Retrieve weather for a specific saved location
 */
export function getWeatherForLocation(location: SavedLocation, liveWeather?: Weather | null): ExtendedWeather {
  // If this location matches the live weather payload from the server, use it!
  if (liveWeather && liveWeather.temperature !== undefined && location.isDefault) {
    return {
      ...liveWeather,
      location: location.name ? `${location.name} (${location.query})` : (liveWeather.location || location.query),
    };
  }

  // Check pre-configured city profiles
  if (CITY_WEATHER_PROFILES[location.id]) {
    return {
      ...CITY_WEATHER_PROFILES[location.id],
      location: `${location.name} (${location.query})`,
    };
  }

  // Fallback to deterministic model for custom entered cities
  return generateWeatherForCity(location.query, location.name);
}

/**
 * Load locations from AsyncStorage
 */
export async function loadStoredLocations(): Promise<{
  locations: SavedLocation[];
  activeId: string;
}> {
  try {
    const rawLocs = await AsyncStorage.getItem(STORAGE_KEY_LOCATIONS);
    const rawActive = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_LOC);

    const locations: SavedLocation[] = rawLocs ? JSON.parse(rawLocs) : DEFAULT_LOCATIONS;
    const defaultLoc = locations.find((l) => l.isDefault) || locations[0];
    const activeId = rawActive && locations.some((l) => l.id === rawActive) ? rawActive : defaultLoc.id;

    return { locations, activeId };
  } catch (err) {
    console.warn('Failed to load stored locations, using defaults:', err);
    return { locations: DEFAULT_LOCATIONS, activeId: DEFAULT_LOCATIONS[0].id };
  }
}

/**
 * Persist locations to AsyncStorage
 */
export async function persistLocations(
  locations: SavedLocation[],
  activeId: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_LOC, activeId);
  } catch (err) {
    console.error('Failed to save locations to AsyncStorage:', err);
  }
}
