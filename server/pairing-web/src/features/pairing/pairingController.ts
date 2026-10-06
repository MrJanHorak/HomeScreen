import type {User} from 'firebase/auth';
import {requiredElement} from '../../shared/dom';
import type {StatusWriter} from '../../shared/dom';
import {googleAuthorizationUrl} from '../../shared/googleAuthorization';

export function createPairingController(root: HTMLElement, apiUrl: string,
  getUser: () => User | null, showStatus: StatusWriter, params: URLSearchParams) {
  const form = requiredElement<HTMLFormElement>(root, '#pair-form');
  const codeInput = requiredElement<HTMLInputElement>(root, '#pair-code');
  const connectButton = requiredElement<HTMLButtonElement>(root, '#connect-button');
  let busy = false;
  let generation = 0;
  const prefilledCode = (params.get('code') || '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
  if (prefilledCode.length === 6) codeInput.value = prefilledCode;
  if (prefilledCode.length === 6 && !params.has('result')) {
    showStatus('Code filled from the QR. Check that it matches your TV before connecting.');
  }

  function updateControls() {
    const signedIn = Boolean(getUser());
    connectButton.disabled = !signedIn || busy;
    codeInput.disabled = busy;
    root.querySelectorAll('.step').forEach((step, index) =>
      step.classList.toggle('active', signedIn ? index === 1 : index === 0));
  }

  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const user = getUser();
    const code = codeInput.value.trim().toUpperCase();
    if (!user) return showStatus('Sign in before entering your TV code.', 'error');
    if (busy) return;
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
      showStatus('Enter the six-character code displayed on your TV.', 'error');
      codeInput.focus();
      return;
    }
    const operation = generation;
    busy = true;
    updateControls();
    showStatus('Checking your TV code…');
    try {
      const token = await user.getIdToken();
      if (operation !== generation) return;
      const response = await fetch(`${apiUrl}/beginGoogleLink`, {
        method: 'POST', redirect: 'error',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({code}),
      });
      if (!response.ok) {
        if ([400, 404, 410].includes(response.status)) {
          throw new Error('That code is invalid or expired. Request a new code on your TV.');
        }
        if (response.status === 401) throw new Error('Your sign-in expired. Sign in again.');
        if (response.status === 429) throw new Error('Too many attempts. Please try again in 15 minutes.');
        throw new Error('Could not start pairing. Please try again.');
      }
      const body: unknown = await response.json();
      if (operation !== generation) return;
      window.location.assign(googleAuthorizationUrl(body, 'The server returned an invalid Google sign-in URL.'));
    } catch (error) {
      if (operation === generation) {
        showStatus(error instanceof Error ? error.message : 'Could not start pairing.', 'error');
        busy = false;
        updateControls();
      }
    }
  });

  function clear() {
    generation++;
    busy = false;
    updateControls();
  }
  return {load: updateControls, clear};
}
