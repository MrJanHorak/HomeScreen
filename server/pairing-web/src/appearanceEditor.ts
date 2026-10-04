import { findGridSpace, gridFromCards, validGrid } from '../../functions/src/utils/dashboardLayout';
import type { DashboardGridLayout } from '../../functions/src/utils/dashboardLayout';
import { createGridEditor } from './gridEditor';
import { cardInk, cardSurface, validCardStyles } from '../../functions/src/utils/cardStyle';
import type { CardStyles } from '../../functions/src/utils/cardStyle';
import { createCardStyleEditor } from './cardStyleEditor';
import { createPhotoGallery } from './photoGallery';
import {createAmbientEditor, normalizeAmbient} from './ambientEditor';
import type {Ambient} from './ambientEditor';
import { DEFAULT_PHOTO_ZOOM, normalizePhotoZoom } from '../../functions/src/utils/photoFraming';
import type { AppearanceLibrary, PublishedRevision } from '../../functions/src/utils/appearanceLibrary';
import { emptyLibrary } from '../../functions/src/utils/appearanceLibrary';
type CardId = 'weather' | 'schedule' | 'activity' | 'media' | 'meal' | 'todo';
type Card = { id: CardId; visible: boolean; size: 'standard' | 'wide' };
type Appearance = {
  layout: 'balanced' | 'agenda' | 'wellness' | 'calm' | 'custom';
  palette: 'night' | 'forest' | 'plum' | 'contrast' | 'custom';
  customAccent: string;
  background: 'photo' | 'solid' | 'google-photo';
  backgroundColor: string;
  backgroundZoom: number;
  cards: Card[];
  ambient?: Ambient;
  grid: DashboardGridLayout | null;
  cardStyles: CardStyles;
};

const labels: Record<CardId, string> = {
  weather: 'Weather', schedule: 'Schedule', activity: 'Activity',
  media: 'Continue watching', meal: 'Meals', todo: 'Tasks',
};
const order: CardId[] = ['weather', 'schedule', 'activity', 'media', 'meal', 'todo'];
const presets: Record<Exclude<Appearance['layout'], 'custom'>, Card[]> = {
  balanced: [
    ['weather', 'standard'], ['schedule', 'wide'], ['activity', 'standard'],
    ['media', 'standard'], ['meal', 'standard'], ['todo', 'standard'],
  ].map(([id, size]) => ({id: id as CardId, size: size as Card['size'], visible: true})),
  agenda: [
    {id: 'schedule', visible: true, size: 'wide'}, {id: 'todo', visible: true, size: 'wide'},
    {id: 'weather', visible: true, size: 'standard'}, {id: 'activity', visible: true, size: 'standard'},
    {id: 'meal', visible: true, size: 'standard'}, {id: 'media', visible: false, size: 'standard'},
  ],
  wellness: [
    {id: 'activity', visible: true, size: 'wide'}, {id: 'weather', visible: true, size: 'wide'},
    {id: 'schedule', visible: true, size: 'standard'}, {id: 'todo', visible: true, size: 'standard'},
    {id: 'meal', visible: true, size: 'standard'}, {id: 'media', visible: false, size: 'standard'},
  ],
  calm: [
    {id: 'weather', visible: true, size: 'standard'}, {id: 'schedule', visible: true, size: 'wide'},
    {id: 'activity', visible: true, size: 'standard'}, {id: 'todo', visible: true, size: 'wide'},
    {id: 'meal', visible: false, size: 'standard'}, {id: 'media', visible: false, size: 'standard'},
  ],
};
const defaults: Appearance = {
  layout: 'balanced', palette: 'night', customAccent: '#38BDF8',
  background: 'photo', backgroundColor: '#0F172A', backgroundZoom: DEFAULT_PHOTO_ZOOM, cards: presets.balanced, grid: null, cardStyles: {},
};
const paletteColors: Record<Appearance['palette'], {background: string; accent: string}> = {
  night: {background: '#0F172A', accent: '#38BDF8'},
  forest: {background: '#0C1E1A', accent: '#86E3BB'},
  plum: {background: '#20152E', accent: '#E3B5FF'},
  contrast: {background: '#050505', accent: '#FDE047'},
  custom: {background: '#0F172A', accent: '#38BDF8'},
};

