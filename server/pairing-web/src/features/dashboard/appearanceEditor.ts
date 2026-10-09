import {createAppearanceApi} from './appearanceApi';
import type {HistoryChange, LibraryChange} from './appearanceApi';
import {HttpRequestError} from '../../../../../shared/src/http';
import {findGridSpace, gridFromCards} from '../../../../functions/src/utils/dashboardLayout';
import {emptyLibrary} from '../../../../functions/src/utils/appearanceLibrary';
import type {AppearanceLibrary, PublishedRevision} from '../../../../functions/src/utils/appearanceLibrary';
import {createGridEditor} from './grid/gridEditor';
import {createCardStyleEditor} from './cards/cardStyleEditor';
import {createPhotoGallery} from './photos/photoGallery';
import {createAmbientEditor} from './ambient/ambientEditor';
import {createReadingEditor} from './readingEditor';
import {normalizeAmbient} from './ambient/ambientPreferences';
import {copyCards, normalizeAppearance, appearanceDifferences, LAYOUT_PRESETS, PALETTE_COLORS} from './appearanceModel';
import type {Appearance, Card, CardId} from './appearanceModel';
import {APPEARANCE_EDITOR_TEMPLATE} from './appearanceTemplate';
import {createAppearanceLibraryView} from './library/appearanceLibraryView';
import {createAppearancePreview} from './preview/appearancePreview';
import {createAppearanceCardsEditor} from './cards/appearanceCardsEditor';
import {requiredElement} from '../../shared/dom';
import {createWidgetStudio, applyWidgetLayout} from '../polls/WidgetStudio';

export interface AppearanceEditor {
  load: () => Promise<void>;
  clear: () => void;
}

