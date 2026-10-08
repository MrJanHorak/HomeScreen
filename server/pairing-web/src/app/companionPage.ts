import {pairingTemplate} from '../features/pairing/pairingTemplate';
import {mealTemplate} from '../features/meals/mealTemplate';
import {accountTemplate} from '../features/account/accountTemplate';

export type CompanionPage = 'pair' | 'dashboard' | 'settings' | 'meals' | 'account' | 'polls';

interface PageCopy {
  title: string;
  eyebrow: string;
  heading: string;
  intro: string;
  privacy: string;
}

const PAGE_COPY: Record<CompanionPage, PageCopy> = {
  polls: {title: 'Polls · HomeScreen', eyebrow: 'CREATE & SHARE', heading: 'Polls',
    intro: 'Ask a question, invite everyone to vote, and share the results on your TV.',
    privacy: 'Participant names and ballots are visible only to you. Archived private ballots are removed after 90 days.'},
  pair: {
    title: 'Pair your TV · HomeScreen',
    eyebrow: 'TV SETUP',
    heading: 'Connect a TV',
    intro: 'Sign in on this device, then enter the code shown on your TV. Your Google password stays off the TV.',
    privacy: 'Google will ask you to approve Calendar, Tasks, and activity access. You can revoke access in your Google account at any time.',
  },
  dashboard: {
    title: 'Dashboard studio · HomeScreen',
    eyebrow: 'DASHBOARD STUDIO',
    heading: 'Your dashboard',
    intro: 'Arrange your cards and make it yours. Preview your changes, then save them to your TVs.',
    privacy: 'Editing a design needs no additional Google permission. Choosing personal images asks for Google Photos access.',
  },
  settings: {
    title: 'TV settings · HomeScreen',
    eyebrow: 'TV SETTINGS',
    heading: 'Weather & activity',
    intro: 'Manage weather cities and activity goals with the Google account linked to your TVs.',
    privacy: 'Settings stay private to your linked Google account. Review or remove service connections in TVs & account.',
  },
  meals: {
    title: 'Connect your meal Sheet · HomeScreen',
    eyebrow: 'MEAL PLAN SETUP',
    heading: 'Meal plan',
    intro: 'Sign in with the Google account paired to your TV, then connect the Sheet you update with Gemini.',
    privacy: 'Google will ask you to approve Sheets access when you connect a meal plan. You can remove the connection here at any time.',
  },
  account: {
    title: 'TVs and account · HomeScreen',
    eyebrow: 'TVS & ACCOUNT',
    heading: 'TVs & account',
    intro: 'Manage each TV’s name, favorite apps, and access. Review connected services and your saved data.',
    privacy: 'Settings stay private to your linked Google account. Review or remove service connections in TVs & account.',
  },
};

export function companionPageForPath(path: string): CompanionPage {
  switch (path) {
    case '/': return 'dashboard';
    case '/polls': return 'polls';
    case '/dashboard': return 'dashboard';
    case '/settings': return 'settings';
    case '/meals': return 'meals';
    case '/account': return 'account';
    default: return 'pair';
  }
}

function siteNavigation(page: CompanionPage): string {
  const link = (target: CompanionPage, label: string, symbol: string) =>
    `<a href="/${target}" ${page === target ? 'aria-current="page"' : ''}><span class="nav-symbol" aria-hidden="true">${symbol}</span>${label}</a>`;
  return `<nav class="site-nav" aria-label="Companion site">
    <div class="nav-group"><p class="nav-label">Your home screen</p>${link('dashboard', 'Dashboard', '▦')}${link('polls', 'Polls', '◷')}</div>
    <div class="nav-group"><p class="nav-label">On your TV</p>${link('settings', 'Weather & goals', '☀')}${link('meals', 'Meals', '◉')}</div>
    <div class="nav-group nav-manage"><p class="nav-label">Manage</p>${link('account', 'TVs & account', '▣')}${link('pair', 'Connect a TV', '+')}</div>
  </nav>`;
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

function pageContent(page: CompanionPage): string {
  switch (page) {
    case 'polls': return '<section id="poll-manager" aria-label="Manage household polls"></section>';
    case 'pair': return pairingTemplate();
    case 'meals': return mealTemplate();
    case 'account': return accountTemplate();
    case 'dashboard': return '<section id="appearance-editor" class="appearance-editor" aria-label="Dashboard appearance"></section>';
    case 'settings': return '<section id="weather-editor" class="settings-panel" aria-label="Weather and activity settings"></section>';
  }
}

/** The shell renders only the active feature; each controller owns its controls. */
export function renderCompanionPage(root: HTMLElement, page: CompanionPage): void {
  const copy = PAGE_COPY[page];
  document.title = copy.title;
  const pairMode = page === 'pair';
  const dashboardMode = page === 'dashboard';
  root.innerHTML = `
  <a class="skip-link" href="#page-content">Skip to controls</a>
  <div class="layout companion-mode ${dashboardMode ? 'dashboard-mode' : ''} ${pairMode ? 'pair-mode' : ''}">
    <aside class="companion-sidebar">
      <a class="brand" href="/dashboard" aria-label="HomeScreen dashboard"><span class="brand-mark">H</span><span>HomeScreen<small>TV companion</small></span></a>
      ${siteNavigation(page)}
      <p class="sidebar-note">A little more home<br/>on your home screen.</p>
    </aside>
    <div class="companion-main">
      <header class="companion-topbar"><span class="topbar-label">Your home, connected</span>
      <div class="account-panel">
        <div class="account-copy"><strong id="account-name">Not signed in</strong></div>
        <button id="signin-button" class="button button-secondary" type="button">Sign in with Google</button>
        <button id="signout-button" class="button button-text" type="button" hidden>Switch account</button>
      </div>
      </header>
    <main class="card" aria-labelledby="page-title">
      <header class="page-heading"><p class="eyebrow">${copy.eyebrow}</p><h1 id="page-title">${copy.heading}</h1><p class="intro">${copy.intro}</p></header>
      ${!pairMode ? '' : `<div class="steps" aria-hidden="true"><span class="step active"><span class="step-number">1</span> Sign in</span><span class="step-rule"></span><span class="step"><span class="step-number">2</span> Enter code</span></div>`}
      <div id="page-content" tabindex="-1" class="page-workspace">
      <div class="page-primary">
      ${pairMode ? pageContent(page) : ''}
      <p id="status" class="status" role="status" aria-live="polite"></p>
      <a id="connected-next" class="mode-link" href="/dashboard" hidden>Design your dashboard from this device →</a>

      ${pairMode ? '' : pageContent(page)}
      </div>
      ${pageGuide(page)}
      </div>
      <div class="privacy-note"><span class="privacy-icon" aria-hidden="true">✦</span><span>${copy.privacy}</span></div>
    </main>
    <footer>HomeScreen <span>·</span> Made for your home</footer>
    </div>
  </div>
`;
}
