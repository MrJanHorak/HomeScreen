import {initializeApp} from 'firebase/app';
import {getAuth, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithRedirect, signOut} from 'firebase/auth';
import {validatedApiUrl} from '../../../shared/src/transport';
import {companionPageForPath, renderCompanionPage} from './app/companionPage';
import {restoreSignInPath, rememberSignInPath} from './app/authNavigation';
import {signInErrorMessage} from './app/signInError';
import {requiredElement, statusWriter} from './shared/dom';
import {createAppearanceEditor} from './features/dashboard/appearanceEditor';
import {createWeatherEditor} from './features/weather/weatherEditor';
import {createPairingController} from './features/pairing/pairingController';
import {createMealController} from './features/meals/mealController';
import {createAccountController} from './features/account/accountController';
import './styles/style.css';
import {mountPollParticipant} from './features/polls/PollParticipant';
import {createPollManager} from './features/polls/PollManager';
import './styles/companion.css';

if (window.location.pathname.startsWith('/vote/')) {
  mountPollParticipant(requiredElement<HTMLDivElement>(document, '#app'), window.location.pathname.slice('/vote/'.length));
} else startCompanion();

function startCompanion() {

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const apiUrl = import.meta.env.VITE_API_URL ?
  validatedApiUrl(import.meta.env.VITE_API_URL, import.meta.env.DEV) : undefined;
// Keep the auth helper on the same origin as the pairing page for redirect sign-in.
if (window.location.hostname === `${config.projectId}.web.app` &&
    config.authDomain === `${config.projectId}.firebaseapp.com`) {
  window.location.replace(`https://${config.authDomain}${window.location.pathname}${window.location.search}${window.location.hash}`);
}

const app = requiredElement<HTMLDivElement>(document, '#app');
restoreSignInPath();
const page = companionPageForPath(window.location.pathname);
const params = new URLSearchParams(window.location.search);
renderCompanionPage(app, page);
const accountName = requiredElement(app, '#account-name');
const signInButton = requiredElement<HTMLButtonElement>(app, '#signin-button');
const signOutButton = requiredElement<HTMLButtonElement>(app, '#signout-button');
const showStatus = statusWriter(requiredElement(app, '#status'));

if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId || !apiUrl) {
  showStatus('Site configuration is incomplete. Check pairing-web/.env.local and rebuild.', 'error');
  signInButton.disabled = true;
} else {
  const auth = getAuth(initializeApp(config));
  const provider = new GoogleAuthProvider();
  const getUser = () => auth.currentUser;
  const getToken = async () => getUser()?.getIdToken() ?? null;
  const signOutAccount = () => signOut(auth);

  // Only the current page's feature owns DOM listeners and asynchronous work.
  const feature = (() => {
    switch (page) {
      case 'pair': return createPairingController(app, apiUrl, getUser, showStatus, params);
      case 'meals': return createMealController(app, apiUrl, getUser, params);
      case 'account': return createAccountController(app, apiUrl, getUser, signOutAccount, showStatus);
      case 'dashboard': return createAppearanceEditor(requiredElement(app, '#appearance-editor'), apiUrl, getToken);
      case 'settings': return createWeatherEditor(requiredElement(app, '#weather-editor'), apiUrl, getToken);
      case 'polls': return createPollManager(requiredElement(app, '#poll-manager'), apiUrl, getToken);
    }
  })();

  function showSignedInStatus() {
    if (params.has('result')) return;
    showStatus(page === 'pair' ? 'Signed in. Enter the code shown on your TV.' :
      page === 'meals' ? 'Signed in. Connect your meal Sheet below.' : '');
  }

  let previousUserId: string | null | undefined;
  onAuthStateChanged(auth, () => {
    const user = getUser();
    const userId = user?.uid ?? null;
    if (previousUserId !== undefined && previousUserId !== userId) feature.clear();
    previousUserId = userId;
    accountName.textContent = user?.email || (user ? 'Signed in' : 'Not signed in');
    signInButton.hidden = Boolean(user);
    signOutButton.hidden = !user;
    if (user) {
      void feature.load();
      showSignedInStatus();
    }
  }, (error) => {
    console.error('Firebase Auth state error:', error);
    showStatus(signInErrorMessage(error), 'error');
  });

  void getRedirectResult(auth).then((credential) => {
    if (credential) showSignedInStatus();
  }).catch((error: unknown) => {
    console.error('Firebase redirect sign-in failed:', error);
    showStatus(signInErrorMessage(error), 'error');
  });

  signInButton.addEventListener('click', async () => {
    try {
      signInButton.disabled = true;
      showStatus('Redirecting to Google sign-in…');
      rememberSignInPath(page);
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error('Firebase redirect sign-in failed:', error);
      showStatus(signInErrorMessage(error), 'error');
      signInButton.disabled = false;
    }
  });

  signOutButton.addEventListener('click', async () => {
    try {
      await signOutAccount();
      showStatus('Signed out. Choose the Google account you want on your TV.');
    } catch (error) {
      showStatus(signInErrorMessage(error), 'error');
    }
  });

  const result = params.get('result');
  if (result === 'connected') {
    showStatus('TV connected. You can return to your TV now.', 'success');
    requiredElement(app, '#connected-next').hidden = false;
  }
  if (result === 'denied') showStatus('Google access was not approved. You can try again.', 'error');
  if (result === 'expired') showStatus('The TV code expired. Request a new one on your TV.', 'error');
  if (result === 'error') showStatus('Pairing could not finish. Please request a new TV code.', 'error');
  if (result) window.history.replaceState({}, '', window.location.pathname);
}
}
