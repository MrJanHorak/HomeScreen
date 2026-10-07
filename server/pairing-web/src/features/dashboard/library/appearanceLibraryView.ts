import type {AppearanceLibrary, PublishedRevision, SavedDesign} from '../../../../../functions/src/utils/appearanceLibrary';
import {requiredElement} from '../../../shared/dom';

interface LibraryActions {
  load: (appearance: unknown) => void;
  replace: (design: SavedDesign) => void;
  remove: (design: SavedDesign) => void;
  removeRevision: (entry: PublishedRevision) => void;
}

export interface AppearanceLibraryView {
  render: (library: AppearanceLibrary, history: PublishedRevision[], publishedRevision: number, busy: boolean) => void;
  clear: () => void;
}

function libraryRow(text: string, actions: [string, () => void][], busy: boolean): HTMLElement {
  const row = document.createElement('div');
  row.className = 'design-library-row';
  const label = document.createElement('span');
  label.textContent = text;
  row.append(label);
  for (const [title, action] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button-text';
    button.textContent = title;
    button.disabled = busy;
    button.addEventListener('click', action);
    row.append(button);
  }
  return row;
}

function revisionLabel(entry: PublishedRevision, publishedRevision: number): string {
  const sources = {previous: 'Previous settings', tv: 'TV', web: 'Companion'};
  const published = entry.updatedAtMs === publishedRevision ? ' · Published' : '';
  return `${new Date(entry.updatedAtMs).toLocaleString()} · ${sources[entry.source]}${published}`;
}

/** Render library controls; the editor decides how each action changes the draft. */
export function createAppearanceLibraryView(root: HTMLElement, actions: LibraryActions): AppearanceLibraryView {
  const designs = requiredElement(root, '#design-list');
  const revisions = requiredElement(root, '#revision-list');

  function clear() {
    designs.replaceChildren();
    revisions.replaceChildren();
  }

  function render(library: AppearanceLibrary, history: PublishedRevision[], publishedRevision: number, busy: boolean) {
    clear();
    for (const design of library.designs) {
      designs.append(libraryRow(design.name, [
        ['Load', () => actions.load(design.appearance)],
        ['Replace', () => actions.replace(design)],
        ['Delete', () => actions.remove(design)],
      ], busy));
    }
    if (!library.designs.length) designs.textContent = 'No saved designs yet.';
    for (const entry of history) {
      revisions.append(libraryRow(revisionLabel(entry, publishedRevision), [
        ['Restore to draft', () => actions.load(entry.appearance)],
        ['Delete', () => actions.removeRevision(entry)],
      ], busy));
    }
    if (!history.length) revisions.textContent = 'History starts with your next Save to TV or TV settings change.';
  }

  return {render, clear};
}
