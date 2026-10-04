type LinkedDevice = {id: string; name: string; pairedAtMs: number; lastSeenAtMs: number};

export function createDeviceManager(root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>) {
  let generation = 0;
  let busy = false;
  root.innerHTML = `<h3>Linked TVs</h3>
    <p class="meal-copy">Name each TV or remove its access. Removing a TV keeps your other TVs and this browser signed in.</p>
    <div class="device-list"></div>
    <p class="field-hint">Older TVs appear after the updated TV app opens and connects. If a TV is still missing, keep it online and refresh this list.</p>
    <button class="button button-text device-refresh" type="button">Refresh TV list</button>
    <p class="status device-status" role="status" aria-live="polite"></p>`;
  const list = root.querySelector<HTMLElement>('.device-list')!;
  const status = root.querySelector<HTMLElement>('.device-status')!;
  const refresh = root.querySelector<HTMLButtonElement>('.device-refresh')!;
  function message(text: string, kind: 'info' | 'error' | 'success' = 'info') {
    status.textContent = text;
    status.dataset.kind = kind;
  }
  async function request(method: 'GET' | 'PUT' | 'DELETE', body?: object) {
    const token = await getToken();
    if (!token) throw new Error('Sign in to manage linked TVs.');
    const response = await fetch(`${apiUrl}/linkedDevices`, {
      method, headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
      ...(body ? {body: JSON.stringify(body)} : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load linked TVs.');
    return result;
  }
  function setBusy(value: boolean) {
    busy = value;
    root.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button').forEach((control) => { control.disabled = value; });
  }
  function render(devices: LinkedDevice[]) {
    list.replaceChildren();
    if (!devices.length) {
      const empty = document.createElement('p');
      empty.className = 'meal-copy';
      empty.textContent = 'No TVs have checked in yet. Open your TV dashboard, then refresh this list.';
      list.append(empty);
    }
    for (const device of devices) {
      const row = document.createElement('form');
      row.className = 'device-row';
      const label = document.createElement('label');
      label.className = 'field-label';
      label.textContent = 'TV NAME';
      const input = document.createElement('input');
      input.value = device.name; input.maxLength = 40; input.required = true;
      input.setAttribute('aria-label', `Name for ${device.name}`);
      label.append(input);
      const info = document.createElement('p');
      info.className = 'field-hint';
      info.textContent = device.lastSeenAtMs
        ? `Last connected ${new Date(device.lastSeenAtMs).toLocaleString()}`
        : 'Paired; waiting for the TV to connect.';
      const actions = document.createElement('div');
      actions.className = 'device-actions';
      const rename = document.createElement('button');
      rename.type = 'submit'; rename.className = 'button button-secondary'; rename.textContent = 'Save name';
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'button button-text danger'; remove.textContent = 'Remove TV';
      remove.setAttribute('aria-label', `Remove ${device.name}`);
      actions.append(rename, remove);
      row.append(label, info, actions);
      row.addEventListener('submit', (event) => {
        event.preventDefault();
        if (busy) return;
        void update('PUT', {id: device.id, name: input.value.trim()}, 'TV name saved.');
      });
      remove.addEventListener('click', () => {
        if (busy || !window.confirm(`Remove ${device.name}? It will sign out on its next connection and need to be paired again.`)) return;
        void update('DELETE', {id: device.id}, 'TV removed. Its next connection will sign it out.');
      });
      list.append(row);
    }
  }
  async function load() {
    const current = ++generation;
    setBusy(true); message('Loading linked TVs…');
    try {
      const result = await request('GET') as {devices: LinkedDevice[]};
      if (current !== generation) return;
      render(result.devices); message('');
    } catch (error) {
      if (current === generation) message(error instanceof Error ? error.message : 'Could not load TVs.', 'error');
    } finally { if (current === generation) setBusy(false); }
  }
  async function update(method: 'PUT' | 'DELETE', body: object, success: string) {
    const current = generation;
    setBusy(true); message('Updating linked TV…');
    try {
      await request(method, body);
      if (current !== generation) return;
      await load();
      if (current + 1 === generation) message(success, 'success');
    } catch (error) {
      if (current === generation) message(error instanceof Error ? error.message : 'Could not update TV.', 'error');
    } finally { if (current === generation) setBusy(false); }
  }
  refresh.addEventListener('click', () => { if (!busy) void load(); });
  return {load, clear() { generation++; setBusy(false); list.replaceChildren(); message('Sign in to manage linked TVs.'); }};
}
