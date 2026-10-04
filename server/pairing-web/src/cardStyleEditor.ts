import { DASHBOARD_CARD_IDS } from '../../functions/src/utils/dashboardLayout';
import type { DashboardCardId } from '../../functions/src/utils/dashboardLayout';
import type { CardStyle, CardStyles } from '../../functions/src/utils/cardStyle';

const labels = {weather: 'Weather', schedule: 'Schedule', activity: 'Activity', media: 'Continue watching', meal: 'Meals', todo: 'Tasks'};
export function createCardStyleEditor(root: HTMLElement, onChange: (id: DashboardCardId, style: CardStyle | null) => void) {
  function render(styles: CardStyles, busy: boolean, defaultColor: string) {
    root.replaceChildren();
    for (const id of DASHBOARD_CARD_IDS) {
      const custom = styles[id];
      const row = document.createElement('fieldset'); row.className = 'card-surface-controls'; row.disabled = busy;
      const legend = document.createElement('legend'); legend.textContent = labels[id];
      const themeLabel = document.createElement('label'); themeLabel.className = 'visibility';
      const useTheme = document.createElement('input'); useTheme.type = 'checkbox'; useTheme.checked = !custom;
      useTheme.setAttribute('aria-label', `${labels[id]} use theme surface`);
      themeLabel.append(useTheme, document.createTextNode('Use theme surface'));
      const fields = document.createElement('div'); fields.className = 'surface-fields';
      const colorLabel = document.createElement('label'); colorLabel.textContent = 'Background color';
      const color = document.createElement('input'); color.type = 'color'; color.value = custom?.backgroundColor || defaultColor;
      color.setAttribute('aria-label', `${labels[id]} card background color`);
      const opacityLabel = document.createElement('label'); opacityLabel.textContent = 'Background opacity';
      const range = document.createElement('input'); range.type = 'range'; range.min = '0'; range.max = '100'; range.step = '1';
      range.value = String(Math.round((custom?.opacity ?? 0.88) * 100));
      range.setAttribute('aria-label', `${labels[id]} card opacity`);
      const output = document.createElement('output'); output.textContent = `${range.value}%`;
      const notify = () => {
        color.disabled = range.disabled = busy || useTheme.checked;
        output.textContent = `${range.value}%`;
        onChange(id, useTheme.checked ? null : {backgroundColor: color.value.toUpperCase(), opacity: Number(range.value) / 100});
      };
      color.disabled = range.disabled = busy || useTheme.checked;
      useTheme.addEventListener('change', notify);
      color.addEventListener('input', notify); range.addEventListener('input', notify);
      colorLabel.append(color); opacityLabel.append(range, output); fields.append(colorLabel, opacityLabel);
      row.append(legend, themeLabel, fields); root.append(row);
    }
  }
  return {render, clear() { root.replaceChildren(); }};
}
