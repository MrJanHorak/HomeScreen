import { DASHBOARD_CARD_IDS } from '../../../../../functions/src/utils/dashboardLayout';
import type { DashboardCardId } from '../../../../../functions/src/utils/dashboardLayout';
import type { CardStyle, CardStyles } from '../../../../../functions/src/utils/cardStyle';

const labels = {weather: 'Weather', schedule: 'Schedule', activity: 'Activity', media: 'Continue watching', meal: 'Meals', todo: 'Tasks'};
export function createCardStyleEditor(root: HTMLElement, onChange: (id: DashboardCardId, style: CardStyle | null) => void) {
  function render(styles: CardStyles, busy: boolean, defaultColor: string) {
    root.replaceChildren();
    for (const id of DASHBOARD_CARD_IDS) {
      const custom = styles[id];
      const row = document.createElement('fieldset'); row.className = 'card-surface-controls'; row.disabled = busy;
      const legend = document.createElement('legend'); legend.textContent = labels[id];
      const themeLabel = document.createElement('label'); themeLabel.className = 'visibility';
      const useTheme = document.createElement('input'); useTheme.type = 'checkbox'; useTheme.checked = !custom || custom.useThemeSurface === true;
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
      const borderLabel = document.createElement('label'); borderLabel.textContent = 'Border thickness';
      const border = document.createElement('input'); border.type = 'range'; border.min = '0'; border.max = '4'; border.step = '0.5';
      border.value = String(custom?.borderWidth ?? 1.5);
      border.setAttribute('aria-label', `${labels[id]} border thickness`);
      const borderOutput = document.createElement('output'); borderOutput.textContent = Number(border.value) ? `${border.value}px` : 'None';
      const radiusLabel = document.createElement('label'); radiusLabel.textContent = 'Corner radius';
      const radius = document.createElement('input'); radius.type = 'range'; radius.min = '0'; radius.max = '32'; radius.step = '2';
      radius.value = String(custom?.borderRadius ?? 20);
      radius.setAttribute('aria-label', `${labels[id]} corner radius`);
      const radiusOutput = document.createElement('output'); radiusOutput.textContent = Number(radius.value) ? `${radius.value}px` : 'Square';
      const notify = () => {
        color.disabled = range.disabled = busy || useTheme.checked;
        border.disabled = radius.disabled = busy;
        output.textContent = `${range.value}%`;
        borderOutput.textContent = Number(border.value) ? `${border.value}px` : 'None';
        radiusOutput.textContent = Number(radius.value) ? `${radius.value}px` : 'Square';
        onChange(id, useTheme.checked && Number(border.value) === 1.5 && Number(radius.value) === 20 ? null :
          {backgroundColor: color.value.toUpperCase(), opacity: Number(range.value) / 100,
            useThemeSurface: useTheme.checked, borderWidth: Number(border.value), borderRadius: Number(radius.value)});
      };
      color.disabled = range.disabled = busy || useTheme.checked;
      border.disabled = radius.disabled = busy;
      useTheme.addEventListener('change', notify);
      color.addEventListener('input', notify); range.addEventListener('input', notify);
      border.addEventListener('input', notify); radius.addEventListener('input', notify);
      colorLabel.append(color); opacityLabel.append(range, output);
      borderLabel.append(border, borderOutput); radiusLabel.append(radius, radiusOutput);
      fields.append(colorLabel, opacityLabel, borderLabel, radiusLabel);
      row.append(legend, themeLabel, fields); root.append(row);
    }
  }
  return {render, clear() { root.replaceChildren(); }};
}
