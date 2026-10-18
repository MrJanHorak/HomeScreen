import {themeForPalette} from '../src/theme/tvTheme';
import {useSyncExternalStore} from 'react';
import type {CalendarEvent} from '../../shared/src/types';
import {DEFAULT_APPEARANCE} from '../src/theme/appearance';
import {DYSLEXIA_READING} from '../../server/functions/src/utils/reading';
import './readingFixture.css';
export * from './settingsFixture';
const noop = () => {};
const params = new URLSearchParams(location.search);
const appearance = {...DEFAULT_APPEARANCE, ...(params.has('reading') && {reading: DYSLEXIA_READING})};
export const useTheme = () => ({...themeForPalette(appearance.palette, appearance.customAccent, appearance.backgroundColor, appearance.background, appearance.reading), fontsReady: true, fontError: null});
export const useAppearance = () => ({appearance, ready: true, setReadingPreference: noop, selectLayout: noop, selectPalette: noop,
  setCustomAccent: noop, setBackground: noop, setBackgroundColor: noop, photoDataUrl: null, ambientPhotos: [],
  setGooglePhotos: noop, setAmbientPreference: noop, moveCard: noop, toggleCard: noop, toggleCardSize: noop,
  resetAppearance: noop, setWidgetLayout: noop, applySavedLayout: noop});
export const auth = {currentUser: {uid: 'test-owner'}};
export const useAuth = () => ({user: {uid: 'test-owner'}, signOut: noop});
const date = (offset: number) => {const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;};
const weather = {temp: '72°', condition: 'Partly cloudy', location: 'Home', feelsLike: 70, high: 78, low: 61, humidity: 54,
  highLowPeriod: 'rest_of_day', observedAt: new Date().toISOString(), timezoneOffset: -14400,
  resolvedLocation: {name: 'Harlem', country: 'US', lat: 33.414, lon: -82.312},
  windSpeed: 4, windDirection: 'NW', pressure: 1012,
  forecast: Array.from({length: 5}, (_, i) => ({day: ['Fri', 'Sat', 'Sun', 'Mon', 'Tue'][i], high: 78, low: 61, condition: 'Partly cloudy', icon: 'sun'})),
  hourly: ['2 PM', '5 PM', '8 PM', '11 PM', '2 AM'].map((time, i) => ({time, temp: 73-i, pop: '10%', icon: 'sun'}))};
const health = {status: 'ok', steps: 8123, stepGoal: 10000, progress: .8123, distance: 5.8, distanceGoal: 8, activeMinutes: 45, calories: 1720,
  estimatedRestingCalories: 800, fetchedAt: new Date().toISOString(), weekly: Array.from({length: 7}, (_, i) => ({date: date(-6+i), steps: 6000+i*350, activeMinutes: 35}))};