function copyCards(cards: Card[]): Card[] { return cards.map((card) => ({...card})); }

function normalize(value: unknown): Appearance {
  if (!value || typeof value !== 'object') return {...defaults, cards: copyCards(defaults.cards)};
  const raw = value as Partial<Appearance>;
  const cards = Array.isArray(raw.cards) ? raw.cards.filter((card) =>
    card && order.includes(card.id) && typeof card.visible === 'boolean' &&
    (card.size === 'wide' || card.size === 'standard')) : [];
  const unique = cards.filter((card, index) => cards.findIndex((other) => other.id === card.id) === index);
  for (const id of order) if (!unique.some((card) => card.id === id)) unique.push({id, visible: true, size: 'standard'});
  if (!unique.some((card) => card.visible)) unique[0].visible = true;
  return {
    ...defaults, ...raw,
    layout: raw.layout && ['balanced', 'agenda', 'wellness', 'calm', 'custom'].includes(raw.layout) ? raw.layout : 'balanced',
    palette: raw.palette && ['night', 'forest', 'plum', 'contrast', 'custom'].includes(raw.palette) ? raw.palette : 'night',
    customAccent: /^#[0-9a-fA-F]{6}$/.test(raw.customAccent || '') ? raw.customAccent! : defaults.customAccent,
    backgroundColor: /^#[0-9a-fA-F]{6}$/.test(raw.backgroundColor || '') ? raw.backgroundColor! : defaults.backgroundColor,
    background: raw.background === 'solid' || raw.background === 'google-photo' ? raw.background : 'photo',
    backgroundZoom: normalizePhotoZoom(raw.backgroundZoom),
    cards: copyCards(unique),
    grid: validGrid(raw.grid, unique) ? raw.grid : null,
    cardStyles: validCardStyles(raw.cardStyles) ? raw.cardStyles : {},
    ambient: raw.ambient ? normalizeAmbient(raw.ambient) : undefined,
  };
}

