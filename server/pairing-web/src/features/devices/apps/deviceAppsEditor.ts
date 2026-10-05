import {createApiClient} from '../../../shared/apiClient';
type App = {packageName: string; label: string};
type Preferences = {visible: boolean; packages: string[]};
export function createDeviceAppsEditor(root: HTMLElement, id: string, apiUrl: string, getToken: () => Promise<string | null>) {
  let generation = 0;
  let apps: App[] = [];
  let preferences: Preferences = {visible: false, packages: []};
  let revision = 0;
  let busy = false;
  let dirty = false;
  root.innerHTML = `<p class="field-hint">Favorites apply to this TV. Keep it online to sync installed apps and receive changes.</p>
    <div class="apps-content" hidden><label class="check-control"><input type="checkbox" class="apps-visible" /> Show favorite apps on dashboard</label><div class="favorite-list"></div><h4>Installed apps</h4><div class="installed-apps"></div>
    <button class="button button-secondary apps-save" type="button">Save favorite apps</button></div><button class="button button-text apps-reload" type="button">Reload TV apps</button><p class="status" role="status" aria-live="polite"></p>`;
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const status = $('.status'); const content = $('.apps-content'); const visible = $<HTMLInputElement>('.apps-visible');
  const save = $<HTMLButtonElement>('.apps-save');
  const request = createApiClient(apiUrl, getToken, {
    signIn: 'Sign in to manage apps.',
    failure: 'Could not load apps.',
  });
  function render() {
    visible.checked = preferences.visible; visible.disabled = busy; save.disabled = busy || !dirty;
    const selected = $('.favorite-list'); const installed = $('.installed-apps'); selected.replaceChildren(); installed.replaceChildren();
    function button(parent: HTMLElement, text: string, action: () => void, disabled = false) {
      const item = document.createElement('button'); item.type = 'button'; item.className = 'button button-text'; item.textContent = text; item.disabled = busy || disabled;
      item.onclick = () => { action(); dirty = true; render(); status.textContent = 'Unsaved favorite apps. Save when ready.'; }; parent.append(item);
    }
    for (const [index, name] of preferences.packages.entries()) {
      const row = document.createElement('div'); row.className = 'favorite-row';
      const label = document.createElement('span'); label.textContent = apps.find((app) => app.packageName === name)?.label || name; row.append(label);
      for (const [title, direction] of [['Move left',-1],['Move right',1]] as const) button(row, `${title}: ${label.textContent}`, () => {
        [preferences.packages[index], preferences.packages[index + direction]] = [preferences.packages[index + direction], preferences.packages[index]];
      }, index + direction < 0 || index + direction >= preferences.packages.length);
      button(row, `Remove: ${label.textContent}`, () => { preferences.packages.splice(index,1); }); selected.append(row);
    }
    if (!preferences.packages.length) selected.textContent = 'No favorites yet. Choose installed apps below.';
    for (const app of apps) {
      const label = document.createElement('label'); label.className = 'check-control'; const input = document.createElement('input'); input.type = 'checkbox'; input.checked = preferences.packages.includes(app.packageName); input.disabled = busy;
      input.onchange = () => { preferences.packages = input.checked ? [...preferences.packages, app.packageName] : preferences.packages.filter((name) => name !== app.packageName); dirty = true; render(); };
      label.append(input, document.createTextNode(app.label)); installed.append(label);
    }
  }
  async function load() {
    const current = ++generation; busy = true; status.textContent = 'Loading apps…';
    try { const result = await request<{apps: App[]; preferences: Preferences | null; updatedAtMs: number}>(`deviceApps?id=${id}`); if (current !== generation) return;
      apps = result.apps; preferences = result.preferences || {visible: false, packages: []}; revision = result.updatedAtMs; dirty = false;
      content.hidden = !result.preferences; busy = false; render(); status.textContent = result.preferences ? 'Running TVs receive changes within about a minute.' : 'Open the updated HomeScreen app on this TV, then reload its apps.';
    } catch (error) { if (current === generation) status.textContent = error instanceof Error ? error.message : 'Could not load apps.'; }
    finally { if (current === generation) { busy = false; render(); } }
  }
  visible.onchange = () => { preferences.visible = visible.checked; dirty = true; render(); };
  save.onclick = async () => {
    const current = generation; busy = true; render(); status.textContent = 'Saving favorite apps…';
    try { const result = await request<{updatedAtMs: number}>(`deviceApps?id=${id}`, 'PUT', {preferences, expectedUpdatedAtMs: revision}); if (current !== generation) return; revision = result.updatedAtMs; dirty = false; status.textContent = 'Favorite apps saved to this TV.'; }
    catch (error) { if (current === generation) status.textContent = error instanceof Error ? error.message : 'Could not save apps.'; }
    finally { if (current === generation) { busy = false; render(); } }
  };
  $('.apps-reload').onclick = () => { if (!busy && (!dirty || window.confirm('Discard unsaved favorite app changes and reload?'))) void load(); };
  const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  return {load, hasChanges: () => dirty, clear() {generation++; dirty = false; window.removeEventListener('beforeunload', beforeUnload); root.replaceChildren();}};
}