if (params.has('activitySteps')) {
  health.steps = Number(params.get('activitySteps'));
  health.stepGoal = Number(params.get('activityGoal') || 10000);
  health.progress = Math.min(1, health.steps / health.stepGoal);
  health.weekly = [13562, 14305, 13296, 10775, 11278, 6162, health.steps].map((steps, i) => ({date: date(-6+i), steps, activeMinutes: 35}));
}
const locations = [{id: 'home', name: 'Home', query: 'Home', isDefault: true}];
const many = params.has('busy');
let scheduleOverride: {schedule?: CalendarEvent[]; upcomingEvents?: CalendarEvent[]} = {};
const scheduleListeners = new Set<() => void>();
Object.assign(window, {updateScheduleFixture: (patch: typeof scheduleOverride) => {
  scheduleOverride = {...scheduleOverride, ...patch};
  scheduleListeners.forEach(listener => listener());
}});
export const useDashboard = () => {
  const override = useSyncExternalStore(listener => {scheduleListeners.add(listener); return () => {scheduleListeners.delete(listener);};}, () => scheduleOverride);
  return {isLoading: false, isLive: true, error: null, refresh: noop, locationError: null,
  activeLocation: locations[0], savedLocations: locations, getWeatherForLoc: () => weather, setActiveLocation: noop, setDefaultLocation: noop,
  addLocation: noop, removeLocation: noop, weather, health,
  meals: {status: 'ok', items: Array.from({length: many ? 14 : 7}, (_, i) => ({date: date(i), title: ['Roasted chicken and vegetables', 'Pasta with tomato sauce', 'Vegetable curry', 'Baked salmon', 'Taco night', 'Rice and beans', 'Homemade pizza'][i % 7], servings: '4', side: 'Green salad', cook: 'Alex', note: i ? '' : params.has('longMealNote') ? `${'Prepare vegetables before dinner. '.repeat(40)}Ready to serve.` : 'Prepare vegetables before dinner.'}))},
  schedule: Array.from({length: many ? 20 : 6}, (_, i) => ({id: String(i), title: ['Team standup', 'Grocery shopping', 'Dentist appointment', 'Meet a friend', 'Family dinner', 'Evening walk'][i%6], time: '10:30 AM', endTime: '11:30 AM', category: 'Home', color: '#38bdf8', date: date(0)})),
  upcomingEvents: Array.from({length: 6}, (_, i) => ({id: `next${i}`, title: 'Upcoming appointment', time: '11:00 AM', endTime: '12:00 PM', category: 'Home', color: '#38bdf8', date: date(i+1)})),
  tasks: Array.from({length: many ? 30 : 8}, (_, i) => ({id: String(i), title: ['Pick up household supplies', 'Water the garden', 'Call a friend', 'Organize the bookshelf'][i%4], due: 'Tomorrow', completed: false})),
  completeTask: async (id: string) => {Object.assign(window, {lastCompletedTask: id});},
  ...override,
};};
export const usePeople = () => ({people: [], error: null});
export const useFeeds = () => ({feeds: {}, loading: false, offline: false, refresh: noop});
export const useFavoriteApps = () => ({availableApps: [], favoriteApps: [], visible: true, status: 'ready', syncError: null,
  setVisible: noop, toggleFavorite: noop, moveFavorite: noop, refresh: noop});
export const useWatchNext = () => ({status: 'ready', hidden: [], items: Array.from({length: 5}, (_, i) => ({id: i,
  title: i ? `Queued program ${i}` : 'Only Murders in the Building', appName: 'Hulu', packageName: 'hulu', episodeTitle: 'The next episode',
  posterUri: null, positionMs: 2400, durationMs: 10000})), refresh: noop, requestAccess: noop, openProgram: async () => true,
  feature: noop, hide: noop, restore: noop});
export const usePolls = () => ({stale: false, loading: false, offsetMs: 0, rounds: {'test-poll': {
  question: 'What should we watch tonight?', description: 'Choose a film for movie night.', state: 'open', endsAtMs: Date.now()+3600000,
  timeZone: 'America/New_York', total: 12, results: [{id: 'a', label: 'Comedy', count: 7}, {id: 'b', label: 'Adventure', count: 5}],
  pendingCount: 0, joinUrl: 'https://example.com/vote', answerMode: 'options',
}}});
export const getDeviceConnectionInfo = async () => ({companionUrl: 'https://example.com'});
export const getCurrentDevice = async () => ({name: 'Test TV'});
export const createPeopleInvitation = async () => ({});
export const peopleAction = async () => {};
export const beginGooglePhotosConnection = async () => ({});
export const createGooglePhotosSession = async () => ({});
export const getGooglePhotosStatus = async () => ({connected: false});
export const pollGooglePhotosSession = async () => ({});
export const getUserPreferences = async () => ({});
export const saveUserPreferences = async () => {};
export const syncDeviceApps = async () => ({});
export const CardThemeProvider = ({children}: {children: unknown}) => children;
export default {getItem: async (key: string) => localStorage.getItem(key), setItem: async (key: string, value: string) => {localStorage.setItem(key, value);}};
