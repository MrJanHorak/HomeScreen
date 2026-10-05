export type CompanionPage = 'pair' | 'dashboard' | 'settings' | 'meals' | 'account';

interface PageCopy {
  title: string;
  eyebrow: string;
  heading: string;
  intro: string;
  privacy: string;
}

const PAGE_COPY: Record<CompanionPage, PageCopy> = {
  pair: {
    title: 'Pair your TV · HomeScreen',
    eyebrow: 'TV SETUP',
    heading: 'Bring your dashboard to the big screen.',
    intro: 'Sign in on this device, then enter the code shown on your TV. Your Google password stays off the TV.',
    privacy: 'Google will ask you to approve Calendar, Tasks, and activity access. You can revoke access in your Google account at any time.',
  },
  dashboard: {
    title: 'Dashboard studio · HomeScreen',
    eyebrow: 'DASHBOARD STUDIO',
    heading: 'Shape your home screen.',
    intro: 'Arrange cards, choose photos, and customize ambient mode. Drafts save privately until you publish to your TVs.',
    privacy: 'Editing a design needs no additional Google permission. Choosing personal images asks for Google Photos access.',
  },
  settings: {
    title: 'TV settings · HomeScreen',
    eyebrow: 'TV SETTINGS',
    heading: 'Set the right location.',
    intro: 'Manage weather cities and activity goals with the Google account linked to your TVs.',
    privacy: 'Settings stay private to your linked Google account. Review or remove service connections in TVs & account.',
  },
  meals: {
    title: 'Connect your meal Sheet · HomeScreen',
    eyebrow: 'MEAL PLAN SETUP',
    heading: 'Connect your dinner plan.',
    intro: 'Sign in with the Google account paired to your TV, then connect the Sheet you update with Gemini.',
    privacy: 'Google will ask you to approve Sheets access when you connect a meal plan. You can remove the connection here at any time.',
  },
  account: {
    title: 'TVs and account · HomeScreen',
    eyebrow: 'TVS & ACCOUNT',
    heading: 'Your TVs and connections.',
    intro: 'Manage each TV’s name, favorite apps, and access. Review connected services and your saved data.',
    privacy: 'Settings stay private to your linked Google account. Review or remove service connections in TVs & account.',
  },
};

export function companionPageForPath(path: string): CompanionPage {
  switch (path) {
    case '/dashboard': return 'dashboard';
    case '/settings': return 'settings';
    case '/meals': return 'meals';
    case '/account': return 'account';
    default: return 'pair';
  }
}

function siteNavigation(page: CompanionPage): string {
  const links: [CompanionPage, string][] = [
    ['dashboard', 'Dashboard'], ['settings', 'Weather & goals'],
    ['meals', 'Meals'], ['account', 'TVs & account'], ['pair', 'Pair TV'],
  ];
  const items = links.map(([target, label]) =>
    `<a href="/${target}" ${page === target ? 'aria-current="page"' : ''}>${label}</a>`);
  return `<nav class="site-nav" aria-label="Companion site">${items.join('')}</nav>`;
}

function pageGuide(page: CompanionPage): string {
  switch (page) {
    case 'settings': return `<aside class="page-guide" aria-label="Help with TV settings">
      <p class="field-label">SETTINGS GUIDE</p><h2>One account, all your TVs.</h2>
      <p class="meal-copy">Weather and goals save separately from your dashboard design. Keep the TV online to receive updates within about a minute.</p>
      <a class="guide-link" href="/dashboard">Edit appearance, photos & ambient →</a>
      <a class="guide-link" href="/account">Manage TVs & favorite apps →</a></aside>`;
    case 'meals': return `<aside class="page-guide" aria-label="Help with meal setup">
      <p class="field-label">SHEET CHECKLIST</p><h2>A simple dinner table.</h2>
      <p class="meal-copy">Use a visible tab named Meals, Menu, or Week with these columns:</p>
      <div class="sheet-example"><table><caption class="sr-only">Example meal Sheet columns</caption>
        <thead><tr><th>Date</th><th>Meal_Name</th></tr></thead>
        <tbody><tr><td>YYYY-MM-DD</td><td>Vegetable pasta</td></tr></tbody></table></div>
      <details class="help-panel"><summary>Sheet format and permissions</summary>
        <p>Use actual Sheets dates or YYYY-MM-DD text. Optional columns: Servings, Recipe_ID, and Notes/Prep_Style. Past dates are hidden from upcoming meals.</p>
        <p>Google grants read-only access to your spreadsheets. HomeScreen reads only the Sheet you choose; you can disconnect it on this page.</p>
      </details></aside>`;
    case 'pair': return `<aside class="page-guide" aria-label="Help with pairing">
      <p class="field-label">GET CONNECTED</p><h2>Ready in two steps.</h2>
      <p class="meal-copy">Open HomeScreen on your TV. Sign in here with Google, then enter the six-character code shown on the TV.</p>
      <details class="help-panel"><summary>Code expired or TV missing?</summary>
        <p>Codes expire after 15 minutes. Request a new code on your TV, then enter it here. After pairing, your TV appears under TVs & account when it next connects.</p>
      </details><a class="guide-link" href="/dashboard">Already paired? Open your dashboard →</a></aside>`;
    default: return '';
  }
}

