import { FirebaseError, initializeApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import './style.css';
import { createAppearanceEditor } from './appearanceEditor';
import {createDeviceManager} from './deviceManager';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
// Keep the auth helper on the same origin as the pairing page for redirect sign-in.
if (window.location.hostname === `${config.projectId}.web.app` &&
    config.authDomain === `${config.projectId}.firebaseapp.com`) {
  window.location.replace(`https://${config.authDomain}${window.location.pathname}${window.location.search}${window.location.hash}`);
}
const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('Missing app root');
// Keep meal setup on its own path even if the phone browser drops a query string
// while returning from Firebase's Google sign-in redirect.
const initialUrl = new URL(window.location.href);
let returningToMeals = false;
let returningToDashboard = false;
try {
  returningToMeals = window.sessionStorage.getItem('homescreen:meal-signin') === '1';
  returningToDashboard = window.sessionStorage.getItem('homescreen:dashboard-signin') === '1';
} catch { /* Storage can be unavailable in some private browsers. */ }
if (initialUrl.pathname !== '/dashboard' && returningToDashboard && initialUrl.pathname === '/pair') {
  initialUrl.pathname = '/dashboard';
  window.history.replaceState({}, '', initialUrl);
} else if (initialUrl.pathname !== '/meals' &&
    (initialUrl.searchParams.get('mode') === 'meals' ||
      (initialUrl.pathname === '/pair' && returningToMeals))) {
  initialUrl.pathname = '/meals';
  initialUrl.searchParams.delete('mode');
  window.history.replaceState({}, '', initialUrl);
}
if (window.location.pathname === '/meals') {
  try { window.sessionStorage.removeItem('homescreen:meal-signin'); } catch { /* Ignore. */ }
}
if (window.location.pathname === '/dashboard') {
  try { window.sessionStorage.removeItem('homescreen:dashboard-signin'); } catch { /* Ignore. */ }
}
const params = new URLSearchParams(window.location.search);
const mealMode = window.location.pathname === '/meals';
const dashboardMode = window.location.pathname === '/dashboard';
document.title = dashboardMode ? 'Dashboard studio · HomeScreen' :
  mealMode ? 'Connect your meal Sheet · HomeScreen' : 'Pair your TV · HomeScreen';

appElement.innerHTML = `
  <main class="layout">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>
    <section class="card" aria-labelledby="page-title">
      <div class="brand"><span class="brand-mark">H</span><span>HomeScreen</span></div>
      <p class="eyebrow">${dashboardMode ? 'DASHBOARD STUDIO' : mealMode ? 'MEAL PLAN SETUP' : 'TV SETUP'} <span class="eyebrow-line"></span></p>
      <h1 id="page-title">${dashboardMode ? 'Shape your home screen.' : mealMode ? 'Connect your dinner plan.' : 'Bring your dashboard to the big screen.'}</h1>
      <p class="intro">${dashboardMode
    ? 'Sign in with the account linked to your TV to arrange its cards, colors, and background from your phone.'
    : mealMode
    ? 'Sign in with the Google account paired to your TV, then connect the Sheet you update with Gemini.'
    : 'Sign in on this device, then enter the code shown on your TV. Your Google password stays off the TV.'}</p>
      <nav class="site-nav" aria-label="Companion site"><a href="/pair" ${!mealMode && !dashboardMode ? 'aria-current="page"' : ''}>Pair TV</a><a href="/dashboard" ${dashboardMode ? 'aria-current="page"' : ''}>Design dashboard</a><a href="/meals" ${mealMode ? 'aria-current="page"' : ''}>Meal Sheet</a></nav>

      ${mealMode || dashboardMode ? '' : `<div class="steps" aria-hidden="true">
        <span class="step active"><span class="step-number">1</span> Sign in</span>
        <span class="step-rule"></span>
        <span class="step"><span class="step-number">2</span> Enter code</span>
      </div>`}

      <div class="account-panel">
        <div class="account-copy"><span class="field-label">GOOGLE ACCOUNT</span><strong id="account-name">Not signed in</strong></div>
        <button id="signin-button" class="button button-secondary" type="button">Sign in with Google</button>
        <button id="signout-button" class="button button-text" type="button" hidden>Switch account</button>
      </div>

      <form id="pair-form" novalidate ${mealMode || dashboardMode ? 'hidden' : ''}>
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

      <section class="meal-panel" aria-labelledby="meal-title" ${dashboardMode ? 'hidden' : ''}>
        <p class="field-label">OPTIONAL · MEAL PLAN</p>
        <h2 id="meal-title">Show dinner on your TV</h2>
        <p class="meal-copy">Connect the Google Sheet you update with Gemini. Add new weeks to the same Sheet and the TV will refresh automatically. Google will grant read access to your spreadsheets; HomeScreen reads only the link you choose.</p>
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
        <h2 id="account-controls-title">Manage saved data</h2>
        <p class="meal-copy">Every TV paired to this Google account shares its dashboard design and connections. Household invitations and public sharing are not enabled.</p>
        <div id="connection-status" class="connection-status" aria-live="polite">Checking connected services…</div>
        <p class="field-hint">Calendar and activity use read access. Tasks access also lets the TV complete tasks. Sheets access is read-only; Google Photos uses only photos you select.</p>
        <a class="mode-link" href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">Review Google permissions ↗</a>
        <section id="device-manager" class="device-manager" aria-label="Linked TVs"></section>
        <div class="account-actions">
          <button id="disconnect-photos-button" class="button button-text" type="button">Remove saved photos and sign out TVs</button>
          <button id="disconnect-google-button" class="button button-text" type="button">Disconnect Calendar, Tasks and activity; sign out TVs</button>
          <button id="revoke-button" class="button button-text" type="button">Sign out on every device</button>
          <button id="delete-account-button" class="button button-text danger" type="button">Delete account and saved data</button>
        </div>
        <p id="account-status" class="status" role="status" aria-live="polite"></p>
      </section>
      <div class="privacy-note"><span class="privacy-icon" aria-hidden="true">✦</span><span>${dashboardMode
    ? 'Dashboard design needs no additional Google permission. Only the linked account owner can manage these settings.'
    : mealMode
    ? 'Google will ask you to approve Sheets access when you connect a meal plan. You can remove the connection here at any time.'
    : 'Google will ask you to approve Calendar, Tasks, and activity access. You can revoke access in your Google account at any time.'}</span></div>
    </section>
    <footer>Private by design <span>·</span> Made for your TV</footer>
  </main>
`;

const accountName = document.querySelector<HTMLElement>('#account-name')!;
const signInButton = document.querySelector<HTMLButtonElement>('#signin-button')!;
const signOutButton = document.querySelector<HTMLButtonElement>('#signout-button')!;
const connectButton = document.querySelector<HTMLButtonElement>('#connect-button')!;
const codeInput = document.querySelector<HTMLInputElement>('#pair-code')!;
const pairForm = document.querySelector<HTMLFormElement>('#pair-form')!;
const status = document.querySelector<HTMLElement>('#status')!;
const connectedNext = document.querySelector<HTMLAnchorElement>('#connected-next')!;
const mealStatus = document.querySelector<HTMLElement>('#meal-status')!;
const mealAccessButton = document.querySelector<HTMLButtonElement>('#meal-access-button')!;
const mealForm = document.querySelector<HTMLFormElement>('#meal-form')!;
const mealUrl = document.querySelector<HTMLInputElement>('#meal-url')!;
const mealSaveButton = document.querySelector<HTMLButtonElement>('#meal-save-button')!;
const mealCurrent = document.querySelector<HTMLElement>('#meal-current')!;
const mealRemoveButton = document.querySelector<HTMLButtonElement>('#meal-remove-button')!;
const accountControls = document.querySelector<HTMLElement>('#account-controls')!;
const accountStatus = document.querySelector<HTMLElement>('#account-status')!;
const connectionStatus = document.querySelector<HTMLElement>('#connection-status')!;
const disconnectPhotosButton = document.querySelector<HTMLButtonElement>('#disconnect-photos-button')!;
const disconnectGoogleButton = document.querySelector<HTMLButtonElement>('#disconnect-google-button')!;
const revokeButton = document.querySelector<HTMLButtonElement>('#revoke-button')!;
const deleteAccountButton = document.querySelector<HTMLButtonElement>('#delete-account-button')!;
const prefilledCode = (params.get('code') || '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
if (prefilledCode.length === 6) codeInput.value = prefilledCode;

function showStatus(message: string, kind: 'info' | 'error' | 'success' = 'info') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function showMealStatus(message: string, kind: 'info' | 'error' | 'success' = 'info') {
  mealStatus.textContent = message;
  mealStatus.dataset.kind = kind;
}

function signInErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) return 'Google sign-in failed. Please try again.';
  switch (error.code) {
    case 'auth/unauthorized-domain':
      return `Add ${window.location.hostname} to Firebase Authentication authorized domains.`;
    case 'auth/operation-not-allowed':
      return 'Enable Google sign-in in Firebase Authentication sign-in methods.';
    case 'auth/network-request-failed':
      return 'Could not reach Firebase Authentication. Check your connection and try again.';
    case 'auth/web-storage-unsupported':
      return 'This browser blocks the storage needed for sign-in. Try Chrome or Safari.';
    case 'auth/invalid-credential':
      if (/invalid_client|client secret is invalid/i.test(error.message)) {
        return 'Google sign-in is misconfigured. The site owner must update the Google OAuth client ID and secret in Firebase Authentication.';
      }
      return 'Google sign-in could not verify your account. Please try again or contact the site owner.';
    default:
      return `Google sign-in failed (${error.code}). Please try again.`;
  }
}

