import {cardInk, cardSurface} from '../../../../../functions/src/utils/cardStyle';
import {CARD_LABELS, PALETTE_COLORS} from '../appearanceModel';
import type {Appearance, Card, CardId} from '../appearanceModel';
import {requiredElement} from '../../../shared/dom';
import {normalizeReading, readingColors, readingInk} from '../../../../../functions/src/utils/reading';

export interface AppearancePreview {
  render: (appearance: Appearance, savedPhoto: string | null) => void;
  updateStyles: (appearance: Appearance, savedPhoto: string | null) => void;
  clear: () => void;
}

function previewRow(cards: Card[]): HTMLElement {
  const row = document.createElement('div');
  row.className = 'tv-preview-row';
  for (const card of cards) {
    const tile = document.createElement('div');
    tile.className = 'tv-preview-tile';
    tile.dataset.cardId = card.id;
    tile.style.flex = card.size === 'wide' ? '2' : '1';
    tile.textContent = CARD_LABELS[card.id];
    row.append(tile);
  }
  return row;
}

/** Style both preview modes without owning editor state or network requests. */
export function createAppearancePreview(root: HTMLElement): AppearancePreview {
  const preview = requiredElement(root, '#tv-preview');
  const gridRoot = requiredElement(root, '#grid-editor');

  function updateStyles(appearance: Appearance, savedPhoto: string | null) {
    const colors = PALETTE_COLORS[appearance.palette];
    const reading = normalizeReading(appearance.reading), scheme = readingColors(reading);
    const backdrop = scheme?.background || (appearance.background === 'solid' ? appearance.backgroundColor : colors.background);
    const accent = scheme?.accent || (appearance.palette === 'custom' ? appearance.customAccent : colors.accent);
    const photo = appearance.background === 'google-photo' && savedPhoto
      ? `linear-gradient(rgba(15,23,42,.45),rgba(15,23,42,.45)),url("${savedPhoto}")` : '';
    const canvas = root.querySelector<HTMLElement>('.layout-canvas');
    for (const panel of [preview, gridRoot, canvas]) {
      if (!panel) continue;
      panel.style.setProperty('--preview-background', backdrop);
      panel.style.setProperty('--preview-accent', accent);
      panel.style.setProperty('--preview-photo', photo);
      panel.style.setProperty('--photo-zoom', String(appearance.backgroundZoom));
    }
    root.querySelectorAll<HTMLElement>('.canvas-tile, .tv-preview-tile').forEach((tile) => {
      const style = appearance.cardStyles[tile.dataset.cardId as CardId];
      const ink = style && !style.useThemeSurface && !scheme ? cardInk(style, colors.background, accent, reading.textColor) : null;
      tile.style.backgroundColor = scheme?.surface || (style && !style.useThemeSurface ? cardSurface(style) : '');
      tile.style.borderWidth = style ? `${style.borderWidth ?? 1.5}px` : '';
      tile.style.borderRadius = style ? `${style.borderRadius ?? 20}px` : '';
      const color = ink?.primary || readingInk(reading.textColor, scheme?.focused || '#334155', scheme?.primary || '#FFFFFF');
      tile.style.setProperty('--card-ink', color);
      tile.style.color = color;
      tile.style.fontFamily = reading.font === 'opendyslexic' ? 'OpenDyslexic, sans-serif' : '';
      tile.style.letterSpacing = reading.spacing === 'relaxed' ? '.02em' : '';
    });
  }

  function clear() {
    preview.replaceChildren();
  }

  function render(appearance: Appearance, savedPhoto: string | null) {
    clear();
    preview.hidden = Boolean(appearance.grid);
    const visible = appearance.cards.filter((card) => card.visible);
    const split = Math.ceil(visible.length / 2);
    for (const cards of [visible.slice(0, split), visible.slice(split)]) {
      if (cards.length) preview.append(previewRow(cards));
    }
    updateStyles(appearance, savedPhoto);
  }

  return {render, updateStyles, clear};
}
