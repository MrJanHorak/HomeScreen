import type {User} from 'firebase/auth';
import {createApiClient} from '../../shared/apiClient';
import {requiredElement, statusWriter} from '../../shared/dom';
import type {StatusWriter} from '../../shared/dom';
import {createDeviceManager} from '../devices/deviceManager';

const ACTIONS = [
  {selector: '#disconnect-photos-button', action: 'disconnectPhotos',
    confirmation: 'Remove selected photos, disconnect Photos, and sign out all TVs?',
    success: 'Saved photos and Photos access removed. Sign in again to continue.'},
  {selector: '#disconnect-google-button', action: 'disconnectGoogle',
    confirmation: 'Disconnect Calendar, Tasks and activity, and sign out all TVs?',
    success: 'Google dashboard access removed. Pair again to reconnect.'},
  {selector: '#revoke-button', action: 'signOutEverywhere',
    confirmation: 'Sign out every TV and browser session for this account?',
    success: 'All sessions revoked. Sign in again to continue.'},
  {selector: '#delete-account-button', action: 'deleteAccount',
    confirmation: 'Permanently delete your account, saved settings, photos and dashboard data?',
    success: 'Account and saved data deleted.'},
] as const;

export function createAccountController(root: HTMLElement, apiUrl: string,
  getUser: () => User | null, signOut: () => Promise<void>, showStatus: StatusWriter) {
  const controls = requiredElement(root, '#account-controls');
  const connections = requiredElement(root, '#connection-status');
  const showAccountStatus = statusWriter(requiredElement(root, '#account-status'));
  const getToken = async () => getUser()?.getIdToken() ?? null;
  const request = createApiClient(apiUrl, getToken, {
    signIn: 'Sign in to manage your account.', failure: 'Could not update your account.',
  });
  const devices = createDeviceManager(requiredElement(root, '#device-manager'), apiUrl, getToken);
  const buttons = ACTIONS.map((definition) => ({...definition,
    button: requiredElement<HTMLButtonElement>(root, definition.selector)}));
  let generation = 0;
  let busy = false;

  function updateControls() {
    controls.hidden = !getUser();
    if (!getUser()) connections.textContent = 'Sign in to see connected services.';
    for (const {button} of buttons) button.disabled = busy;
  }

  async function loadConnections() {
    const operation = generation;
    try {
      const result = await request<{connections: {dashboardGoogle: boolean; mealSheet: boolean; photos: boolean}}>('accountSecurity');
      if (operation !== generation) return;
      const entries = [
        ['Calendar, Tasks & activity', result.connections.dashboardGoogle],
        ['Google Sheets', result.connections.mealSheet],
        ['Google Photos', result.connections.photos],
      ] as const;
      connections.replaceChildren(...entries.map(([name, connected]) => {
        const item = document.createElement('div');
        item.className = 'connection-item';
        const title = document.createElement('span');
        title.textContent = name;
        const state = document.createElement('strong');
        state.textContent = connected ? 'Connected' : 'Not connected';
        state.dataset.connected = String(connected);
        item.append(title, state);
        return item;
      }));
    } catch {
      if (operation === generation) connections.textContent = 'Connection status is temporarily unavailable.';
    }
  }

  for (const {button, action, confirmation, success} of buttons) {
    button.addEventListener('click', async () => {
      if (busy || !getUser() || !window.confirm(confirmation)) return;
      const operation = ++generation;
      busy = true;
      updateControls();
      try {
        await request('accountSecurity', 'POST', {action});
        if (operation !== generation) return;
        await signOut();
        showStatus(success, 'success');
      } catch (error) {
        if (operation === generation) showAccountStatus(error instanceof Error ? error.message : 'Account action failed.', 'error');
      } finally {
        if (operation === generation) {
          busy = false;
          updateControls();
        }
      }
    });
  }

  async function load() {
    updateControls();
    if (!getUser()) return;
    await Promise.all([loadConnections(), devices.load()]);
  }

  function clear() {
    generation++;
    busy = false;
    devices.clear();
    connections.textContent = 'Sign in to see connected services.';
    showAccountStatus('');
    updateControls();
  }
  updateControls();
  return {load, clear};
}
