export function pairingTemplate(): string {
  return `<form id="pair-form" novalidate>
        <label class="field-label" for="pair-code">CODE ON YOUR TV</label>
        <input id="pair-code" name="code" type="text" inputmode="text" autocomplete="one-time-code"
          autocapitalize="characters" spellcheck="false" maxlength="6" placeholder="A7K9W2" required />
        <p class="field-hint">Six characters. The code expires after 15 minutes.</p>
        <button id="connect-button" class="button button-primary" type="submit" disabled>
          Connect TV <span aria-hidden="true">↗</span>
        </button>
      </form>`;
}
