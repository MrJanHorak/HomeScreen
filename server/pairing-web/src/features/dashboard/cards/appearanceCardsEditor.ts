import {CARD_LABELS} from '../appearanceModel';
import type {Card, CardId} from '../appearanceModel';
import {requiredElement} from '../../../shared/dom';

interface CardActions {
  visibility: (id: CardId, visible: boolean) => void;
  size: (id: CardId, size: Card['size']) => void;
  move: (id: CardId, destination: number) => void;
  reorder: (cards: Card[]) => void;
}

export interface AppearanceCardsEditor {
  render: (cards: Card[], gridMode: boolean, busy: boolean) => void;
  clear: () => void;
}

/** Render card controls; the coordinator validates and applies their changes. */
export function createAppearanceCardsEditor(list: HTMLElement, actions: CardActions): AppearanceCardsEditor {
  let cancelDrag: (() => void) | undefined;

  function clear() {
    cancelDrag?.();
    list.replaceChildren();
  }

  function startDrag(event: PointerEvent, row: HTMLElement, card: Card, cards: Card[]) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    cancelDrag?.();
    row.classList.add('dragging');
    // Keep the draft unchanged until a completed drop. Cancellation discards this order.
    const reordered = [...cards];

    function onMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== event.pointerId) return;
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLElement>('.card-editor-row');
      if (!target || target === row || !list.contains(target)) return;
      const from = reordered.findIndex((item) => item.id === card.id);
      const destination = reordered.findIndex((item) => item.id === target.dataset.cardId);
      if (destination < 0 || from === destination) return;
      reordered.splice(from, 1);
      reordered.splice(destination, 0, card);
      list.insertBefore(row, from < destination ? target.nextSibling : target);
    }

    function cleanup() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      row.classList.remove('dragging');
      cancelDrag = undefined;
    }

    function onEnd(endEvent: PointerEvent) {
      if (endEvent.pointerId !== event.pointerId) return;
      cleanup();
      const unchanged = reordered.every((item, index) => item.id === cards[index].id);
      if (endEvent.type === 'pointercancel' || unchanged) render(cards, false, false);
      else actions.reorder(reordered);
    }

    cancelDrag = cleanup;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  }

  function cardRow(card: Card, index: number, cards: Card[], gridMode: boolean, busy: boolean): HTMLElement {
    const row = document.createElement('div');
    row.className = 'card-editor-row';
    row.classList.toggle('grid-mode', gridMode);
    row.dataset.cardId = card.id;
    row.innerHTML = `<button class="drag-handle" type="button" aria-label="Drag ${CARD_LABELS[card.id]} to reorder">⠿</button>
      <strong>${CARD_LABELS[card.id]}</strong><label class="visibility"><input type="checkbox" ${card.visible ? 'checked' : ''} /> Show</label>
      <select aria-label="${CARD_LABELS[card.id]} width"><option value="standard">Normal</option><option value="wide">Wide</option></select>
      <div class="move-buttons"><button type="button" aria-label="Move ${CARD_LABELS[card.id]} up">↑</button><button type="button" aria-label="Move ${CARD_LABELS[card.id]} down">↓</button></div>`;
    const visibility = requiredElement<HTMLInputElement>(row, 'input');
    const size = requiredElement<HTMLSelectElement>(row, 'select');
    const handle = requiredElement<HTMLButtonElement>(row, '.drag-handle');
    const buttons = row.querySelectorAll<HTMLButtonElement>('.move-buttons button');
    size.value = card.size;
    size.disabled = handle.disabled = busy || gridMode;
    visibility.disabled = busy;
    buttons[0].disabled = busy || gridMode || index === 0;
    buttons[1].disabled = busy || gridMode || index === cards.length - 1;
    visibility.addEventListener('change', () => actions.visibility(card.id, visibility.checked));
    size.addEventListener('change', () => actions.size(card.id, size.value as Card['size']));
    buttons[0].addEventListener('click', () => actions.move(card.id, index - 1));
    buttons[1].addEventListener('click', () => actions.move(card.id, index + 1));
    handle.addEventListener('pointerdown', (event) => {
      if (!busy && !gridMode) startDrag(event, row, card, cards);
    });
    return row;
  }

  function render(cards: Card[], gridMode: boolean, busy: boolean) {
    clear();
    cards.forEach((card, index) => list.append(cardRow(card, index, cards, gridMode, busy)));
  }

  return {render, clear};
}
