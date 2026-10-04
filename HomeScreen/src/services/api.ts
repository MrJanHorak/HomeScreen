import { auth } from './firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import {clearLocalUserData} from './localUserData';
import type { DashboardSummaryResponse, DevicePairingResponse, Weather } from '../../../shared/src/types';
import type { DashboardAppearance } from '../theme/appearance';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default to Firebase Local Emulator or configured remote URL
const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:5001/tv-homescreen-backend/us-central1';

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
  const response = await fetch(`${DEFAULT_API_URL}/linkedDevices?current=1`, {headers: await authHeaders()});
  await handleRevokedSession(response);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Could not load this TV');
  return body;
}

export async function getCurrentDevice(): Promise<{name: string; pairedAtMs: number} | null> {
  return (await getDeviceConnectionInfo()).device;
}

/** Register a pre-device-management TV session without asking the owner to pair again. */
export async function migrateLegacyDevice(): Promise<string> {
  const keyName = '@homescreen_device_installation_v1';
  let installationKey = await AsyncStorage.getItem(keyName);
  if (!installationKey) {
    installationKey = `${Date.now().toString(36)}-${Array.from({length: 5}, () => Math.random().toString(36).slice(2, 10)).join('')}`;
    await AsyncStorage.setItem(keyName, installationKey);
  }
  const response = await fetch(`${DEFAULT_API_URL}/linkedDevices?current=1`, {
    method: 'POST', headers: await authHeaders(), body: JSON.stringify({installationKey}),
  });
  const body = await response.json();
  if (!response.ok || typeof body.customToken !== 'string') throw new Error(body.error || 'Could not register this TV');
  return body.customToken;
}

export async function disconnectCurrentDevice(): Promise<void> {
  const headers = await authHeaders();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${DEFAULT_API_URL}/linkedDevices?current=1`, {
      method: 'DELETE', headers, signal: controller.signal,
    });
    if (!response.ok) throw new Error('Could not remove this TV session');
  } finally { clearTimeout(timer); }
}

async function photosRequest<T>(action: string, method: 'GET' | 'POST' = 'GET'): Promise<T> {
  const response = await fetch(`${DEFAULT_API_URL}/googlePhotosPicker?action=${action}`, {
    method,
    headers: await authHeaders(),
  });
  await handleRevokedSession(response);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Google Photos request failed (${response.status})`);
  return body as T;
}

export async function beginGooglePhotosConnection(): Promise<string> {
  const response = await fetch(`${DEFAULT_API_URL}/beginGooglePhotos`, {
    method: 'POST', headers: await authHeaders(),
  });
  await handleRevokedSession(response);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Could not connect Google Photos');
  return body.authorizationUrl;
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
}> {
  const response = await fetch(`${DEFAULT_API_URL}/userAppearance`, {
    headers: await authHeaders(),
  });
  await handleRevokedSession(response);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Could not load appearance settings');
  return body;
}

export async function saveUserAppearance(appearance: DashboardAppearance): Promise<void> {
  const response = await fetch(`${DEFAULT_API_URL}/userAppearance`, {
    method: 'PUT', headers: await authHeaders(),
    body: JSON.stringify({ appearance, source: Platform.OS === 'web' ? 'web' : 'tv' }),
  });
  await handleRevokedSession(response);
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Could not save appearance settings');
  }
}

/**
 * Fetch the unified dashboard summary (Calendar, Tasks, Fitness, Weather)
 */
export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const url = `${DEFAULT_API_URL}/getDashboardSummary`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...await authHeaders(),
      'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  });
  await handleRevokedSession(response);

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/** Fetch real weather for one saved location. */
export async function fetchLocationWeather(city: string): Promise<Weather> {
  const url = `${DEFAULT_API_URL}/getLocationWeather?city=${encodeURIComponent(city)}`;
  const response = await fetch(url, { method: 'GET', headers: await authHeaders() });
  await handleRevokedSession(response);
  if (!response.ok) {
    throw new Error(`Weather lookup failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Execute a quick action from the TV remote (e.g. complete task, update preferences)
 */
export async function executeTVAction(
  action: 'completeTask' | 'updatePreferences',
  payload: Record<string, unknown>
): Promise<{ success: boolean; message?: string }> {
  const url = `${DEFAULT_API_URL}/executeAction`;
  const response = await fetch(url, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action, payload }),
  });
  await handleRevokedSession(response);

  if (!response.ok) {
    throw new Error(`Action ${action} failed: ${response.status}`);
  }

  return response.json();
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
