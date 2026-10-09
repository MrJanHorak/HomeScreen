export const APPEARANCE_EDITOR_TEMPLATE = `
    <p class="field-label">DASHBOARD STUDIO</p>
    <h2>Make the TV yours</h2>
    <p class="meal-copy">Arrange the cards and choose a look here. Drafts save to your account; Save to TV publishes them within about a minute.</p>
    <div id="appearance-content" hidden>
      <div class="studio-actionbar"><div><p class="field-label">DASHBOARD DRAFT</p><p id="draft-status" class="field-hint" role="status" aria-live="polite"></p></div>
        <div class="draft-actions"><button id="appearance-undo" class="button button-text" type="button">Undo</button><button id="appearance-redo" class="button button-text" type="button">Redo</button><button id="draft-save" class="button button-secondary" type="button">Save draft</button></div>
        <div class="editor-actions"><button id="appearance-reload" class="button button-text" type="button">Discard changes</button><button id="appearance-save" class="button button-primary" type="button">Save to TV <span aria-hidden="true">↗</span></button></div>
      </div>
      <div class="studio-workspace">
        <div class="studio-preview">
          <div class="studio-preview-heading"><span class="field-label">TV PREVIEW</span><span>Updates as you edit</span></div>
          <div id="grid-editor"></div>
          <div id="widget-preview"></div>
          <div id="tv-preview" class="tv-preview" aria-label="Approximate dashboard layout preview"></div>
        </div>
        <div class="studio-controls">
          <details class="studio-section" open><summary>Layout & cards</summary><div class="studio-section-body">
            <div id="legacy-layout-controls">
            <label class="field-label" for="layout-select">STARTING LAYOUT</label>
            <select id="layout-select"><option value="balanced">Balanced</option><option value="agenda">Agenda</option><option value="wellness">Wellness</option><option value="calm">Calm</option><option value="custom">Custom</option></select>
            <label class="field-label" for="layout-mode">ARRANGEMENT</label>
            <select id="layout-mode"><option value="rows">Automatic rows</option><option value="grid">Free layout</option></select>
            <p id="cards-hint" class="field-hint">Drag to reorder, or use the arrow buttons. Wide cards take twice the row space.</p>
            <div id="card-list" class="card-list"></div>
            <div id="grid-position-controls"></div>
            </div>
            <div id="widget-studio"></div>
            <div id="widget-add"></div>
          </div></details>
          <details class="studio-section"><summary>Fonts & reading</summary><div class="studio-section-body" id="reading-editor"></div></details>
          <details class="studio-section"><summary>Colors & background</summary><div class="studio-section-body">
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
            <details class="studio-photos"><summary>Your photo library</summary><div id="photo-gallery"></div></details>
          </div></details>
          <details class="studio-section" id="legacy-card-style-section"><summary>Card style</summary><div class="studio-section-body">
            <p class="field-hint">Set each card's surface, border thickness, and corner radius. Zero removes the border or rounds.</p>
            <div id="card-style-editor"></div>
          </div></details>
          <details class="studio-section"><summary>Ambient mode</summary><div class="studio-section-body" id="ambient-editor"></div></details>
        </div>
      </div>
      <div id="appearance-conflict" class="settings-conflict" hidden role="region" aria-labelledby="conflict-title">
        <h3 id="conflict-title">Review newer TV settings</h3>
        <p>Your draft is safe. The TV settings were saved again after this draft started.</p>
        <p id="conflict-differences" class="field-hint"></p>
        <p>Keep your draft to replace the published design on your next Save to TV, including its colors, cards, background and ambient settings. Or use the latest TV settings and discard this draft.</p>
        <div class="editor-actions"><button id="appearance-keep-draft" class="button button-secondary" type="button">Keep my draft</button><button id="appearance-use-latest" class="button button-text" type="button">Use latest TV settings</button></div>
      </div>
      <details class="studio-section"><summary>Saved designs and published history</summary><div class="studio-section-body">
        <h3>Current draft</h3>
        <p class="field-hint">One draft is kept as you edit. Delete it to return to the latest TV settings. Your saved designs stay in your library.</p>
        <button id="draft-delete" class="button button-text" type="button">Delete draft</button>
        <h3>Saved designs</h3>
        <label class="field-label" for="design-name">DESIGN NAME</label>
        <input id="design-name" type="text" maxlength="60" placeholder="Evening dashboard" />
        <button id="design-save" class="button button-secondary" type="button">Save as new design</button>
        <button id="library-refresh" class="button button-text" type="button">Refresh designs and history</button>
        <p class="field-hint">Keep up to 20 designs. Loading a design or restoring a revision edits your draft; use Save to TV to publish it.</p>
        <div id="design-list" class="design-library"></div>
        <h3>Published history</h3><p class="field-hint">The latest 30 revisions, including TV settings changes. Delete entries individually or clear the list. Saved designs and current TV settings are kept.</p>
        <button id="history-clear" class="button button-text" type="button">Clear history</button>
        <div id="revision-list" class="design-library"></div>
      </div></details>
    </div>
    <p id="appearance-status" class="status" role="status" aria-live="polite">Sign in to edit your dashboard.</p>
  `;
