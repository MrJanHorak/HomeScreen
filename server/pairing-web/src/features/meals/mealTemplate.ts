export function mealTemplate(): string {
  return `<section class="meal-panel" aria-labelledby="meal-title">
        <p class="field-label">MEAL PLAN</p>
        <h2 id="meal-title">Show dinner on your TV</h2>
        <p class="meal-copy">Connect a private Google Sheet for your dinner plan. Keep adding weeks to the same Sheet; your TV refreshes automatically.</p>
        <button id="meal-access-button" class="button button-secondary" type="button" disabled>Allow Google Sheets access</button>
        <form id="meal-form" hidden>
          <label class="field-label" for="meal-url">GOOGLE SHEET LINK</label>
          <input id="meal-url" type="url" inputmode="url" autocomplete="url" placeholder="https://docs.google.com/spreadsheets/d/…" required />
          <p class="field-hint">The meal tab needs Date and Meal_Name columns. Use real dates so today's dinner appears.</p>
          <button id="meal-save-button" class="button button-primary" type="submit">Use this Sheet <span aria-hidden="true">↗</span></button>
        </form>
        <p id="meal-current" class="meal-current" hidden></p>
        <button id="meal-remove-button" class="button button-text" type="button" hidden>Disconnect meal Sheet</button>
        <p id="meal-status" class="status" role="status" aria-live="polite"></p>
      </section>`;
}
