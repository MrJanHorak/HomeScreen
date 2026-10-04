type Location = {id: string; name: string; query: string; isDefault?: boolean};
type Preferences = {savedLocations: Location[]; activeLocationId: string; stepGoal: number; distanceGoal: number};

export function createWeatherEditor(root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>) {
  let value: Preferences;
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
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const content = $('.weather-content');
  const status = $('.status');
  const save = $<HTMLButtonElement>('.weather-save');
  const form = $<HTMLFormElement>('form');
  const query = $<HTMLInputElement>('#weather-query');
  const label = $<HTMLInputElement>('#weather-label');
  const steps = $<HTMLInputElement>('#step-goal');
  const distance = $<HTMLInputElement>('#distance-goal');
  const message = (text: string, error = false) => { status.textContent = text; status.dataset.kind = error ? 'error' : 'info'; };
  async function request(method = 'GET', body?: object) {
    const token = await getToken();
    if (!token) throw new Error('Sign in to manage TV settings.');
    const response = await fetch(`${apiUrl}/userPreferences`, {method, headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, ...(body ? {body: JSON.stringify(body)} : {})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not update settings.');
    return result;
  }
  function render() {
    $('.location-list').replaceChildren();
    for (const loc of value.savedLocations) {
      const row = document.createElement('div'); row.className = 'location-row';
      const title = document.createElement('div'); title.className = 'location-title';
      const name = document.createElement('strong'); name.textContent = loc.name;
      const hint = document.createElement('span'); hint.textContent = `${loc.query}${loc.id === value.activeLocationId ? ' · Active' : ''}${loc.isDefault ? ' · Default' : ''}`;
      title.append(name, hint); row.append(title);
      const actions = document.createElement('div'); actions.className = 'device-actions';
      const button = (text: string, action: () => void, disabled = false) => {
        const item = document.createElement('button'); item.type = 'button'; item.className = 'button button-text'; item.textContent = text;
        item.setAttribute('aria-label', `${text}: ${loc.name}`); item.disabled = busy || disabled;
        item.onclick = () => { action(); dirty = true; render(); message('Unsaved settings. Save when ready.'); }; actions.append(item);
      };
      button('Use now', () => { value.activeLocationId = loc.id; }, loc.id === value.activeLocationId);
      button('Make default', () => { value.savedLocations.forEach((item) => { item.isDefault = item.id === loc.id; }); value.activeLocationId = loc.id; }, !!loc.isDefault);
      button('Remove', () => {
        value.savedLocations = value.savedLocations.filter((item) => item.id !== loc.id);
        if (loc.isDefault) value.savedLocations[0].isDefault = true;
        if (value.activeLocationId === loc.id) value.activeLocationId = value.savedLocations.find((item) => item.isDefault)!.id;
      }, value.savedLocations.length === 1);
      row.append(actions); $('.location-list').append(row);
    }
    steps.value = String(value.stepGoal); distance.value = String(value.distanceGoal);
    root.querySelectorAll<HTMLInputElement>('input').forEach((input) => { input.disabled = busy; });
    form.querySelector('button')!.disabled = busy || value.savedLocations.length >= 20;
    save.disabled = busy || !dirty;
    $<HTMLButtonElement>('.weather-reload').disabled = busy;
  }
  async function load() {
    const current = ++generation; busy = true; message('Loading settings…');
    try {
      const result = await request(); if (current !== generation) return;
      value = result.preferences; revision = result.updatedAtMs; dirty = false;
      content.hidden = false; busy = false; render(); message('Settings are up to date. Changes apply to running TVs within about a minute.');
    } catch (error) { if (current === generation) { busy = false; if (value) render(); message(error instanceof Error ? error.message : 'Could not load settings.', true); } }
  }
  form.onsubmit = (event) => {
    event.preventDefault(); if (busy || !form.reportValidity() || value.savedLocations.length >= 20) return;
    const city = query.value.trim(); if (!city) { message('Enter a city name.', true); return; }
    if (value.savedLocations.some((loc) => loc.query.toLowerCase() === city.toLowerCase())) { message('That city is already saved.', true); return; }
    const loc = {id: `loc-${crypto.randomUUID()}`, name: label.value.trim() || city, query: city, isDefault: false};
    value.savedLocations.push(loc); value.activeLocationId = loc.id; dirty = true; form.reset(); render(); message('City added to your changes. Save settings to apply it.'); query.focus();
  };
  for (const input of [steps, distance]) input.oninput = () => {
    value.stepGoal = Number(steps.value); value.distanceGoal = Number(distance.value); dirty = true; save.disabled = false;
  };
  save.onclick = async () => {
    if (busy || !steps.reportValidity() || !distance.reportValidity()) return;
    const current = generation; busy = true; render(); message('Saving settings…');
    try { const result = await request('PUT', {preferences: value, expectedUpdatedAtMs: revision});
      if (current !== generation) return; revision = result.updatedAtMs; dirty = false; message('Settings saved. Running TVs update within about a minute.');
    } catch (error) { if (current === generation) message(error instanceof Error ? error.message : 'Could not save settings.', true); }
    finally { if (current === generation) { busy = false; render(); } }
  };
  $('.weather-reload').onclick = () => { if (!dirty || window.confirm('Discard unsaved weather and goal changes and reload?')) void load(); };
  window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  return {load, clear() { generation++; busy = false; dirty = false; content.hidden = true; $('.location-list').replaceChildren(); form.reset(); steps.value = ''; distance.value = ''; message('Sign in to manage weather cities.'); }};
}
