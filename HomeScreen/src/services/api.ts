import type { DashboardSummaryResponse, DevicePairingResponse } from '../../../shared/src/types';

// Default to Firebase Local Emulator or configured remote URL
const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:5001/tv-homescreen-backend/us-central1';

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID || 'user-001';

/**
 * Fetch the unified dashboard summary (Calendar, Tasks, Fitness, Weather)
 */
export async function fetchDashboardSummary(
  userId = DEFAULT_USER_ID
): Promise<DashboardSummaryResponse> {
  const url = `${DEFAULT_API_URL}/getDashboardSummary?userId=${encodeURIComponent(userId)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
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
  payload: Record<string, unknown>,
  userId = DEFAULT_USER_ID
): Promise<{ success: boolean; message?: string }> {
  const url = `${DEFAULT_API_URL}/executeAction`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      payload,
      userId,
    }),
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
  code: string
): Promise<{ status: 'pending' | 'authorized' | 'expired'; userId?: string; customToken?: string }> {
  const url = `${DEFAULT_API_URL}/authDevice?action=poll&code=${encodeURIComponent(code)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to check device pairing status');
  }

  return response.json();
}
