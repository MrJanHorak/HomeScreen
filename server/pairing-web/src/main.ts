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

appElement.innerHTML = `
  <main class="layout">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>
    <section class="card" aria-labelledby="page-title">
      <div class="brand"><span class="brand-mark">H</span><span>HomeScreen</span></div>
      <p class="eyebrow">TV SETUP <span class="eyebrow-line"></span> 01 / 02</p>
      <h1 id="page-title">Bring your dashboard to the big screen.</h1>
      <p class="intro">Sign in on this device, then enter the code shown on your TV. Your account details stay off the TV.</p>

      <div class="steps" aria-hidden="true">
        <span class="step active"><span class="step-number">1</span> Sign in</span>
        <span class="step-rule"></span>
        <span class="step"><span class="step-number">2</span> Enter code</span>
      </div>

      <div class="account-panel">
        <div class="account-copy"><span class="field-label">GOOGLE ACCOUNT</span><strong id="account-name">Not signed in</strong></div>
        <button id="signin-button" class="button button-secondary" type="button">Sign in with Google</button>
        <button id="signout-button" class="button button-text" type="button" hidden>Switch account</button>
      </div>

      <form id="pair-form" novalidate>
        <label class="field-label" for="pair-code">CODE ON YOUR TV</label>
        <input id="pair-code" name="code" type="text" inputmode="text" autocomplete="one-time-code"
          autocapitalize="characters" spellcheck="false" maxlength="6" placeholder="A7K9W2" required />
        <p class="field-hint">Six characters. The code expires after 15 minutes.</p>
        <button id="connect-button" class="button button-primary" type="submit" disabled>
          Connect TV <span aria-hidden="true">↗</span>
        </button>
      </form>

      <p id="status" class="status" role="status" aria-live="polite"></p>
      <div class="privacy-note"><span class="privacy-icon" aria-hidden="true">✦</span><span>Google will ask you to approve Calendar, Tasks, and activity access. You can revoke access in your Google account at any time.</span></div>
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
const params = new URLSearchParams(window.location.search);
const prefilledCode = (params.get('code') || '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
if (prefilledCode.length === 6) codeInput.value = prefilledCode;

function showStatus(message: string, kind: 'info' | 'error' | 'success' = 'info') {
  status.textContent = message;
  status.dataset.kind = kind;
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
  let busy = false;

  function updateControls() {
    const signedIn = Boolean(auth.currentUser);
    accountName.textContent = auth.currentUser?.email || (signedIn ? 'Signed in' : 'Not signed in');
    signInButton.hidden = signedIn;
    signOutButton.hidden = !signedIn;
    connectButton.disabled = !signedIn || busy;
    codeInput.disabled = busy;
  }

  onAuthStateChanged(auth, () => {
    updateControls();
    if (auth.currentUser && !params.has('result')) {
      showStatus('Signed in. Enter the code shown on your TV.');
    }
  }, (error) => {
    console.error('Firebase Auth state error:', error);
    showStatus(signInErrorMessage(error), 'error');
  });

  void getRedirectResult(auth).then((credential) => {
    if (credential && !params.has('result')) {
      showStatus('Signed in. Enter the code shown on your TV.');
    }
  }).catch((error: unknown) => {
    console.error('Firebase redirect sign-in failed:', error);
    showStatus(signInErrorMessage(error), 'error');
  });

  signInButton.addEventListener('click', async () => {
    try {
      signInButton.disabled = true;
      showStatus('Redirecting to Google sign-in…');
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
  if (result === 'connected') showStatus('TV connected. You can return to your TV now.', 'success');
  if (result === 'denied') showStatus('Google access was not approved. You can try again.', 'error');
  if (result === 'expired') showStatus('The TV code expired. Request a new one on your TV.', 'error');
  if (result === 'error') showStatus('Pairing could not finish. Please request a new TV code.', 'error');
  if (result) window.history.replaceState({}, '', window.location.pathname);
  if (prefilledCode.length === 6 && !result) {
    showStatus('Code filled from the QR. Check that it matches your TV before connecting.');
  }
}
