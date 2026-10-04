import { swapGridItems, validGrid } from '../../functions/src/utils/dashboardLayout';
import type { DashboardGridLayout, GridItem } from '../../functions/src/utils/dashboardLayout';

type Card = {id: GridItem['id']; visible: boolean};
const labels = {weather: 'Weather', schedule: 'Schedule', activity: 'Activity', media: 'Media', meal: 'Meals', todo: 'Tasks'};

export function createGridEditor(
  root: HTMLElement,
  update: (grid: DashboardGridLayout) => void,
  report: (text: string) => void,
  controlsRoot: HTMLElement,
) {
  let selected: GridItem['id'] | null = null;
  let cancelDrag: (() => void) | undefined;
  function render(grid: DashboardGridLayout | null, cards: Card[], busy: boolean) {
    cancelDrag?.();
    root.replaceChildren();
    root.hidden = !grid;
    controlsRoot.replaceChildren();
    controlsRoot.hidden = !grid;
    if (!grid) return;
    const currentGrid = grid;
    if (!currentGrid.items.some((item) => item.id === selected)) selected = currentGrid.items[0]?.id ?? null;
    const hint = document.createElement('p');
    hint.className = 'field-hint';
    hint.textContent = 'Drag a card onto another to swap their places, even when they have different sizes. Drag a corner to resize. Select a card for precise position and size controls.';
    const canvas = document.createElement('div');
    canvas.className = 'layout-canvas';
    canvas.setAttribute('aria-label', 'Dashboard layout canvas');
    const place = (element: HTMLElement, item: GridItem) => {
      element.style.gridColumn = `${item.x + 1} / span ${item.width}`;
      element.style.gridRow = `${item.y + 1} / span ${item.height}`;
    };
    function commit(item: GridItem, swapWith?: GridItem['id']): boolean {
      if (swapWith) {
        update(swapGridItems(currentGrid, item.id, swapWith));
        return true;
      }
      const next = {...currentGrid, items: currentGrid.items.map((old) => old.id === item.id ? item : {...old})};
      if (!validGrid(next, cards)) {
        report('That position overlaps another card or goes outside the dashboard. Drop directly on a card to swap places.');
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
        const candidate = {...item, x: item.x + direction[0], y: item.y + direction[1]};
        const next = {...currentGrid, items: currentGrid.items.map((old) => old.id === item.id ? candidate : old)};
        const targets = currentGrid.items.filter((other) => other.id !== item.id &&
          candidate.x < other.x + other.width && candidate.x + candidate.width > other.x &&
          candidate.y < other.y + other.height && candidate.y + candidate.height > other.y);
        commit(candidate, !validGrid(next, cards) && targets.length === 1 ? targets[0].id : undefined);
        root.querySelector<HTMLButtonElement>(`[data-card-id="${item.id}"] .canvas-move`)?.focus();
      });
      const resize = document.createElement('button');
      resize.type = 'button'; resize.className = 'canvas-resize'; resize.disabled = busy;
      resize.textContent = '↘'; resize.setAttribute('aria-label', `Resize ${labels[item.id]}`);
      resize.addEventListener('click', (event) => {
        if (event.detail === 0) {
          selected = item.id; render(currentGrid, cards, busy);
          controlsRoot.querySelector<HTMLInputElement>('.grid-controls input')?.focus();
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
          let swapWith: GridItem['id'] | undefined;
          const onMove = (nextEvent: PointerEvent) => {
            if (nextEvent.pointerId !== event.pointerId) return;
            const dx = Math.round((nextEvent.clientX - event.clientX) / pitchX);
            const dy = Math.round((nextEvent.clientY - event.clientY) / pitchY);
            candidate = resizing
              ? {...item, width: Math.max(3, Math.min(12 - item.x, item.width + dx)), height: Math.max(2, Math.min(6 - item.y, item.height + dy))}
              : {...item, x: Math.max(0, Math.min(12 - item.width, item.x + dx)), y: Math.max(0, Math.min(6 - item.height, item.y + dy))};
            swapWith = undefined;
            if (!resizing) {
              const cellX = Math.floor((nextEvent.clientX - rect.left) / pitchX);
              const cellY = Math.floor((nextEvent.clientY - rect.top) / pitchY);
              swapWith = currentGrid.items.find((other) => other.id !== item.id &&
                cellX >= other.x && cellX < other.x + other.width &&
                cellY >= other.y && cellY < other.y + other.height)?.id;
            }
            const next = {...currentGrid, items: currentGrid.items.map((old) => old.id === item.id ? candidate : old)};
            place(tile, candidate);
            tile.classList.toggle('blocked', !swapWith && !validGrid(next, cards));
            canvas.querySelectorAll<HTMLElement>('.canvas-tile').forEach((node) =>
              node.classList.toggle('swap-target', node.dataset.cardId === swapWith));
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
            else if (!swapWith && candidate.x === item.x && candidate.y === item.y &&
              candidate.width === item.width && candidate.height === item.height) render(currentGrid, cards, busy);
            else if (!commit(candidate, swapWith)) {
              render(currentGrid, cards, busy);
              report('Cards cannot overlap. Drop directly on a card to swap places.');
            }
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
    root.append(hint, canvas);
    controlsRoot.append(controls);
  }
  return {render, clear() { cancelDrag?.(); selected = null; root.replaceChildren(); controlsRoot.replaceChildren(); }};
}
