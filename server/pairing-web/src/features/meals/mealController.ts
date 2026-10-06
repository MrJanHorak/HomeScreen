import type {User} from 'firebase/auth';
import {createApiClient} from '../../shared/apiClient';
import {requiredElement, statusWriter} from '../../shared/dom';
import {googleAuthorizationUrl} from '../../shared/googleAuthorization';

export function createMealController(root: HTMLElement, apiUrl: string,
  getUser: () => User | null, params: URLSearchParams) {
  const showStatus = statusWriter(requiredElement(root, '#meal-status'));
  const accessButton = requiredElement<HTMLButtonElement>(root, '#meal-access-button');
  const form = requiredElement<HTMLFormElement>(root, '#meal-form');
  const urlInput = requiredElement<HTMLInputElement>(root, '#meal-url');
  const saveButton = requiredElement<HTMLButtonElement>(root, '#meal-save-button');
  const current = requiredElement(root, '#meal-current');
  const removeButton = requiredElement<HTMLButtonElement>(root, '#meal-remove-button');
  const request = createApiClient(apiUrl, async () => getUser()?.getIdToken() ?? null, {
    signIn: 'Sign in before connecting a meal Sheet.', failure: 'Could not connect the meal Sheet.',
  });
  let generation = 0;
  let busy = false;
  let authorized = false;
  let currentSheet: string | null = null;

  function updateControls() {
    const signedIn = Boolean(getUser());
    accessButton.hidden = !signedIn || authorized;
    accessButton.disabled = !signedIn || busy;
    form.hidden = !signedIn || !authorized;
    urlInput.disabled = busy;
    saveButton.disabled = busy;
    current.hidden = !signedIn || !currentSheet;
    current.textContent = currentSheet ? `Connected: ${currentSheet}` : '';
    removeButton.hidden = !signedIn || !authorized;
    removeButton.textContent = currentSheet ? 'Disconnect meal Sheet' : 'Remove Google Sheets access';
    removeButton.disabled = busy;
  }

  async function load() {
    const operation = generation;
    if (!getUser()) return;
    try {
      const result = await request<{authorized: boolean; spreadsheetTitle: string | null}>('mealSheetConfig');
      if (operation !== generation) return;
      authorized = result.authorized;
      currentSheet = result.spreadsheetTitle;
      updateControls();
      if (params.get('result') === 'meals_connected') {
        showStatus('Google Sheets access is ready. Paste your meal Sheet link below.', 'success');
      }
    } catch (error) {
      if (operation === generation) showStatus(error instanceof Error ? error.message : 'Could not load meal settings.', 'error');
    }
  }

  /** Own busy state and ignore completions from a previous signed-in account. */
  async function run(action: (operation: number) => Promise<void>, fallback: string) {
    if (busy || !getUser()) return;
    const operation = ++generation;
    busy = true;
    updateControls();
    try {
      await action(operation);
    } catch (error) {
      if (operation === generation) showStatus(error instanceof Error ? error.message : fallback, 'error');
    } finally {
      if (operation === generation) {
        busy = false;
        updateControls();
      }
    }
  }

  accessButton.addEventListener('click', () => void run(async (operation) => {
    showStatus('Opening Google permission screen…');
    const result = await request<unknown>('beginGoogleMeals', 'POST');
    if (operation === generation) {
      window.location.assign(googleAuthorizationUrl(result, 'The server returned an invalid Google permission URL.'));
    }
  }, 'Could not request Sheet access.'));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void run(async (operation) => {
      showStatus('Checking your Sheet…');
      const result = await request<{spreadsheetTitle: string; mealCount: number}>(
        'mealSheetConfig', 'PUT', {url: urlInput.value.trim()});
      if (operation !== generation) return;
      currentSheet = result.spreadsheetTitle;
      urlInput.value = '';
      showStatus(`Connected ${result.mealCount} dated dinners. Your TV will refresh automatically.`, 'success');
    }, 'Could not connect this Sheet.');
  });

  removeButton.addEventListener('click', () => void run(async (operation) => {
    await request('mealSheetConfig', 'DELETE');
    if (operation !== generation) return;
    currentSheet = null;
    authorized = false;
    showStatus('Meal Sheet disconnected and its stored access removed.', 'success');
  }, 'Could not remove the Sheet.'));

  function clear() {
    generation++;
    busy = false;
    authorized = false;
    currentSheet = null;
    urlInput.value = '';
    showStatus('');
    updateControls();
  }
  updateControls();
  if (params.get('result') === 'meals_denied') showStatus('Google Sheets access was not approved.', 'error');
  if (params.get('result') === 'meals_error') showStatus('Could not connect Google Sheets. Please try again.', 'error');
  return {load, clear};
}