/** Render route-specific copy and controls; authentication stays in the entry point. */
export function renderCompanionPage(root: HTMLElement, page: CompanionPage): void {
  const copy = PAGE_COPY[page];
  document.title = copy.title;
  const pairMode = page === 'pair';
  const dashboardMode = page === 'dashboard';
  const settingsMode = page === 'settings';
  const mealMode = page === 'meals';
  root.innerHTML = `
  <a class="skip-link" href="#page-content">Skip to controls</a>
  <main class="layout companion-mode ${dashboardMode ? 'dashboard-mode' : ''} ${pairMode ? 'pair-mode' : ''}">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>
    <section class="card" aria-labelledby="page-title">
      <div class="brand"><span class="brand-mark">H</span><span>HomeScreen</span></div>
      <p class="eyebrow">${copy.eyebrow} <span class="eyebrow-line"></span></p>
      <h1 id="page-title">${copy.heading}</h1>
      <p class="intro">${copy.intro}</p>
      ${siteNavigation(page)}

      ${!pairMode ? '' : `<div class="steps" aria-hidden="true">
        <span class="step active"><span class="step-number">1</span> Sign in</span>
        <span class="step-rule"></span>
        <span class="step"><span class="step-number">2</span> Enter code</span>
      </div>`}

      <div class="account-panel">
        <div class="account-copy"><span class="field-label">GOOGLE ACCOUNT</span><strong id="account-name">Not signed in</strong></div>
        <button id="signin-button" class="button button-secondary" type="button">Sign in with Google</button>
        <button id="signout-button" class="button button-text" type="button" hidden>Switch account</button>
      </div>

      <div id="page-content" tabindex="-1" class="page-workspace">
      <div class="page-primary">
      <form id="pair-form" novalidate ${!pairMode ? 'hidden' : ''}>
        <label class="field-label" for="pair-code">CODE ON YOUR TV</label>
        <input id="pair-code" name="code" type="text" inputmode="text" autocomplete="one-time-code"
          autocapitalize="characters" spellcheck="false" maxlength="6" placeholder="A7K9W2" required />
        <p class="field-hint">Six characters. The code expires after 15 minutes.</p>
        <button id="connect-button" class="button button-primary" type="submit" disabled>
          Connect TV <span aria-hidden="true">↗</span>
        </button>
      </form>

      <p id="status" class="status" role="status" aria-live="polite"></p>
      <a id="connected-next" class="mode-link" href="/dashboard" hidden>Design your dashboard from this device →</a>

      <section id="appearance-editor" class="appearance-editor" aria-label="Dashboard appearance" ${dashboardMode ? '' : 'hidden'}></section>
      <section id="weather-editor" class="settings-panel" aria-label="Weather and activity settings" ${settingsMode ? '' : 'hidden'}></section>

      <section class="meal-panel" aria-labelledby="meal-title" ${mealMode ? '' : 'hidden'}>
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
      </section>
      <section id="account-controls" class="account-controls" aria-labelledby="account-controls-title" hidden>
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
      </section>
      </div>
      ${pageGuide(page)}
      </div>
      <div class="privacy-note"><span class="privacy-icon" aria-hidden="true">✦</span><span>${copy.privacy}</span></div>
    </section>
    <footer>Private by design <span>·</span> Made for your TV</footer>
  </main>
`;
}
