import {DEFAULT_READING, DYSLEXIA_READING, normalizeReading, readingColors, readingInk} from '../../../../functions/src/utils/reading';
import type {ReadingPreference} from '../../../../functions/src/utils/reading';
import {requiredElement} from '../../shared/dom';
import '../../styles/reading.css';

export function createReadingEditor(root: HTMLElement, update: (reading: ReadingPreference) => void) {
  root.innerHTML = `
    <button id="reading-preset" class="button button-secondary" type="button">Dyslexia-friendly preset</button>
    <p class="field-hint">OpenDyslexic, warm cream text and gentle spacing. Choose what feels easiest for you to read.</p>
    <div class="editor-columns">
      <label>Font<select id="reading-font"><option value="system">System font</option><option value="opendyslexic">OpenDyslexic</option></select></label>
      <label>Reading colors<select id="reading-colors"><option value="theme">Follow theme</option><option value="warm">Warm cream on charcoal</option><option value="contrast">White on black</option></select></label>
      <label>Text weight<select id="reading-weight"><option value="standard">Standard (headings stay bold)</option><option value="bold">Bold</option></select></label>
      <label>Letter spacing<select id="reading-spacing"><option value="standard">Standard</option><option value="relaxed">Gentle spacing</option></select></label>
    </div>
    <label><input id="reading-custom" type="checkbox"/> Custom text color</label>
    <label for="reading-ink">Preferred text color</label><input id="reading-ink" type="color"/>
    <p class="field-hint">Colors below 4.5:1 contrast use readable fallback ink on the TV. Reading color modes use opaque surfaces and take priority over widget surface colors. TV text sizes stay unchanged; smaller widgets show a short preview. Open details to read the full content.</p>
    <div id="reading-sample" class="reading-sample"><strong>Weather, plans and tasks</strong><p>Today at 10:30 · Dinner at 6:00</p><p id="reading-color-status" role="status"></p></div>
    <button id="reading-reset" class="button button-text" type="button">Reset reading settings</button>`;
  const get = <T extends HTMLElement>(id: string) => requiredElement<T>(root, id);
  const font = get<HTMLSelectElement>('#reading-font'), colors = get<HTMLSelectElement>('#reading-colors');
  const weight = get<HTMLSelectElement>('#reading-weight'), spacing = get<HTMLSelectElement>('#reading-spacing');
  const custom = get<HTMLInputElement>('#reading-custom'), ink = get<HTMLInputElement>('#reading-ink');
  let current = normalizeReading(null);
  const commit = () => update({...current, font: font.value as ReadingPreference['font'], colors: colors.value as ReadingPreference['colors'],
    weight: weight.value as ReadingPreference['weight'], spacing: spacing.value as ReadingPreference['spacing'], textColor: custom.checked ? ink.value : null});
  for (const control of [font, colors, weight, spacing, custom]) control.addEventListener('change', commit);
  ink.addEventListener('input', commit);
  get('#reading-preset').addEventListener('click', () => update({...DYSLEXIA_READING}));
  get('#reading-reset').addEventListener('click', () => update({...DEFAULT_READING}));
  return {render(value: unknown, busy: boolean) {
    current = normalizeReading(value);
    font.value = current.font; colors.value = current.colors; weight.value = current.weight; spacing.value = current.spacing;
    custom.checked = Boolean(current.textColor); ink.value = current.textColor || '#FFF1D6';
    for (const control of [font, colors, weight, spacing, custom]) control.disabled = busy;
    ink.disabled = busy || !custom.checked;
    for (const button of root.querySelectorAll<HTMLButtonElement>('button')) button.disabled = busy;
    const sample = get('#reading-sample'), scheme = readingColors(current), surface = scheme?.focused || '#334155';
    const display = readingInk(current.textColor, surface, scheme?.primary || '#F8FAFC');
    sample.style.background = surface; sample.style.color = display;
    sample.style.fontFamily = current.font === 'opendyslexic' ? 'OpenDyslexic, sans-serif' : 'system-ui, sans-serif';
    sample.style.fontWeight = current.weight === 'bold' ? '700' : '400';
    sample.style.letterSpacing = current.spacing === 'relaxed' ? '.02em' : 'normal';
    get('#reading-color-status').textContent = current.textColor && display !== current.textColor
      ? 'This color needs fallback ink on the sample surface.' : 'Preview of TV text · font sizes vary with widget size.';
  }};
}
