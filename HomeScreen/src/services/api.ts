import { auth } from './firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import {clearLocalUserData} from './localUserData';
import type { DashboardSummaryResponse, DevicePairingResponse, Weather } from '../../../shared/src/types';
import type { DashboardAppearance } from '../theme/appearance';
import type {UserPreferences} from '../../../shared/src/types';
import {readJsonResponse} from '../../../shared/src/http';
import {validatedApiUrl} from '../../../shared/src/transport';
import { Platform } from 'react-native';
import type {PollView} from '../../../server/functions/src/utils/polls';
import type {PeopleActivityFeed, PeopleSettings, PeopleInvitation} from '../../../shared/src/people';

export async function fetchPeopleActivity(signal?: AbortSignal): Promise<PeopleActivityFeed> {
  return authenticatedRequest('peopleActivity', 'Could not refresh shared activity', {signal,
    headers: {'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}});
}
export async function getPeopleSettings(): Promise<PeopleSettings> {
  return authenticatedRequest('people', 'Could not load people');
}
export async function createPeopleInvitation(): Promise<PeopleInvitation> {
  return authenticatedRequest('people', 'Could not invite a person', {method: 'POST', body: JSON.stringify({action: 'invite'})});
}
export async function peopleAction(action: 'remove' | 'cancelInvitation', id: string): Promise<void> {
  await authenticatedRequest('people', 'Could not update people', {method: 'POST', body: JSON.stringify({action, id})});
}

export async function fetchPollFeed(signal?: AbortSignal): Promise<{rounds: PollView[]; serverNowMs: number}> {
  return authenticatedRequest('pollFeed', 'Could not refresh polls', {signal,
    headers: {'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}});
}

// Default to Firebase Local Emulator or configured remote URL
const DEFAULT_API_URL = validatedApiUrl(
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:5001/tv-homescreen-backend/us-central1',
  typeof __DEV__ !== 'undefined' && __DEV__,
);

/** Apply authentication and revoked-session cleanup consistently to JSON endpoints. */
async function authenticatedRequest<T>(path: string, errorMessage: string, options: Omit<RequestInit, 'headers'> & {headers?: Record<string, string>} = {}): Promise<T> {
  const requestingUser = auth.currentUser;
  const response = await fetch(`${DEFAULT_API_URL}/${path}`, {
    ...options,
    redirect: 'error',
    headers: {...await authHeaders(), ...options.headers},
  });
  if (auth.currentUser !== requestingUser) throw new Error('The signed-in account changed.');
  await handleRevokedSession(response);
  return readJsonResponse<T>(response, errorMessage);
}

export async function getUserPreferences(): Promise<{preferences: UserPreferences; updatedAtMs: number; hasSavedLocations: boolean}> {
  return authenticatedRequest('userPreferences', 'Could not load TV settings');
}

export async function saveUserPreferences(preferences: UserPreferences, expectedUpdatedAtMs: number): Promise<number> {
  const result = await authenticatedRequest<{updatedAtMs: number}>('userPreferences', 'Could not save TV settings', {
    method: 'PUT', body: JSON.stringify({preferences, expectedUpdatedAtMs}),
  });
  return result.updatedAtMs;
}

export interface FavoritePreferences {visible: boolean; packages: string[]}
export interface DeviceAppSettings {apps: {packageName: string; label: string}[]; preferences: FavoritePreferences | null; updatedAtMs: number}
export async function syncDeviceApps(body?: object): Promise<DeviceAppSettings> {
  return authenticatedRequest('deviceApps?current=1', 'Could not sync favorite apps', {
    method: body ? 'PUT' : 'GET',
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleRevokedSession(response: Response): Promise<void> {
  if (response.status !== 401 || !auth.currentUser) return;
  const uid = auth.currentUser.uid;
  await firebaseSignOut(auth);
  await clearLocalUserData(uid).catch(() => undefined);
}

export async function getDeviceConnectionInfo(): Promise<{
  device: {name: string; pairedAtMs: number} | null;
  companionUrl: string | null;
}> {
  return authenticatedRequest('linkedDevices?current=1', 'Could not load this TV');
}

export async function getCurrentDevice(): Promise<{name: string; pairedAtMs: number} | null> {
  return (await getDeviceConnectionInfo()).device;
}

export async function disconnectCurrentDevice(): Promise<void> {
  const headers = await authHeaders();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${DEFAULT_API_URL}/linkedDevices?current=1`, {
      method: 'DELETE', headers, signal: controller.signal, redirect: 'error',
    });
    if (!response.ok) throw new Error('Could not remove this TV session');
  } finally { clearTimeout(timer); }
}

async function photosRequest<T>(action: string, method: 'GET' | 'POST' = 'GET'): Promise<T> {
  return authenticatedRequest(`googlePhotosPicker?action=${action}`, 'Google Photos request failed', {method});
}

export async function beginGooglePhotosConnection(): Promise<string> {
  const result = await authenticatedRequest<{authorizationUrl: string}>('beginGooglePhotos', 'Could not connect Google Photos', {method: 'POST'});
  return result.authorizationUrl;
}

export async function getGooglePhotosStatus(): Promise<boolean> {
  return (await photosRequest<{ connected: boolean }>('status')).connected;
}

export async function createGooglePhotosSession(
  purpose: 'background' | 'ambient' = 'background'
): Promise<{ pickerUri: string; pollIntervalMs: number }> {
  return photosRequest(`create&purpose=${purpose}`, 'POST');
}

export async function pollGooglePhotosSession(): Promise<{
  status: 'pending' | 'selected'; pollIntervalMs?: number; photos?: SelectedPhoto[];
}> {
  return photosRequest('poll');
}

export interface SelectedPhoto {
  id: string;
  dataUrl: string;
}

export async function getSavedGooglePhotos(): Promise<SelectedPhoto[]> {
  return (await photosRequest<{ photos: SelectedPhoto[] }>('gallery')).photos;
}

export async function getSavedGooglePhoto(): Promise<string | null> {
  return (await photosRequest<{ dataUrl: string | null }>('background')).dataUrl;
}

export async function getUserAppearance(): Promise<{
  appearance: DashboardAppearance | null; updatedAtMs: number; seededFromWeb: boolean;
  photoUpdatedAtMs?: number;
}> {
  return authenticatedRequest('userAppearance', 'Could not load appearance settings');
}

export async function saveUserAppearance(appearance: DashboardAppearance): Promise<void> {
  await authenticatedRequest('userAppearance', 'Could not save appearance settings', {
    method: 'PUT',
    body: JSON.stringify({appearance, source: Platform.OS === 'web' ? 'web' : 'tv'}),
  });
}

/**
 * Fetch the unified dashboard summary (Calendar, Tasks, Fitness, Weather)
 */
export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  return authenticatedRequest('getDashboardSummary', 'Failed to fetch dashboard', {
    headers: {'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'},
  });
}

/** Fetch real weather for one saved location. */
export async function fetchLocationWeather(city: string): Promise<Weather> {
  return authenticatedRequest(`getLocationWeather?city=${encodeURIComponent(city)}`, 'Weather lookup failed');
}

/**
 * Execute a quick action from the TV remote (e.g. complete task, update preferences)
 */
export async function executeTVAction(
  action: 'completeTask' | 'updatePreferences',
  payload: Record<string, unknown>
): Promise<{success: boolean; message?: string}> {
  return authenticatedRequest('executeAction', `Action ${action} failed`, {
    method: 'POST', body: JSON.stringify({action, payload}),
  });
}

/**
 * Request a 6-character TV pairing code for the user to authenticate on mobile/web
 */
export async function requestDevicePairing(): Promise<DevicePairingResponse> {
  const url = `${DEFAULT_API_URL}/authDevice?action=request-code`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to request device pairing code');
  }

  return response.json();
}

/**
 * Poll device pairing status until authorized
 */
export async function pollDevicePairing(
  pairing: DevicePairingResponse
): Promise<{ status: 'pending' | 'authorized' | 'expired'; customToken?: string }> {
  const url = `${DEFAULT_API_URL}/authDevice?action=poll`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: pairing.code, pollSecret: pairing.pollSecret }),
  });

  if (response.status === 410) return { status: 'expired' };

  if (!response.ok) {
    throw new Error('Failed to check device pairing status');
  }

  return response.json();
}
