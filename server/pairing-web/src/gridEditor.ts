import { validGrid } from '../../functions/src/utils/dashboardLayout';
import type { DashboardGridLayout, GridItem } from '../../functions/src/utils/dashboardLayout';

type Card = {id: GridItem['id']; visible: boolean};
const labels = {weather: 'Weather', schedule: 'Schedule', activity: 'Activity', media: 'Media', meal: 'Meals', todo: 'Tasks'};

export function createGridEditor(
  root: HTMLElement,
  update: (grid: DashboardGridLayout) => void,
  report: (text: string) => void,
) {
  let selected: GridItem['id'] | null = null;
  let cancelDrag: (() => void) | undefined;
  function render(grid: DashboardGridLayout | null, cards: Card[], busy: boolean) {
    cancelDrag?.();
    root.replaceChildren();
    root.hidden = !grid;
    if (!grid) return;
    const currentGrid = grid;
    if (!currentGrid.items.some((item) => item.id === selected)) selected = currentGrid.items[0]?.id ?? null;
    const hint = document.createElement('p');
    hint.className = 'field-hint';
    hint.textContent = 'Drag a card to move it; drag its corner to resize. Cards snap to the grid. Empty space is allowed. Select a card to use the position and size controls below.';
    const canvas = document.createElement('div');
    canvas.className = 'layout-canvas';
    canvas.setAttribute('aria-label', 'Dashboard layout canvas');
    const place = (element: HTMLElement, item: GridItem) => {
      element.style.gridColumn = `${item.x + 1} / span ${item.width}`;
      element.style.gridRow = `${item.y + 1} / span ${item.height}`;
    };
    function commit(item: GridItem): boolean {
      const next = {...currentGrid, items: currentGrid.items.map((old) => old.id === item.id ? item : {...old})};
      if (!validGrid(next, cards)) {
        report('That position overlaps another card or goes outside the dashboard. Make space first.');
        return false;
      }
      update(next);
      return true;
    }
    for (const item of currentGrid.items) {
      const tile = document.createElement('div');
      tile.className = 'canvas-tile';
      tile.dataset.cardId = item.id;
      tile.classList.toggle('selected', item.id === selected);
      place(tile, item);
      const move = document.createElement('button');
      move.type = 'button'; move.className = 'canvas-move'; move.disabled = busy;
      move.textContent = labels[item.id];
      move.setAttribute('aria-label', `Select or move ${labels[item.id]}`);
      move.setAttribute('aria-pressed', String(item.id === selected));
      move.addEventListener('click', (event) => {
        if (event.detail === 0) {
          selected = item.id; render(currentGrid, cards, busy);
          root.querySelector<HTMLButtonElement>(`[data-card-id="${item.id}"] .canvas-move`)?.focus();
        }
      });
      move.addEventListener('keydown', (event) => {
        const direction = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[event.key];
        if (!direction || busy) return;
        event.preventDefault(); selected = item.id;
        commit({...item, x: item.x + direction[0], y: item.y + direction[1]});
        root.querySelector<HTMLButtonElement>(`[data-card-id="${item.id}"] .canvas-move`)?.focus();
      });
      const resize = document.createElement('button');
      resize.type = 'button'; resize.className = 'canvas-resize'; resize.disabled = busy;
      resize.textContent = '↘'; resize.setAttribute('aria-label', `Resize ${labels[item.id]}`);
      resize.addEventListener('click', (event) => {
        if (event.detail === 0) {
          selected = item.id; render(currentGrid, cards, busy);
          root.querySelector<HTMLInputElement>('.grid-controls input')?.focus();
        }
      });
      for (const [handle, resizing] of [[move, false], [resize, true]] as const) {
        handle.addEventListener('pointerdown', (event) => {
          if (busy || cancelDrag || (event.pointerType === 'mouse' && event.button !== 0)) return;
          event.preventDefault();
          selected = item.id;
          canvas.querySelectorAll('.canvas-tile').forEach((node) => node.classList.toggle('selected', node === tile));
          const rect = canvas.getBoundingClientRect();
          const gap = parseFloat(getComputedStyle(canvas).columnGap) || 0;
          const pitchX = (rect.width + gap) / 12;
          const pitchY = (rect.height + gap) / 6;
          let candidate = {...item};
          const onMove = (nextEvent: PointerEvent) => {
            if (nextEvent.pointerId !== event.pointerId) return;
            const dx = Math.round((nextEvent.clientX - event.clientX) / pitchX);
            const dy = Math.round((nextEvent.clientY - event.clientY) / pitchY);
            candidate = resizing
              ? {...item, width: Math.max(3, Math.min(12 - item.x, item.width + dx)), height: Math.max(2, Math.min(6 - item.y, item.height + dy))}
              : {...item, x: Math.max(0, Math.min(12 - item.width, item.x + dx)), y: Math.max(0, Math.min(6 - item.height, item.y + dy))};
            const next = {...currentGrid, items: currentGrid.items.map((old) => old.id === item.id ? candidate : old)};
            place(tile, candidate);
            tile.classList.toggle('blocked', !validGrid(next, cards));
          };
          const cleanup = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
            cancelDrag = undefined;
          };
          const onEnd = (endEvent: PointerEvent) => {
            if (endEvent.pointerId !== event.pointerId) return;
            cleanup();
            if (endEvent.type === 'pointercancel') render(currentGrid, cards, busy);
            else if (!commit(candidate)) { render(currentGrid, cards, busy); report('Cards cannot overlap. Move or shrink the neighboring card first.'); }
          };
          cancelDrag = cleanup;
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onEnd);
          window.addEventListener('pointercancel', onEnd);
        });
      }
      tile.append(move, resize); canvas.append(tile);
    }
    const controls = document.createElement('fieldset');
    controls.className = 'grid-controls'; controls.disabled = busy;
    const active = currentGrid.items.find((item) => item.id === selected)!;
    const legend = document.createElement('legend'); legend.textContent = `${labels[active.id]} position and size`;
    controls.append(legend);
    for (const [key, label, min, max, offset] of [
      ['x', 'Column', 1, 13 - active.width, 1], ['y', 'Row', 1, 7 - active.height, 1],
      ['width', 'Width', 3, 12 - active.x, 0], ['height', 'Height', 2, 6 - active.y, 0],
    ] as const) {
      const field = document.createElement('label'); field.textContent = label;
      const input = document.createElement('input'); input.type = 'number';
      input.min = String(min); input.max = String(max); input.step = '1'; input.value = String(active[key] + offset);
      input.setAttribute('aria-label', `${labels[active.id]} ${label.toLowerCase()}`);
      input.addEventListener('change', () => {
        if (!input.checkValidity() || !Number.isInteger(input.valueAsNumber)) {
          input.value = String(active[key] + offset); report(`Choose a whole number from ${min} to ${max}.`); return;
        }
        if (!commit({...active, [key]: input.valueAsNumber - offset})) input.value = String(active[key] + offset);
      });
      field.append(input); controls.append(field);
    }
    root.append(hint, canvas, controls);
  }
  return {render, clear() { cancelDrag?.(); selected = null; root.replaceChildren(); }};
}
