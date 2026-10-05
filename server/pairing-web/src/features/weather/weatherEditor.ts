import {createApiClient} from '../../shared/apiClient';
import type {SavedLocation, UserPreferences} from '../../../../../shared/src/types';

export function createWeatherEditor(root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>) {
  let preferences: UserPreferences;
  let revision = 0;
  let generation = 0;
  let busy = false;
  let dirty = false;
  root.innerHTML = `<h2>Weather cities</h2><p class="meal-copy">Choose the city shown on your TV. Your saved cities sync across linked TVs.</p>
    <div class="weather-content" hidden><div class="location-list"></div>
      <form class="location-form"><div class="settings-fields">
        <div><label for="weather-query" class="field-label">CITY, STATE OR COUNTRY</label><input id="weather-query" required maxlength="100" placeholder="Denver, CO, US" aria-describedby="weather-help" /></div>
        <div><label for="weather-label" class="field-label">LABEL (OPTIONAL)</label><input id="weather-label" maxlength="80" placeholder="Vacation cabin" /></div>
      </div><p id="weather-help" class="field-hint">Include a state or country to distinguish cities with the same name.</p>
      <button class="button button-secondary" type="submit">Add city</button></form>
      <details class="help-panel"><summary>Active city or default city?</summary><p>The active city is displayed now. The default city supplies the dashboard’s main weather data. Choose “Make default” to use a city for both. Keep at least one saved city; you can save up to 20.</p></details>
      <details class="help-panel"><summary>Activity goals</summary><div class="settings-fields">
        <div><label class="field-label" for="step-goal">DAILY STEPS</label><input id="step-goal" type="number" min="1" max="100000" step="1" required /></div>
        <div><label class="field-label" for="distance-goal">DAILY DISTANCE (KM)</label><input id="distance-goal" type="number" min="0.1" max="1000" step="0.1" required /></div>
      </div><p class="field-hint">These goals set the progress targets on the activity card.</p></details>
      <div class="editor-actions"><button class="button button-primary weather-save" type="button">Save settings to TVs</button><button class="button button-text weather-reload" type="button">Reload settings</button></div>
    </div><p class="status" role="status" aria-live="polite">Sign in to manage weather cities.</p>`;
  const getElement = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const content = getElement('.weather-content');
  const locationList = getElement('.location-list');
  const status = getElement('.status');
  const save = getElement<HTMLButtonElement>('.weather-save');
  const reload = getElement<HTMLButtonElement>('.weather-reload');
  const form = getElement<HTMLFormElement>('form');
  const query = getElement<HTMLInputElement>('#weather-query');
  const label = getElement<HTMLInputElement>('#weather-label');
  const steps = getElement<HTMLInputElement>('#step-goal');
  const distance = getElement<HTMLInputElement>('#distance-goal');
  const request = createApiClient(apiUrl, getToken, {
    signIn: 'Sign in to manage TV settings.',
    failure: 'Could not update settings.',
  });

  function message(text: string, error = false) {
    status.textContent = text;
    status.dataset.kind = error ? 'error' : 'info';
  }

  function markChanged(text = 'Unsaved settings. Save when ready.') {
    dirty = true;
    render();
    message(text);
  }

  function locationButton(location: SavedLocation, text: string, action: () => void, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button-text';
    button.textContent = text;
    button.setAttribute('aria-label', `${text}: ${location.name}`);
    button.disabled = busy || disabled;
    button.onclick = () => { action(); markChanged(); };
    return button;
  }

  function makeDefault(location: SavedLocation) {
    for (const item of preferences.savedLocations) item.isDefault = item.id === location.id;
    preferences.activeLocationId = location.id;
  }

  function removeLocation(location: SavedLocation) {
    preferences.savedLocations = preferences.savedLocations.filter((item) => item.id !== location.id);
    if (location.isDefault) preferences.savedLocations[0].isDefault = true;
    if (preferences.activeLocationId === location.id) {
      preferences.activeLocationId = preferences.savedLocations.find((item) => item.isDefault)!.id;
    }
  }

  function locationRow(location: SavedLocation) {
    const row = document.createElement('div');
    row.className = 'location-row';
    const title = document.createElement('div');
    title.className = 'location-title';
    const name = document.createElement('strong');
    name.textContent = location.name;
    const hint = document.createElement('span');
    const active = location.id === preferences.activeLocationId;
    hint.textContent = `${location.query}${active ? ' · Active' : ''}${location.isDefault ? ' · Default' : ''}`;
    title.append(name, hint);

    const actions = document.createElement('div');
    actions.className = 'device-actions';
    actions.append(
      locationButton(location, 'Use now', () => { preferences.activeLocationId = location.id; }, active),
      locationButton(location, 'Make default', () => makeDefault(location), !!location.isDefault),
      locationButton(location, 'Remove', () => removeLocation(location), preferences.savedLocations.length === 1),
    );
    row.append(title, actions);
    return row;
  }

  function render() {
    locationList.replaceChildren(...preferences.savedLocations.map(locationRow));
    steps.value = String(preferences.stepGoal);
    distance.value = String(preferences.distanceGoal);
    root.querySelectorAll<HTMLInputElement>('input').forEach((input) => { input.disabled = busy; });
    form.querySelector('button')!.disabled = busy || preferences.savedLocations.length >= 20;
    save.disabled = busy || !dirty;
    reload.disabled = busy;
  }

  async function load() {
    const current = ++generation;
    busy = true;
    message('Loading settings…');
    try {
      const result = await request<{preferences: UserPreferences; updatedAtMs: number}>('userPreferences');
      if (current !== generation) return;
      preferences = result.preferences;
      revision = result.updatedAtMs;
      dirty = false;
      content.hidden = false;
      message('Settings are up to date. Changes apply to running TVs within about a minute.');
    } catch (error) {
      if (current === generation) message(error instanceof Error ? error.message : 'Could not load settings.', true);
    } finally {
      if (current === generation) {
        busy = false;
        if (preferences) render();
      }
    }
  }

  function addCity(event: SubmitEvent) {
    event.preventDefault();
    if (busy || !form.reportValidity() || preferences.savedLocations.length >= 20) return;
    const city = query.value.trim();
    if (!city) { message('Enter a city name.', true); return; }
    if (preferences.savedLocations.some((location) => location.query.toLowerCase() === city.toLowerCase())) {
      message('That city is already saved.', true);
      return;
    }
    const location = {id: `loc-${crypto.randomUUID()}`, name: label.value.trim() || city, query: city, isDefault: false};
    preferences.savedLocations.push(location);
    preferences.activeLocationId = location.id;
    form.reset();
    markChanged('City added to your changes. Save settings to apply it.');
    query.focus();
  }

  async function saveSettings() {
    if (busy || !steps.reportValidity() || !distance.reportValidity()) return;
    const current = generation;
    busy = true;
    render();
    message('Saving settings…');
    try {
      const result = await request<{updatedAtMs: number}>('userPreferences', 'PUT', {
        preferences, expectedUpdatedAtMs: revision,
      });
      if (current !== generation) return;
      revision = result.updatedAtMs;
      dirty = false;
      message('Settings saved. Running TVs update within about a minute.');
    } catch (error) {
      if (current === generation) message(error instanceof Error ? error.message : 'Could not save settings.', true);
    } finally {
      if (current === generation) { busy = false; render(); }
    }
  }

  function clear() {
    generation++;
    busy = false;
    dirty = false;
    content.hidden = true;
    locationList.replaceChildren();
    form.reset();
    steps.value = '';
    distance.value = '';
    message('Sign in to manage weather cities.');
  }

  form.onsubmit = addCity;
  for (const input of [steps, distance]) input.oninput = () => {
    preferences.stepGoal = Number(steps.value);
    preferences.distanceGoal = Number(distance.value);
    dirty = true;
    save.disabled = false;
  };
  save.onclick = () => void saveSettings();
  reload.onclick = () => {
    if (!dirty || window.confirm('Discard unsaved weather and goal changes and reload?')) void load();
  };
  window.addEventListener('beforeunload', (event) => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });
  return {load, clear};
}
