import type {CompanionPage} from './companionPage';

/** Recover the originating flow when the sign-in helper returns to /pair. */
export function restoreSignInPath(): void {
  const url = new URL(window.location.href);
  let returnPath: string | null = null;
  let returningToMeals = false;
  let returningToDashboard = false;
  try {
    returnPath = window.sessionStorage.getItem('homescreen:signin-path');
    returningToMeals = window.sessionStorage.getItem('homescreen:meal-signin') === '1';
    returningToDashboard = window.sessionStorage.getItem('homescreen:dashboard-signin') === '1';
    window.sessionStorage.removeItem('homescreen:signin-path');
  } catch { /* Private browsers may block storage; the URL still identifies the flow. */ }

  if (url.pathname === '/pair' && (returnPath === '/settings' || returnPath === '/account')) {
    url.pathname = returnPath;
  }
  if (url.pathname === '/pair' && returningToDashboard) {
    url.pathname = '/dashboard';
  } else if (url.pathname !== '/meals' &&
      (url.searchParams.get('mode') === 'meals' || (url.pathname === '/pair' && returningToMeals))) {
    url.pathname = '/meals';
    url.searchParams.delete('mode');
  }
  window.history.replaceState({}, '', url);

  try {
    if (url.pathname === '/meals') window.sessionStorage.removeItem('homescreen:meal-signin');
    if (url.pathname === '/dashboard') window.sessionStorage.removeItem('homescreen:dashboard-signin');
  } catch { /* The recovered route works without storage. */ }
}

export function rememberSignInPath(page: CompanionPage): void {
  try {
    window.sessionStorage.setItem('homescreen:signin-path', window.location.pathname);
    for (const flow of ['meals', 'dashboard'] as const) {
      const key = `homescreen:${flow === 'meals' ? 'meal' : flow}-signin`;
      if (page === flow) window.sessionStorage.setItem(key, '1');
      else window.sessionStorage.removeItem(key);
    }
  } catch { /* The current path still identifies the flow when storage is blocked. */ }
}
