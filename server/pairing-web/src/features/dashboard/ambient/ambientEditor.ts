import {DEFAULT_AMBIENT as defaults, PLASMA_PRESETS as presets, normalizeAmbient} from './ambientPreferences';
import type {Ambient} from './ambientPreferences';

export function createAmbientEditor(root: HTMLElement, onChange: (value: Ambient) => void) {
  let value = normalizeAmbient(null);
  root.innerHTML = `<p class="field-hint">Show a calm backdrop when the remote is idle. Press a navigation button on the TV to return to the dashboard.</p>
    <label class="check-control"><input type="checkbox" id="ambient-enabled" /> Enable ambient mode</label>
    <fieldset class="ambient-fields"><legend class="sr-only">Ambient preferences</legend><div class="editor-columns">
      <div><label class="field-label" for="ambient-idle">START AFTER</label><select id="ambient-idle">${[5,10,20].map((n) => `<option value="${n}">${n} minutes</option>`).join('')}</select></div>
      <div><label class="field-label" for="ambient-source">BACKDROP</label><select id="ambient-source"><option value="gallery">Built-in photos</option><option value="selected">My selected photos</option><option value="plasma">Plasma flow</option><option value="none">Dark</option></select></div>
    </div><div class="ambient-photo"><label class="field-label" for="ambient-photo-minutes">CHANGE PHOTO EVERY</label><select id="ambient-photo-minutes">${[1,3,5].map((n) => `<option value="${n}">${n} ${n === 1 ? 'minute' : 'minutes'}</option>`).join('')}</select><p class="field-hint">Choose your images under Photos below. Dashboard and ambient share the selected gallery.</p></div>
    <div class="ambient-plasma"><label class="field-label" for="ambient-preset">FLOW COLORS</label><select id="ambient-preset"><option value="custom">Custom colors</option>${Object.keys(presets).map((name) => `<option>${name}</option>`).join('')}</select><div class="plasma-colors">${[0,1,2].map((i) => `<label class="field-label">COLOR ${i+1}<input type="color" data-plasma="${i}" aria-label="Plasma color ${i+1}" /></label>`).join('')}</div></div>
    <p class="field-label">INFORMATION TO ROTATE</p><p class="field-hint">Clock and date stay visible. Choose the other details to display.</p><div class="ambient-info">${Object.keys(defaults.info).map((id) => `<label class="check-control"><input type="checkbox" data-info="${id}" /> ${id[0].toUpperCase()+id.slice(1)}</label>`).join('')}</div>
    <label class="field-label" for="ambient-cycle">CHANGE DETAIL EVERY</label><select id="ambient-cycle">${[30,60,120].map((n) => `<option value="${n}">${n} seconds</option>`).join('')}</select></fieldset>
    <details class="help-panel"><summary>About ambient mode</summary><p>Information moves to another screen area every 90 seconds. Preview ambient mode from the TV’s Ambient settings. For OLED screens, keep panel protection enabled and turn the TV off when the room is empty for long periods.</p></details>`;
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const enabled = $<HTMLInputElement>('#ambient-enabled');
  const fields = $<HTMLFieldSetElement>('fieldset');
  function render(next: Ambient, busy: boolean) {
    value = next; enabled.checked = value.enabled; enabled.disabled = busy; fields.disabled = busy || !value.enabled;
    $<HTMLSelectElement>('#ambient-idle').value = String(value.idleMinutes);
    $<HTMLSelectElement>('#ambient-source').value = value.photoSource;
    $<HTMLSelectElement>('#ambient-photo-minutes').value = String(value.photoMinutes);
    $<HTMLSelectElement>('#ambient-cycle').value = String(value.infoCycleSeconds);
    $('.ambient-photo').hidden = !['gallery','selected'].includes(value.photoSource);
    $('.ambient-plasma').hidden = value.photoSource !== 'plasma';
    $<HTMLSelectElement>('#ambient-preset').value = Object.entries(presets).find(([, colors]) => colors.every((c,i) => c === value.plasmaColors[i]))?.[0] || 'custom';
    root.querySelectorAll<HTMLInputElement>('[data-plasma]').forEach((input) => { input.value = value.plasmaColors[Number(input.dataset.plasma)]; });
    root.querySelectorAll<HTMLInputElement>('[data-info]').forEach((input) => { input.checked = value.info[input.dataset.info as keyof Ambient['info']]; });
  }
  enabled.onchange = () => onChange({...value, enabled: enabled.checked});
  for (const [selector, key] of [['#ambient-idle','idleMinutes'],['#ambient-source','photoSource'],['#ambient-photo-minutes','photoMinutes'],['#ambient-cycle','infoCycleSeconds']] as const) {
    $<HTMLSelectElement>(selector).onchange = (event) => { const choice = (event.target as HTMLSelectElement).value; onChange({...value, [key]: key === 'photoSource' ? choice : Number(choice)}); };
  }
  $<HTMLSelectElement>('#ambient-preset').onchange = (event) => { const colors = presets[(event.target as HTMLSelectElement).value as keyof typeof presets]; if (colors) onChange({...value, plasmaColors: [...colors] as Ambient['plasmaColors']}); };
  root.querySelectorAll<HTMLInputElement>('[data-plasma]').forEach((input) => { input.oninput = () => { const colors = [...value.plasmaColors] as Ambient['plasmaColors']; colors[Number(input.dataset.plasma)] = input.value; onChange({...value, plasmaColors: colors}); }; });
  root.querySelectorAll<HTMLInputElement>('[data-info]').forEach((input) => { input.onchange = () => onChange({...value, info: {...value.info, [input.dataset.info!]: input.checked}}); });
  return {render};
}