export function createAppearanceEditor(
  root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>,
) {
  let appearance = normalize(null);
  let savedJson = '';
  let loaded = false;
  let busy = false;
  let generation = 0;
  let revision = 0;
  let publishedRevision = 0;
  let savedPhoto: string | null = null;
  let library: AppearanceLibrary = emptyLibrary();
  let history: PublishedRevision[] = [];
  let observedJson = '';
  let draftJson = 'null';
  let undo: string[] = [];
  let redo: string[] = [];
  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  let draftError = '';
  root.innerHTML = `
    <p class="field-label">DASHBOARD STUDIO</p>
    <h2>Make the TV yours</h2>
    <p class="meal-copy">Arrange the cards and choose a look here. Drafts save to your account; Save to TV publishes them within about a minute.</p>
    <div id="appearance-content" hidden>
      <div class="studio-workspace">
        <div class="studio-preview">
          <div class="studio-preview-heading"><span class="field-label">TV PREVIEW</span><span>Updates as you edit</span></div>
          <div id="grid-editor"></div>
          <div id="tv-preview" class="tv-preview" aria-label="Approximate dashboard layout preview"></div>
        </div>
        <div class="studio-controls">
          <details class="studio-section" open><summary>1 · Layout and cards</summary><div class="studio-section-body">
            <label class="field-label" for="layout-select">STARTING LAYOUT</label>
            <select id="layout-select"><option value="balanced">Balanced</option><option value="agenda">Agenda</option><option value="wellness">Wellness</option><option value="calm">Calm</option><option value="custom">Custom</option></select>
            <label class="field-label" for="layout-mode">ARRANGEMENT</label>
            <select id="layout-mode"><option value="rows">Automatic rows</option><option value="grid">Free layout</option></select>
            <p id="cards-hint" class="field-hint">Drag to reorder, or use the arrow buttons. Wide cards take twice the row space.</p>
            <div id="card-list" class="card-list"></div>
            <div id="grid-position-controls"></div>
          </div></details>
          <details class="studio-section"><summary>2 · Colors and background</summary><div class="studio-section-body">
            <div class="editor-columns">
              <div><label class="field-label" for="palette-select">COLOR SCHEME</label>
                <select id="palette-select"><option value="night">Night Sky</option><option value="forest">Forest</option><option value="plum">Plum</option><option value="contrast">High Contrast</option><option value="custom">Custom accent</option></select></div>
              <div><label class="field-label" for="accent-color">ACCENT COLOR</label><input id="accent-color" type="color" aria-label="Accent color" /></div>
            </div>
            <div class="editor-columns">
              <div><label class="field-label" for="background-select">BACKGROUND</label>
                <select id="background-select"><option value="photo">Built-in photo</option><option value="solid">Solid color</option><option value="google-photo">Selected Google photo</option></select></div>
              <div><label class="field-label" for="background-color">SOLID COLOR</label><input id="background-color" type="color" aria-label="Solid background color" /></div>
            </div>
            <label class="field-label" for="background-zoom">PHOTO ZOOM <output id="background-zoom-value"></output></label>
            <input id="background-zoom" type="range" min="100" max="150" step="1" aria-label="Background photo zoom" />
            <p class="field-hint">Zoom in to crop a saved photo. 100% keeps the full screen fit.</p>
          </div></details>
          <details class="studio-section"><summary>3 · Card style</summary><div class="studio-section-body">
            <p class="field-hint">Set each card's surface, border thickness, and corner radius. Zero removes the border or rounds.</p>
            <div id="card-style-editor"></div>
          </div></details>
          <details class="studio-section"><summary>4 · Ambient mode</summary><div class="studio-section-body" id="ambient-editor"></div></details>
        </div>
      </div>
      <div class="draft-actions"><button id="appearance-undo" class="button button-text" type="button">Undo</button><button id="appearance-redo" class="button button-text" type="button">Redo</button><button id="draft-save" class="button button-secondary" type="button">Save draft</button></div>
      <div class="editor-actions"><button id="appearance-save" class="button button-primary" type="button">Save to TV <span aria-hidden="true">↗</span></button><button id="appearance-reload" class="button button-text" type="button">Discard changes</button></div>
      <p id="draft-status" class="field-hint" role="status" aria-live="polite"></p>
      <details class="studio-section"><summary>Saved designs and published history</summary><div class="studio-section-body">
        <label class="field-label" for="design-name">DESIGN NAME</label>
        <input id="design-name" type="text" maxlength="60" placeholder="Evening dashboard" />
        <button id="design-save" class="button button-secondary" type="button">Save as new design</button>
        <button id="library-refresh" class="button button-text" type="button">Refresh designs and history</button>
        <p class="field-hint">Keep up to 20 designs. Loading a design or restoring a revision edits your draft; use Save to TV to publish it.</p>
        <div id="design-list" class="design-library"></div>
        <h3>Published history</h3><p class="field-hint">The latest 30 revisions, including TV settings changes.</p>
        <div id="revision-list" class="design-library"></div>
      </div></details>
      <details class="studio-section studio-photos"><summary>Photos · choose images for your TV</summary><div class="studio-section-body"><div id="photo-gallery"></div></div></details>
    </div>
    <p id="appearance-status" class="status" role="status" aria-live="polite">Sign in to edit your dashboard.</p>
  `;
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const content = $('#appearance-content');
  const status = $('#appearance-status');
  const layout = $<HTMLSelectElement>('#layout-select');
  const mode = $<HTMLSelectElement>('#layout-mode');
  const palette = $<HTMLSelectElement>('#palette-select');
  const accent = $<HTMLInputElement>('#accent-color');
  const background = $<HTMLSelectElement>('#background-select');
  const backgroundColor = $<HTMLInputElement>('#background-color');
  const backgroundZoom = $<HTMLInputElement>('#background-zoom');
  const list = $('#card-list');
  const preview = $('#tv-preview');
  const save = $<HTMLButtonElement>('#appearance-save');
  const reload = $<HTMLButtonElement>('#appearance-reload');
  const undoButton = $<HTMLButtonElement>('#appearance-undo');
  const redoButton = $<HTMLButtonElement>('#appearance-redo');
  const draftSave = $<HTMLButtonElement>('#draft-save');
  const designSave = $<HTMLButtonElement>('#design-save');
  const designName = $<HTMLInputElement>('#design-name');
  const libraryRefresh = $<HTMLButtonElement>('#library-refresh');
  const gridEditor = createGridEditor($('#grid-editor'), (grid) => {
    appearance.grid = grid; appearance.layout = 'custom'; render();
  }, (text) => message(text, 'error'), $('#grid-position-controls'));
  const surfaces = createCardStyleEditor($('#card-style-editor'), (id, style) => {
    appearance.cardStyles = {...appearance.cardStyles};
    if (style) appearance.cardStyles[id] = style;
    else delete appearance.cardStyles[id];
    updatePreview(); updateActions();
  });
  const photos = createPhotoGallery($('#photo-gallery'), apiUrl, getToken, (dataUrl) => {
    savedPhoto = dataUrl; updatePreview();
  }, (purpose) => {
    if (purpose === 'background') appearance.background = 'google-photo';
    else appearance.ambient = {...normalizeAmbient(appearance.ambient), photoSource: 'selected'};
    render();
  });
  const ambientEditor = createAmbientEditor($('#ambient-editor'), (ambient) => { appearance.ambient = ambient; render(); });

  function message(text: string, kind: 'info' | 'error' | 'success' = 'info') {
    status.textContent = text;
    status.dataset.kind = kind;
  }
  function changed() { return JSON.stringify(appearance) !== savedJson; }
  function currentDraft() {
    return changed() ? {appearance, baseUpdatedAtMs: revision} : null;
  }
  function draftChanged() { return JSON.stringify(currentDraft()) !== draftJson; }
  function updateActions() {
    const next = JSON.stringify(appearance);
    if (loaded && next !== observedJson) {
      if (observedJson) undo = [...undo.slice(-99), observedJson];
      redo = []; observedJson = next; draftError = '';
    }
    clearTimeout(draftTimer);
    if (loaded && !busy && draftChanged() && !draftError) {
      draftTimer = setTimeout(() => void saveDraft(), 1500);
    }
    save.disabled = busy || !changed(); reload.disabled = busy;
    undoButton.disabled = busy || !undo.length; redoButton.disabled = busy || !redo.length;
    draftSave.disabled = busy || !draftChanged();
    designSave.disabled = busy || !designName.value.trim(); designName.disabled = busy;
    libraryRefresh.disabled = busy;
    $('#draft-status').textContent = draftError || (draftChanged() ? 'Draft has changes waiting to save.' :
      changed() ? 'Draft saved to your account. Your TV still shows the published design.' : 'No unpublished draft.');
    if (!busy) message(changed() ? 'Unpublished changes. Save to TV when ready.' : 'Your TV settings are up to date.');
  }
  function renderLibrary() {
    const designs = $('#design-list'); designs.replaceChildren();
    const revisions = $('#revision-list'); revisions.replaceChildren();
    function row(parent: HTMLElement, text: string, actions: [string, () => void][]) {
      const item = document.createElement('div'); item.className = 'design-library-row';
      const label = document.createElement('span'); label.textContent = text; item.append(label);
      for (const [title, action] of actions) {
        const button = document.createElement('button'); button.type = 'button';
        button.className = 'button button-text'; button.textContent = title; button.disabled = busy;
        button.addEventListener('click', action); item.append(button);
      }
      parent.append(item);
    }
    for (const design of library.designs) row(designs, design.name, [
      ['Load', () => { appearance = normalize(structuredClone(design.appearance)); render(); }],
      ['Replace', () => void changeLibrary({action: 'saveDesign', id: design.id, name: design.name, appearance}, 'Design replaced.')],
      ['Delete', () => void changeLibrary({action: 'deleteDesign', id: design.id}, 'Design deleted.')],
    ]);
    if (!library.designs.length) designs.textContent = 'No saved designs yet.';
    for (const entry of history) row(revisions,
      `${new Date(entry.updatedAtMs).toLocaleString()} · ${entry.source === 'previous' ? 'Previous settings' : entry.source === 'tv' ? 'TV' : 'Companion'}${entry.updatedAtMs === publishedRevision ? ' · Published' : ''}`,
      [['Restore to draft', () => { appearance = normalize(structuredClone(entry.appearance)); render(); }]]);
    if (!history.length) revisions.textContent = 'History starts with your next Save to TV or TV settings change.';
  }
  function updatePreview() {
    const colors = paletteColors[appearance.palette];
    const backdrop = appearance.background === 'solid' ? appearance.backgroundColor : colors.background;
    const accentColor = appearance.palette === 'custom' ? appearance.customAccent : colors.accent;
    const canvas = root.querySelector<HTMLElement>('.layout-canvas');
    for (const panel of [preview, canvas]) {
      if (!panel) continue;
      panel.style.setProperty('--preview-background', backdrop);
      panel.style.setProperty('--preview-accent', accentColor);
      panel.style.setProperty('--preview-photo', appearance.background === 'google-photo' && savedPhoto
        ? `linear-gradient(rgba(15,23,42,.45),rgba(15,23,42,.45)),url("${savedPhoto}")` : '');
      panel.style.setProperty('--photo-zoom', String(appearance.backgroundZoom));
    }
    root.querySelectorAll<HTMLElement>('.canvas-tile, .tv-preview-tile').forEach((tile) => {
      const style = appearance.cardStyles[tile.dataset.cardId as CardId];
      tile.style.backgroundColor = style && !style.useThemeSurface ? cardSurface(style) : '';
      tile.style.borderWidth = style ? `${style.borderWidth ?? 1.5}px` : '';
      tile.style.borderRadius = style ? `${style.borderRadius ?? 20}px` : '';
      const ink = style && !style.useThemeSurface ? cardInk(style, colors.background, accentColor) : null;
      tile.style.setProperty('--card-ink', ink?.primary || '#FFFFFF');
      tile.style.color = ink?.primary || '#FFFFFF';
    });
  }
  function render() {
    ambientEditor.render(normalizeAmbient(appearance.ambient), busy);
    content.hidden = !loaded;
    if (!loaded) return;
    layout.value = appearance.layout;
    mode.value = appearance.grid ? 'grid' : 'rows';
    mode.disabled = busy;
    gridEditor.render(appearance.grid, appearance.cards, busy);
    surfaces.render(appearance.cardStyles, busy, paletteColors[appearance.palette].background);
    $('#cards-hint').textContent = appearance.grid
      ? 'Show or hide cards here. New cards use available space; shrink or move a card if the canvas is full. Choose a starting layout to reset the arrangement.'
      : 'Drag to reorder, or use the arrow buttons. Wide cards take twice the row space.';
    palette.value = appearance.palette;
    accent.value = appearance.customAccent;
    background.value = appearance.background;
    backgroundColor.value = appearance.backgroundColor;
    backgroundZoom.value = String(Math.round(appearance.backgroundZoom * 100));
    $('#background-zoom-value').textContent = `${backgroundZoom.value}%`;
    backgroundZoom.disabled = busy || appearance.background === 'solid';
    for (const control of [layout, palette, accent, background]) control.disabled = busy;
    backgroundColor.disabled = busy || appearance.background !== 'solid';
    list.replaceChildren();
    for (const [index, card] of appearance.cards.entries()) {
      const row = document.createElement('div');
      row.className = 'card-editor-row';
      row.classList.toggle('grid-mode', Boolean(appearance.grid));
      row.dataset.cardId = card.id;
      row.innerHTML = `<button class="drag-handle" type="button" aria-label="Drag ${labels[card.id]} to reorder">⠿</button>
        <strong>${labels[card.id]}</strong><label class="visibility"><input type="checkbox" ${card.visible ? 'checked' : ''} /> Show</label>
        <select aria-label="${labels[card.id]} width"><option value="standard">Normal</option><option value="wide">Wide</option></select>
        <div class="move-buttons"><button type="button" aria-label="Move ${labels[card.id]} up" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" aria-label="Move ${labels[card.id]} down" ${index === appearance.cards.length - 1 ? 'disabled' : ''}>↓</button></div>`;
      row.querySelector<HTMLSelectElement>('select')!.value = card.size;
      row.querySelector<HTMLInputElement>('input')!.addEventListener('change', (event) => {
        const next = (event.target as HTMLInputElement).checked;
        if (!next && appearance.cards.filter((item) => item.visible).length === 1) {
          render(); message('Keep at least one card visible.', 'error'); return;
        }
        if (appearance.grid) {
          if (next) {
            const space = findGridSpace(appearance.grid, card.id);
            if (!space) { render(); message('There is no room for another card. Shrink or move a card first.', 'error'); return; }
            appearance.grid.items.push(space);
          } else appearance.grid.items = appearance.grid.items.filter((item) => item.id !== card.id);
        }
        card.visible = next; appearance.layout = 'custom'; render();
      });
      row.querySelector<HTMLSelectElement>('select')!.addEventListener('change', (event) => {
        card.size = (event.target as HTMLSelectElement).value as Card['size'];
        appearance.layout = 'custom'; render();
      });
      const buttons = row.querySelectorAll<HTMLButtonElement>('.move-buttons button');
      buttons.forEach((button, buttonIndex) => button.addEventListener('click', () => move(card.id, index + (buttonIndex ? 1 : -1))));
      const handle = row.querySelector<HTMLButtonElement>('.drag-handle')!;
      handle.addEventListener('pointerdown', (event) => {
        if (busy || appearance.grid) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
        row.classList.add('dragging');
        const onMove = (moveEvent: PointerEvent) => {
          if (moveEvent.pointerId !== event.pointerId) return;
          const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLElement>('.card-editor-row');
          if (target && target !== row && list.contains(target)) {
            const from = appearance.cards.findIndex((item) => item.id === card.id);
            const targetIndex = appearance.cards.findIndex((item) => item.id === target.dataset.cardId);
            if (targetIndex < 0 || from === targetIndex) return;
            appearance.cards.splice(from, 1);
            appearance.cards.splice(targetIndex, 0, card);
            appearance.layout = 'custom';
            list.insertBefore(row, from < targetIndex ? target.nextSibling : target);
          }
        };
        const onEnd = (endEvent: PointerEvent) => {
          if (endEvent.pointerId !== event.pointerId) return;
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onEnd);
          window.removeEventListener('pointercancel', onEnd);
          render();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
      });
      if (appearance.grid) {
        row.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('.drag-handle, select, .move-buttons button').forEach((control) => { control.disabled = true; });
      }
      list.append(row);
    }
    if (busy) list.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input, button, select')
      .forEach((control) => { control.disabled = true; });
    const colors = paletteColors[appearance.palette];
    const previewBackground = appearance.background === 'solid' ? appearance.backgroundColor : colors.background;
    preview.style.setProperty('--preview-background', previewBackground);
    preview.style.setProperty('--preview-accent', appearance.palette === 'custom' ? appearance.customAccent : colors.accent);
    $('#grid-editor').style.setProperty('--preview-background', previewBackground);
    $('#grid-editor').style.setProperty('--preview-accent', appearance.palette === 'custom' ? appearance.customAccent : colors.accent);
    const visible = appearance.cards.filter((card) => card.visible);
    const split = Math.ceil(visible.length / 2);
    preview.replaceChildren();
    preview.hidden = Boolean(appearance.grid);
    for (const cards of [visible.slice(0, split), visible.slice(split)]) {
      if (!cards.length) continue;
      const previewRow = document.createElement('div');
      previewRow.className = 'tv-preview-row';
      for (const card of cards) {
        const tile = document.createElement('div');
        tile.className = 'tv-preview-tile';
        tile.dataset.cardId = card.id;
        tile.style.flex = card.size === 'wide' ? '2' : '1';
        tile.textContent = labels[card.id];
        previewRow.append(tile);
      }
      preview.append(previewRow);
    }
    renderLibrary(); updatePreview(); updateActions();
  }
  function move(id: CardId, destination: number) {
    const from = appearance.cards.findIndex((card) => card.id === id);
    if (destination < 0 || destination >= appearance.cards.length || from === destination) return;
    const [card] = appearance.cards.splice(from, 1);
    appearance.cards.splice(destination, 0, card);
    appearance.layout = 'custom';
    render();
  }
  async function request(method: 'GET' | 'PUT', body?: object, endpoint = 'userAppearance') {
    const current = generation;
    const token = await getToken();
    if (current !== generation) throw new Error('Account changed.');
    if (!token) throw new Error('Sign in to edit your dashboard.');
    const response = await fetch(`${apiUrl}/${endpoint}`, {
      method, headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
      ...(body ? {body: JSON.stringify(body)} : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not update dashboard settings.');
    return result;
  }
  async function load() {
    const current = ++generation;
    clearTimeout(draftTimer); draftError = '';
    gridEditor.clear();
    photos.clear();
    loaded = false; busy = true; render(); message('Loading your dashboard settings…');
    try {
      const result = await request('GET', undefined, 'appearanceStudio') as {
        appearance: Appearance | null; updatedAtMs: number; library: AppearanceLibrary; history: PublishedRevision[];
      };
      if (current !== generation) return;
      appearance = normalize(result.appearance);
      revision = result.updatedAtMs || 0;
      publishedRevision = revision;
      savedJson = JSON.stringify(appearance);
      library = result.library; history = result.history;
      draftJson = JSON.stringify(library.draft);
      if (library.draft) {
        appearance = normalize(structuredClone(library.draft.appearance));
        // Retain the draft's base so a newer TV publish cannot be overwritten silently.
        if (JSON.stringify(appearance) !== savedJson) revision = library.draft.baseUpdatedAtMs;
      }
      observedJson = JSON.stringify(appearance); undo = []; redo = [];
      loaded = true;
      void photos.load();
    } catch (error) {
      if (current !== generation) return;
      loaded = false; content.hidden = true;
      message(error instanceof Error ? error.message : 'Could not load settings.', 'error');
    } finally { if (current === generation) {
      busy = false; render();
      if (loaded && library.draft && revision !== publishedRevision) message('Restored a draft based on older TV settings. Discard changes to load the latest published settings before publishing.', 'error');
      else if (loaded && library.draft && !changed()) message('Draft already matches your TV settings.');
      else if (loaded && library.draft) message('Restored your saved draft. Discard changes to return to the latest TV settings.');
    } }
  }
  async function changeLibrary(body: object, success: string) {
    if (busy || !loaded) return;
    const current = generation;
    busy = true; render();
    try {
      const result = await request('PUT', {...body, expectedUpdatedAtMs: library.updatedAtMs}, 'appearanceStudio');
      if (current !== generation) return;
      library = result.library; draftJson = JSON.stringify(library.draft); draftError = '';
      busy = false; render(); message(success, 'success');
    } catch (error) {
      if (current !== generation) return;
      draftError = error instanceof Error ? error.message : 'Could not save your draft.';
      busy = false; render(); message(draftError, 'error');
    }
  }
  async function saveDraft() {
    if (!draftChanged()) return;
    await changeLibrary({action: 'draft', draft: currentDraft()}, 'Draft saved. Use Save to TV when ready.');
  }
  designName.addEventListener('input', updateActions);
  designSave.addEventListener('click', () => void changeLibrary({action: 'saveDesign', name: designName.value.trim(), appearance}, 'Design saved.'));
  libraryRefresh.addEventListener('click', async () => {
    if (busy) return;
    const current = generation;
    busy = true; render();
    try {
      const result = await request('GET', undefined, 'appearanceStudio');
      if (current !== generation) return;
      library = result.library; history = result.history; publishedRevision = result.updatedAtMs;
      draftJson = JSON.stringify(library.draft);
      draftError = draftChanged() ? 'Library refreshed. Save draft to keep your page edits, or Discard changes to use the published TV settings.' : '';
      busy = false; render(); message('Designs and history refreshed. Your page edits are still here.');
    } catch (error) {
      if (current !== generation) return;
      busy = false; render(); message(error instanceof Error ? error.message : 'Could not refresh designs.', 'error');
    }
  });
  draftSave.addEventListener('click', () => void saveDraft());
  for (const [button, from, to] of [[undoButton, () => undo, () => redo], [redoButton, () => redo, () => undo]] as const) {
    button.addEventListener('click', () => {
      const snapshot = from().pop(); if (!snapshot || busy) return;
      to().push(JSON.stringify(appearance)); appearance = normalize(JSON.parse(snapshot));
      observedJson = JSON.stringify(appearance); draftError = ''; render();
    });
  }
  window.addEventListener('beforeunload', (event) => {
    if (loaded && draftChanged()) { event.preventDefault(); event.returnValue = ''; }
  });
  layout.addEventListener('change', () => {
    const selected = layout.value as Appearance['layout'];
    appearance.layout = selected;
    if (selected !== 'custom') {
      appearance.cards = copyCards(presets[selected]);
      if (appearance.grid) appearance.grid = gridFromCards(appearance.cards);
      appearance.layout = appearance.grid ? 'custom' : selected;
    }
    render();
  });
  mode.addEventListener('change', () => {
    appearance.grid = mode.value === 'grid' ? gridFromCards(appearance.cards) : null;
    appearance.layout = 'custom'; render();
  });
  palette.addEventListener('change', () => { appearance.palette = palette.value as Appearance['palette']; render(); });
  accent.addEventListener('input', () => { appearance.customAccent = accent.value; appearance.palette = 'custom'; render(); });
  background.addEventListener('change', () => { appearance.background = background.value as Appearance['background']; render(); });
  backgroundColor.addEventListener('input', () => { appearance.backgroundColor = backgroundColor.value; render(); });
  backgroundZoom.addEventListener('input', () => {
    appearance.backgroundZoom = Number(backgroundZoom.value) / 100;
    $('#background-zoom-value').textContent = `${backgroundZoom.value}%`;
    updatePreview(); updateActions();
  });
  save.addEventListener('click', async () => {
    if (busy) return;
    const current = generation;
    const sentJson = JSON.stringify(appearance);
    busy = true; render(); message('Saving your dashboard…');
    try {
      const result = await request('PUT', {appearance: JSON.parse(sentJson), source: 'web', expectedUpdatedAtMs: revision});
      if (current !== generation) return;
      savedJson = sentJson;
      revision = result.updatedAtMs;
      publishedRevision = revision;
      busy = false; render();
      message('Saved. Your TV will pick up the change shortly.', 'success');
      // Clearing the account draft is separate from publishing; a failed cleanup never undoes a publish.
      await changeLibrary({action: 'draft', draft: null}, 'Saved to TV. Your draft is clear.');
      if (current !== generation) return;
      if (draftError) message('Saved to TV. The account draft could not be cleared; refresh designs and history to retry.', 'info');
    } catch (error) {
      if (current !== generation) return;
      busy = false; render(); message(error instanceof Error ? error.message : 'Could not save settings.', 'error');
    }
    if (current !== generation || changed()) return;
    try {
      const latest = await request('GET', undefined, 'appearanceStudio');
      if (current !== generation) return;
      history = latest.history; publishedRevision = latest.updatedAtMs; renderLibrary();
    } catch {
      if (current === generation) message('Saved to TV. Use Refresh designs and history to reload the revision list.', 'success');
    }
  });
  reload.addEventListener('click', async () => {
    const current = generation;
    await changeLibrary({action: 'draft', draft: null}, 'Draft discarded.');
    if (current === generation && !draftError) await load();
  });
  return {
    load,
    clear() { generation++; clearTimeout(draftTimer); gridEditor.clear(); surfaces.clear(); photos.clear(); preview.replaceChildren(); busy = false; loaded = false; revision = 0; appearance = normalize(null); savedJson = ''; library = emptyLibrary(); history = []; undo = []; redo = []; observedJson = ''; draftJson = 'null'; draftError = ''; $('#design-list').replaceChildren(); $('#revision-list').replaceChildren(); designName.value = ''; content.hidden = true; message('Sign in to edit your dashboard.'); },
  };
}
