import {FirebaseError} from 'firebase/app';

export function signInErrorMessage(error: unknown): string {
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