export function createAppearanceEditor(
  root: HTMLElement, apiUrl: string, getToken: () => Promise<string | null>,
): AppearanceEditor {
  let appearance = normalizeAppearance(null);
  let publishedJson = '';
  let loaded = false;
  let busy = false;
  let generation = 0;
  let draftBaseRevision = 0;
  let publishedRevision = 0;
  let savedPhoto: string | null = null;
  let library: AppearanceLibrary = emptyLibrary();
  let history: PublishedRevision[] = [];
  let lastEditJson = '';
  let savedDraftJson = 'null';
  let undoStack: string[] = [];
  let redoStack: string[] = [];
  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  let draftError = '';
  let conflict: {appearance: Appearance; updatedAtMs: number} | null = null;
  root.innerHTML = APPEARANCE_EDITOR_TEMPLATE;
  const getElement = <T extends HTMLElement>(selector: string) => requiredElement<T>(root, selector);
  const content = getElement('#appearance-content');
  const status = getElement('#appearance-status');
  const layout = getElement<HTMLSelectElement>('#layout-select');
  const mode = getElement<HTMLSelectElement>('#layout-mode');
  const palette = getElement<HTMLSelectElement>('#palette-select');
  const accent = getElement<HTMLInputElement>('#accent-color');
  const background = getElement<HTMLSelectElement>('#background-select');
  const backgroundColor = getElement<HTMLInputElement>('#background-color');
  const backgroundZoom = getElement<HTMLInputElement>('#background-zoom');
  const preview = createAppearancePreview(root);
  const readingEditor = createReadingEditor(getElement('#reading-editor'), (reading) => {
    appearance.reading = reading;
    render();
  });
  const libraryView = createAppearanceLibraryView(root, {
    load: loadDesign,
    replace: (design) => void changeLibrary({action: 'saveDesign', id: design.id, name: design.name, appearance}, 'Design replaced.'),
    remove: (design) => void changeLibrary({action: 'deleteDesign', id: design.id}, 'Design deleted.'),
    removeRevision: (entry) => void changeHistory({action: 'deleteRevision', updatedAtMs: entry.updatedAtMs}),
  });
  const cardEditor = createAppearanceCardsEditor(getElement('#card-list'), {
    visibility: changeCardVisibility,
    size: changeCardSize,
    move,
    reorder: (cards) => {
      appearance.cards = cards;
      appearance.layout = 'custom';
      render();
    },
  });
  const save = getElement<HTMLButtonElement>('#appearance-save');
  const reload = getElement<HTMLButtonElement>('#appearance-reload');
  const conflictPanel = getElement('#appearance-conflict');
  const keepDraft = getElement<HTMLButtonElement>('#appearance-keep-draft');
  const useLatest = getElement<HTMLButtonElement>('#appearance-use-latest');
  const undoButton = getElement<HTMLButtonElement>('#appearance-undo');
  const redoButton = getElement<HTMLButtonElement>('#appearance-redo');
  const draftSave = getElement<HTMLButtonElement>('#draft-save');
  const designSave = getElement<HTMLButtonElement>('#design-save');
  const designName = getElement<HTMLInputElement>('#design-name');
  const libraryRefresh = getElement<HTMLButtonElement>('#library-refresh');
  const draftDelete = getElement<HTMLButtonElement>('#draft-delete');
  const historyClear = getElement<HTMLButtonElement>('#history-clear');
  const gridEditor = createGridEditor(getElement('#grid-editor'), (grid) => {
    appearance.grid = grid;
    appearance.layout = 'custom';
    render();
  }, (text) => message(text, 'error'), getElement('#grid-position-controls'));
  const widgetStudio = createWidgetStudio(getElement('#widget-studio'), apiUrl, getToken, (widgetLayout) => {
    appearance = applyWidgetLayout(appearance, widgetLayout); render();
  }, getElement('#widget-preview'), getElement('#widget-add'));
  const surfaces = createCardStyleEditor(getElement('#card-style-editor'), (id, style) => {
    appearance.cardStyles = {...appearance.cardStyles};
    if (style) appearance.cardStyles[id] = style;
    else delete appearance.cardStyles[id];
    updatePreview();
    updateActions();
  });
  const photos = createPhotoGallery(getElement('#photo-gallery'), apiUrl, getToken, (dataUrl) => {
    savedPhoto = dataUrl;
    updatePreview();
  }, (purpose) => {
    if (purpose === 'background') appearance.background = 'google-photo';
    else appearance.ambient = {...normalizeAmbient(appearance.ambient), photoSource: 'selected'};
    render();
  });
  const ambientEditor = createAmbientEditor(getElement('#ambient-editor'), (ambient) => {
    appearance.ambient = ambient;
    render();
  });

  function message(text: string, kind: 'info' | 'error' | 'success' = 'info') {
    status.textContent = text;
    status.dataset.kind = kind;
  }
  function hasUnpublishedChanges() { return JSON.stringify(appearance) !== publishedJson; }
  function currentDraft() {
    return hasUnpublishedChanges() ? {appearance, baseUpdatedAtMs: draftBaseRevision} : null;
  }
  function hasUnsavedDraftChanges() { return JSON.stringify(currentDraft()) !== savedDraftJson; }
  function recordCurrentEdit() {
    const next = JSON.stringify(appearance);
    if (!loaded || next === lastEditJson) return;
    if (lastEditJson) undoStack = [...undoStack.slice(-99), lastEditJson];
    redoStack = [];
    lastEditJson = next;
    draftError = '';
  }
  function scheduleDraftSave() {
    clearTimeout(draftTimer);
    if (loaded && !busy && hasUnsavedDraftChanges() && !draftError) {
      draftTimer = setTimeout(() => void saveDraft(), 1500);
    }
  }
  function renderConflict() {
    conflictPanel.hidden = !conflict;
    keepDraft.disabled = busy;
    useLatest.disabled = busy;
    if (!conflict) return;
    const differences = appearanceDifferences(appearance, conflict.appearance);
    getElement('#conflict-differences').textContent = differences.length
      ? `Your draft differs from the latest TV settings in: ${differences.join(', ')}.`
      : 'Your draft already matches the latest TV settings.';
  }
  function updateActions() {
    recordCurrentEdit();
    scheduleDraftSave();
    renderConflict();
    save.disabled = busy || !hasUnpublishedChanges() || Boolean(conflict);
    reload.disabled = busy;
    undoButton.disabled = busy || !undoStack.length;
    redoButton.disabled = busy || !redoStack.length;
    draftSave.disabled = busy || !hasUnsavedDraftChanges();
    designSave.disabled = busy || !designName.value.trim();
    designName.disabled = busy;
    libraryRefresh.disabled = busy;
    draftDelete.disabled = busy || (!library.draft && !hasUnpublishedChanges());
    historyClear.disabled = busy || !history.length;
    getElement('#draft-status').textContent = draftError || (hasUnsavedDraftChanges() ? 'Draft has changes waiting to save.' :
      hasUnpublishedChanges() ? 'Draft saved to your account. Your TV still shows the published design.' : 'No unpublished draft.');
    if (!busy) message(hasUnpublishedChanges() ? 'Unpublished changes. Save to TV when ready.' : 'Your TV settings are up to date.');
  }
  function renderLibrary() {
    libraryView.render(library, history, publishedRevision, busy);
  }
  function updatePreview() {
    preview.updateStyles(appearance, savedPhoto);
  }
  function loadDesign(value: unknown) {
    const next = normalizeAppearance(structuredClone(value));
    appearance = !next.widgetLayout && appearance.widgetLayout ? {...next, widgetLayout: appearance.widgetLayout} : next;
    render();
  }
  function changeCardVisibility(id: CardId, visible: boolean) {
    const card = appearance.cards.find((item) => item.id === id)!;
    if (!visible && appearance.cards.filter((item) => item.visible).length === 1) {
      render();
      message('Keep at least one card visible.', 'error');
      return;
    }
    if (appearance.grid) {
      if (visible) {
        const space = findGridSpace(appearance.grid, id);
        if (!space) {
          render();
          message('There is no room for another card. Shrink or move a card first.', 'error');
          return;
        }
        appearance.grid.items.push(space);
      } else appearance.grid.items = appearance.grid.items.filter((item) => item.id !== id);
    }
    card.visible = visible;
    appearance.layout = 'custom';
    render();
  }
  function changeCardSize(id: CardId, size: Card['size']) {
    appearance.cards.find((card) => card.id === id)!.size = size;
    appearance.layout = 'custom';
    render();
  }
  function render() {
    readingEditor.render(appearance.reading, busy);
    ambientEditor.render(normalizeAmbient(appearance.ambient), busy);
    content.hidden = !loaded;
    if (!loaded) return;
    layout.value = appearance.layout;
    mode.value = appearance.grid ? 'grid' : 'rows';
    mode.disabled = busy;
    gridEditor.render(appearance.grid, appearance.cards, busy);
    surfaces.render(appearance.cardStyles, busy, PALETTE_COLORS[appearance.palette].background);
    getElement('#cards-hint').textContent = appearance.grid
      ? 'Show or hide cards here. New cards use available space; shrink or move a card if the canvas is full. Choose a starting layout to reset the arrangement.'
      : 'Drag to reorder, or use the arrow buttons. Wide cards take twice the row space.';
    palette.value = appearance.palette;
    accent.value = appearance.customAccent;
    background.value = appearance.background;
    backgroundColor.value = appearance.backgroundColor;
    backgroundZoom.value = String(Math.round(appearance.backgroundZoom * 100));
    getElement('#background-zoom-value').textContent = `${backgroundZoom.value}%`;
    backgroundZoom.disabled = busy || appearance.background === 'solid';
    for (const control of [layout, palette, accent, background]) control.disabled = busy;
    backgroundColor.disabled = busy || appearance.background !== 'solid';
    cardEditor.render(appearance.cards, Boolean(appearance.grid), busy);
    preview.render(appearance, savedPhoto);
    widgetStudio.render(appearance, busy);
    updatePreview();
    getElement('#legacy-layout-controls').hidden = Boolean(appearance.widgetLayout);
    getElement('#legacy-card-style-section').hidden = Boolean(appearance.widgetLayout);
    if (appearance.widgetLayout) {
      for (const selector of ['#card-list', '#grid-editor', '#tv-preview', '#card-style-editor', '#grid-position-controls', '#cards-hint']) getElement(selector).hidden = true;
      mode.disabled = true; layout.disabled = true;
    } else {
      for (const selector of ['#card-list', '#tv-preview', '#card-style-editor', '#cards-hint']) getElement(selector).hidden = false;
    }
    renderLibrary();
    updateActions();
  }
  function move(id: CardId, destination: number) {
    const from = appearance.cards.findIndex((card) => card.id === id);
    if (destination < 0 || destination >= appearance.cards.length || from === destination) return;
    const [card] = appearance.cards.splice(from, 1);
    appearance.cards.splice(destination, 0, card);
    appearance.layout = 'custom';
    render();
  }
  const api = createAppearanceApi(apiUrl, async () => {
    const current = generation;
    const token = await getToken();
    if (current !== generation) throw new Error('Account changed.');
    return token;
  });
  async function load() {
    const current = ++generation;
    clearTimeout(draftTimer);
    draftError = '';
    conflict = null;
    gridEditor.clear();
    cardEditor.clear();
    photos.clear();
    loaded = false;
    busy = true;
    render();
    message('Loading your dashboard settings…');
    try {
      const result = await api.loadStudio();
      if (current !== generation) return;
      appearance = normalizeAppearance(result.appearance);
      draftBaseRevision = result.updatedAtMs || 0;
      publishedRevision = draftBaseRevision;
      publishedJson = JSON.stringify(appearance);
      library = result.library;
      history = result.history;
      savedDraftJson = JSON.stringify(library.draft);
      if (library.draft) {
        appearance = normalizeAppearance(structuredClone(library.draft.appearance));
        // Retain the draft's base so a newer TV publish cannot be overwritten silently.
        if (JSON.stringify(appearance) !== publishedJson) draftBaseRevision = library.draft.baseUpdatedAtMs;
      }
      lastEditJson = JSON.stringify(appearance);
      undoStack = [];
      redoStack = [];
      if (draftBaseRevision !== publishedRevision) conflict = {appearance: normalizeAppearance(result.appearance), updatedAtMs: publishedRevision};
      loaded = true;
      void photos.load();
    } catch (error) {
      if (current !== generation) return;
      loaded = false;
      content.hidden = true;
      message(error instanceof Error ? error.message : 'Could not load settings.', 'error');
    } finally {
      if (current === generation) {
        busy = false;
        render();
        showRestoredDraftStatus();
      }
    }
  }
  function showRestoredDraftStatus() {
    if (!loaded) return;
    if (conflict) message('Restored an older draft. Review newer TV settings to keep your draft or use the latest settings.', 'error');
    else if (library.draft && !hasUnpublishedChanges()) message('Draft already matches your TV settings.');
    else if (library.draft) message('Restored your saved draft. Discard changes to return to the latest TV settings.');
  }

  async function changeLibrary(body: LibraryChange, success: string) {
    if (busy || !loaded) return;
    const current = generation;
    busy = true;
    render();
    try {
      const nextLibrary = await api.changeLibrary(body, library.updatedAtMs);
      if (current !== generation) return;
      library = nextLibrary;
      savedDraftJson = JSON.stringify(library.draft);
      draftError = '';
      busy = false;
      render();
      message(success, 'success');
    } catch (error) {
      if (current !== generation) return;
      draftError = error instanceof Error ? error.message : 'Could not save your draft.';
      busy = false;
      render();
      message(draftError, 'error');
    }
  }
  async function saveDraft() {
    if (!hasUnsavedDraftChanges()) return;
    await changeLibrary({action: 'draft', draft: currentDraft()}, 'Draft saved. Use Save to TV when ready.');
  }
  async function changeHistory(change: HistoryChange) {
    if (busy || !loaded) return;
    if (change.action === 'clearHistory' &&
        !window.confirm('Clear all published history? Saved designs, your current draft and TV settings will be kept.')) return;
    const current = generation;
    busy = true;
    render();
    let errorMessage = '';
    try {
      const nextHistory = await api.changeHistory(change, history.map((entry) => entry.updatedAtMs));
      if (current !== generation) return;
      history = nextHistory;
    } catch (error) {
      if (current !== generation) return;
      errorMessage = error instanceof Error ? error.message : 'Could not update history.';
    } finally {
      if (current === generation) {
        busy = false;
        render();
        message(errorMessage || (change.action === 'clearHistory' ? 'History cleared. Saved designs kept.' : 'History entry deleted.'),
          errorMessage ? 'error' : 'success');
      }
    }
  }
  designName.addEventListener('input', updateActions);
  designSave.addEventListener('click', () => void changeLibrary({action: 'saveDesign', name: designName.value.trim(), appearance}, 'Design saved.'));
  async function refreshLibrary() {
    if (busy) return;
    const current = generation;
    busy = true;
    render();
    try {
      const result = await api.loadStudio();
      if (current !== generation) return;
      library = result.library;
      history = result.history;
      publishedRevision = result.updatedAtMs;
      savedDraftJson = JSON.stringify(library.draft);
      draftError = hasUnsavedDraftChanges() ? 'Library refreshed. Save draft to keep your page edits, or Discard changes to use the published TV settings.' : '';
      busy = false;
      render();
      message('Designs and history refreshed. Your page edits are still here.');
    } catch (error) {
      if (current !== generation) return;
      busy = false;
      render();
      message(error instanceof Error ? error.message : 'Could not refresh designs.', 'error');
    }
  }
  libraryRefresh.addEventListener('click', () => void refreshLibrary());
  historyClear.addEventListener('click', () => void changeHistory({action: 'clearHistory'}));
  draftSave.addEventListener('click', () => void saveDraft());
  function restoreSnapshot(from: string[], to: string[]) {
    if (busy) return;
    const snapshot = from.pop();
    if (!snapshot) return;
    to.push(JSON.stringify(appearance));
    appearance = normalizeAppearance(JSON.parse(snapshot));
    lastEditJson = JSON.stringify(appearance);
    draftError = '';
    render();
  }
  undoButton.addEventListener('click', () => restoreSnapshot(undoStack, redoStack));
  redoButton.addEventListener('click', () => restoreSnapshot(redoStack, undoStack));
  window.addEventListener('beforeunload', (event) => {
    if (!loaded || !hasUnsavedDraftChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  });
  layout.addEventListener('change', () => {
    const selected = layout.value as Appearance['layout'];
    appearance.layout = selected;
    if (selected !== 'custom') {
      appearance.cards = copyCards(LAYOUT_PRESETS[selected]);
      if (appearance.grid) appearance.grid = gridFromCards(appearance.cards);
      appearance.layout = appearance.grid ? 'custom' : selected;
    }
    render();
  });
  mode.addEventListener('change', () => {
    appearance.grid = mode.value === 'grid' ? gridFromCards(appearance.cards) : null;
    appearance.layout = 'custom';
    render();
  });
  palette.addEventListener('change', () => {
    appearance.palette = palette.value as Appearance['palette'];
    render();
  });
  accent.addEventListener('input', () => {
    appearance.customAccent = accent.value;
    appearance.palette = 'custom';
    render();
  });
  background.addEventListener('change', () => {
    appearance.background = background.value as Appearance['background'];
    render();
  });
  backgroundColor.addEventListener('input', () => {
    appearance.backgroundColor = backgroundColor.value;
    render();
  });
  backgroundZoom.addEventListener('input', () => {
    appearance.backgroundZoom = Number(backgroundZoom.value) / 100;
    getElement('#background-zoom-value').textContent = `${backgroundZoom.value}%`;
    updatePreview();
    updateActions();
  });
  async function publishAppearance() {
    if (busy || conflict) return;
    const current = generation;
    const sentAppearance = structuredClone(appearance);
    const sentJson = JSON.stringify(sentAppearance);
    busy = true;
    render();
    message('Saving your dashboard…');
    try {
      const nextRevision = await api.publish(sentAppearance, draftBaseRevision);
      if (current !== generation) return;
      publishedJson = sentJson;
      draftBaseRevision = nextRevision;
      publishedRevision = draftBaseRevision;
      busy = false;
      render();
      message('Saved. Your TV will pick up the change shortly.', 'success');
      // Clearing the account draft is separate from publishing; a failed cleanup never undoes a publish.
      await changeLibrary({action: 'draft', draft: null}, 'Saved to TV. Your draft is clear.');
      if (current !== generation) return;
      if (draftError) message('Saved to TV. The account draft could not be cleared; refresh designs and history to retry.', 'info');
    } catch (error) {
      if (current !== generation) return;
      if (error instanceof HttpRequestError && error.status === 409) {
        try {
          const latest = await api.loadStudio();
          if (current !== generation) return;
          conflict = {appearance: normalizeAppearance(latest.appearance), updatedAtMs: latest.updatedAtMs || 0};
          publishedRevision = conflict.updatedAtMs;
          history = latest.history;
        } catch {
          // Keep the original revision if refresh fails; the next save is still guarded.
        }
      }
      busy = false;
      render();
      message(error instanceof Error ? error.message : 'Could not save settings.', 'error');
    }
    if (current !== generation || hasUnpublishedChanges()) return;
    try {
      const latest = await api.loadStudio();
      if (current !== generation) return;
      history = latest.history;
      publishedRevision = latest.updatedAtMs;
      renderLibrary();
    } catch {
      if (current === generation) message('Saved to TV. Use Refresh designs and history to reload the revision list.', 'success');
    }
  }
  save.addEventListener('click', () => void publishAppearance());
  async function discardDraft() {
    if (busy || !loaded) return;
    const current = generation;
    await changeLibrary({action: 'draft', draft: null}, 'Draft discarded.');
    if (current === generation && !draftError) await load();
  }
  reload.addEventListener('click', () => void discardDraft());
  draftDelete.addEventListener('click', () => void discardDraft());
  useLatest.addEventListener('click', () => void discardDraft());
  function keepCurrentDraft() {
    if (busy || !conflict) return;
    // Explicit choice to replace this revision; a later TV change will still return 409.
    draftBaseRevision = conflict.updatedAtMs;
    publishedJson = JSON.stringify(conflict.appearance);
    conflict = null;
    render();
    message('Draft kept. Review it, then Save to TV to replace the latest published design.');
  }
  keepDraft.addEventListener('click', keepCurrentDraft);
  function clear() {
    generation++;
    clearTimeout(draftTimer);
    conflict = null;
    conflictPanel.hidden = true;
    gridEditor.clear();
    cardEditor.clear();
    surfaces.clear();
    photos.clear();
    preview.clear();
    widgetStudio.clear();
    libraryView.clear();
    busy = false;
    loaded = false;
    draftBaseRevision = 0;
    publishedRevision = 0;
    savedPhoto = null;
    appearance = normalizeAppearance(null);
    publishedJson = '';
    library = emptyLibrary();
    history = [];
    undoStack = [];
    redoStack = [];
    lastEditJson = '';
    savedDraftJson = 'null';
    draftError = '';
    designName.value = '';
    content.hidden = true;
    message('Sign in to edit your dashboard.');
  }
  return {load, clear};
}
