import { auth } from './firebase';
import type { DashboardSummaryResponse, DevicePairingResponse } from '../../../shared/src/types';

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

/**
 * Fetch the unified dashboard summary (Calendar, Tasks, Fitness, Weather)
 */
export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const url = `${DEFAULT_API_URL}/getDashboardSummary`;
  const response = await fetch(url, {
    method: 'GET',
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.status} ${response.statusText}`);
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