if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId || !apiUrl) {
  showStatus('Site configuration is incomplete. Check pairing-web/.env.local and rebuild.', 'error');
  signInButton.disabled = true;
} else {
  const auth = getAuth(initializeApp(config));
  const provider = new GoogleAuthProvider();
  const editor = createAppearanceEditor(
    document.querySelector<HTMLElement>('#appearance-editor')!, apiUrl,
    async () => auth.currentUser ? auth.currentUser.getIdToken() : null,
  );
  const devices = createDeviceManager(
    document.querySelector<HTMLElement>('#device-manager')!, apiUrl,
    async () => auth.currentUser ? auth.currentUser.getIdToken() : null,
  );
  let busy = false;
  let mealsBusy = false;
  let mealsAuthorized = false;
  let currentSheet: string | null = null;
  let accountBusy = false;

  function showAccountStatus(message: string, kind: 'error' | 'success' = 'success') {
    accountStatus.textContent = message;
    accountStatus.dataset.kind = kind;
  }

  function updateControls() {
    const signedIn = Boolean(auth.currentUser);
    accountName.textContent = auth.currentUser?.email || (signedIn ? 'Signed in' : 'Not signed in');
    signInButton.hidden = signedIn;
    signOutButton.hidden = !signedIn;
    connectButton.disabled = !signedIn || busy;
    codeInput.disabled = busy;
    mealAccessButton.hidden = !signedIn || mealsAuthorized;
    mealAccessButton.disabled = !signedIn || mealsBusy;
    mealForm.hidden = !signedIn || !mealsAuthorized;
    mealUrl.disabled = mealsBusy;
    mealSaveButton.disabled = mealsBusy;
    mealCurrent.hidden = !signedIn || !currentSheet;
    mealCurrent.textContent = currentSheet ? `Connected: ${currentSheet}` : '';
    mealRemoveButton.hidden = !signedIn || !mealsAuthorized;
    mealRemoveButton.textContent = currentSheet ? 'Disconnect meal Sheet' : 'Remove Google Sheets access';
    mealRemoveButton.disabled = mealsBusy;
    accountControls.hidden = !signedIn;
    for (const button of [disconnectPhotosButton, disconnectGoogleButton, revokeButton, deleteAccountButton]) {
      button.disabled = accountBusy;
    }
  }

  async function mealRequest(path: string, method: 'GET' | 'PUT' | 'DELETE' | 'POST', body?: object) {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in before connecting a meal Sheet.');
    const response = await fetch(`${apiUrl}/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not connect the meal Sheet.');
    return result;
  }

  async function loadMealConfig() {
    if (!auth.currentUser) {
      mealsAuthorized = false;
      currentSheet = null;
      updateControls();
      return;
    }
    try {
      const result = await mealRequest('mealSheetConfig', 'GET') as {
        authorized: boolean; spreadsheetTitle: string | null;
      };
      mealsAuthorized = result.authorized;
      currentSheet = result.spreadsheetTitle;
      updateControls();
      if (params.get('result') === 'meals_connected') {
        showMealStatus('Google Sheets access is ready. Paste your meal Sheet link below.', 'success');
      }
    } catch (error) {
      showMealStatus(error instanceof Error ? error.message : 'Could not load meal settings.', 'error');
    }
  }

  async function loadConnections() {
    if (!auth.currentUser) return;
    try {
      const result = await mealRequest('accountSecurity', 'GET') as {
        connections: {dashboardGoogle: boolean; mealSheet: boolean; photos: boolean};
      };
      const entries = [
        ['Calendar, Tasks & activity', result.connections.dashboardGoogle],
        ['Google Sheets', result.connections.mealSheet],
        ['Google Photos', result.connections.photos],
      ] as const;
      connectionStatus.replaceChildren(...entries.map(([name, connected]) => {
        const item = document.createElement('div');
        item.className = 'connection-item';
        const title = document.createElement('span');
        title.textContent = name;
        const state = document.createElement('strong');
        state.textContent = connected ? 'Connected' : 'Not connected';
        state.dataset.connected = String(connected);
        item.append(title, state);
        return item;
      }));
    } catch {
      connectionStatus.textContent = 'Connection status is temporarily unavailable.';
    }
  }

  onAuthStateChanged(auth, () => {
    updateControls();
    void loadMealConfig();
    if (auth.currentUser) void loadConnections();
    else connectionStatus.textContent = 'Sign in to see connected services.';
    if (auth.currentUser) void devices.load();
    else devices.clear();
    if (dashboardMode) {
      if (auth.currentUser) void editor.load();
      else editor.clear();
    }
    if (auth.currentUser && !params.has('result')) {
      showStatus(dashboardMode ? 'Signed in. Edit your dashboard below.' : mealMode ? 'Signed in. Connect your meal Sheet below.' :
        'Signed in. Enter the code shown on your TV.');
    }
  }, (error) => {
    console.error('Firebase Auth state error:', error);
    showStatus(signInErrorMessage(error), 'error');
  });

  void getRedirectResult(auth).then((credential) => {
    if (credential && !params.has('result')) {
      showStatus(dashboardMode ? 'Signed in. Edit your dashboard below.' : mealMode ? 'Signed in. Connect your meal Sheet below.' :
        'Signed in. Enter the code shown on your TV.');
    }
  }).catch((error: unknown) => {
    console.error('Firebase redirect sign-in failed:', error);
    showStatus(signInErrorMessage(error), 'error');
  });

  signInButton.addEventListener('click', async () => {
    try {
      signInButton.disabled = true;
      showStatus('Redirecting to Google sign-in…');
      try {
        if (mealMode) window.sessionStorage.setItem('homescreen:meal-signin', '1');
        else window.sessionStorage.removeItem('homescreen:meal-signin');
        if (dashboardMode) window.sessionStorage.setItem('homescreen:dashboard-signin', '1');
        else window.sessionStorage.removeItem('homescreen:dashboard-signin');
      } catch { /* The /meals path still identifies the flow. */ }
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error('Firebase redirect sign-in failed:', error);
      showStatus(signInErrorMessage(error), 'error');
      signInButton.disabled = false;
    }
  });

  signOutButton.addEventListener('click', async () => {
    await signOut(auth);
    showStatus('Signed out. Choose the Google account you want on your TV.');
    showMealStatus('');
  });

  async function accountAction(
    action: 'disconnectPhotos' | 'disconnectGoogle' | 'signOutEverywhere' | 'deleteAccount',
    confirmation: string,
    success: string,
  ) {
    if (!window.confirm(confirmation)) return;
    accountBusy = true;
    updateControls();
    try {
      await mealRequest('accountSecurity', 'POST', {action});
      await signOut(auth);
      showStatus(success, 'success');
    } catch (error) {
      showAccountStatus(error instanceof Error ? error.message : 'Account action failed.', 'error');
    } finally {
      accountBusy = false;
      updateControls();
    }
  }

  disconnectPhotosButton.addEventListener('click', () => void accountAction(
    'disconnectPhotos', 'Remove selected photos, disconnect Photos, and sign out all TVs?',
    'Saved photos and Photos access removed. Sign in again to continue.',
  ));
  disconnectGoogleButton.addEventListener('click', () => void accountAction(
    'disconnectGoogle', 'Disconnect Calendar, Tasks and activity, and sign out all TVs?',
    'Google dashboard access removed. Pair again to reconnect.',
  ));
  revokeButton.addEventListener('click', () => void accountAction(
    'signOutEverywhere', 'Sign out every TV and browser session for this account?',
    'All sessions revoked. Sign in again to continue.',
  ));
  deleteAccountButton.addEventListener('click', () => void accountAction(
    'deleteAccount', 'Permanently delete your account, saved settings, photos and dashboard data?',
    'Account and saved data deleted.',
  ));

  mealAccessButton.addEventListener('click', async () => {
    mealsBusy = true;
    updateControls();
    showMealStatus('Opening Google permission screen…');
    try {
      const result = await mealRequest('beginGoogleMeals', 'POST') as {authorizationUrl: string};
      if (new URL(result.authorizationUrl).origin !== 'https://accounts.google.com') {
        throw new Error('The server returned an invalid Google permission URL.');
      }
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      showMealStatus(error instanceof Error ? error.message : 'Could not request Sheet access.', 'error');
      mealsBusy = false;
      updateControls();
    }
  });

  mealForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    mealsBusy = true;
    updateControls();
    showMealStatus('Checking your Sheet…');
    try {
      const result = await mealRequest('mealSheetConfig', 'PUT', {url: mealUrl.value.trim()}) as {
        spreadsheetTitle: string; mealCount: number;
      };
      currentSheet = result.spreadsheetTitle;
      mealUrl.value = '';
      void loadConnections();
      showMealStatus(`Connected ${result.mealCount} dated dinners. Your TV will refresh automatically.`, 'success');
    } catch (error) {
      showMealStatus(error instanceof Error ? error.message : 'Could not connect this Sheet.', 'error');
    } finally {
      mealsBusy = false;
      updateControls();
    }
  });

  mealRemoveButton.addEventListener('click', async () => {
    mealsBusy = true;
    updateControls();
    try {
      await mealRequest('mealSheetConfig', 'DELETE');
      currentSheet = null;
      mealsAuthorized = false;
      void loadConnections();
      showMealStatus('Meal Sheet disconnected and its stored access removed.', 'success');
    } catch (error) {
      showMealStatus(error instanceof Error ? error.message : 'Could not remove the Sheet.', 'error');
    } finally {
      mealsBusy = false;
      updateControls();
    }
  });

  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
  });

  pairForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    const code = codeInput.value.trim().toUpperCase();
    if (!user) {
      showStatus('Sign in before entering your TV code.', 'error');
      return;
    }
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
      showStatus('Enter the six-character code displayed on your TV.', 'error');
      codeInput.focus();
      return;
    }

    busy = true;
    updateControls();
    showStatus('Checking your TV code…');
    try {
      const response = await fetch(`${apiUrl}/beginGoogleLink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        if (response.status === 400 || response.status === 404 || response.status === 410) {
          throw new Error('That code is invalid or expired. Request a new code on your TV.');
        }
        if (response.status === 401) throw new Error('Your sign-in expired. Sign in again.');
        if (response.status === 429) throw new Error('Too many attempts. Please try again in 15 minutes.');
        throw new Error('Could not start pairing. Please try again.');
      }
      const body: unknown = await response.json();
      const authorizationUrl =
        typeof body === 'object' && body !== null && 'authorizationUrl' in body
          ? (body as { authorizationUrl: unknown }).authorizationUrl
          : null;
      if (typeof authorizationUrl !== 'string' ||
          new URL(authorizationUrl).origin !== 'https://accounts.google.com') {
        throw new Error('The server returned an invalid Google sign-in URL.');
      }
      window.location.assign(authorizationUrl);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : 'Could not start pairing.', 'error');
      busy = false;
      updateControls();
    }
  });

  const result = params.get('result');
  if (result === 'connected') {
    showStatus('TV connected. You can return to your TV now.', 'success');
    connectedNext.hidden = false;
  }
  if (result === 'denied') showStatus('Google access was not approved. You can try again.', 'error');
  if (result === 'expired') showStatus('The TV code expired. Request a new one on your TV.', 'error');
  if (result === 'error') showStatus('Pairing could not finish. Please request a new TV code.', 'error');
  if (result === 'meals_denied') showMealStatus('Google Sheets access was not approved.', 'error');
  if (result === 'meals_error') showMealStatus('Could not connect Google Sheets. Please try again.', 'error');
  if (result) window.history.replaceState({}, '', window.location.pathname);
  if (prefilledCode.length === 6 && !result) {
    showStatus('Code filled from the QR. Check that it matches your TV before connecting.');
  }
}
