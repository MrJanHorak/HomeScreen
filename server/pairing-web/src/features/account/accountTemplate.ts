export function accountTemplate(): string {
  return `<section id="account-controls" class="account-controls" aria-labelledby="account-controls-title" hidden>
        <p class="field-label">ACCOUNT & PRIVACY</p>
        <h2 id="account-controls-title">Connected services</h2>
        <p class="meal-copy">Your linked TVs share dashboard design, weather cities, photos, and Google connections. Favorite apps are specific to each TV.</p>
        <div id="connection-status" class="connection-status" aria-live="polite">Checking connected services…</div>
        <p class="field-hint">Calendar and activity use read access. Tasks access also lets the TV complete tasks. Sheets access is read-only; Google Photos uses only photos you select.</p>
        <a class="mode-link" href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">Review Google permissions ↗</a>
        <section id="device-manager" class="device-manager" aria-label="Linked TVs"></section>
        <details class="help-panel account-danger"><summary>Disconnect services or remove account data</summary><p>These actions can sign out linked TVs. You’ll see the exact effect before confirming.</p><div class="account-actions">
          <button id="disconnect-photos-button" class="button button-text" type="button">Remove saved photos and sign out TVs</button>
          <button id="disconnect-google-button" class="button button-text" type="button">Disconnect Calendar, Tasks and activity; sign out TVs</button>
          <button id="revoke-button" class="button button-text" type="button">Sign out on every device</button>
          <button id="delete-account-button" class="button button-text danger" type="button">Delete account and saved data</button>
        </div></details>
        <p id="account-status" class="status" role="status" aria-live="polite"></p>
      </section>`;
}
