/** Public site links contain no pairing secret or account credentials. */
export function companionSiteUrl(
  path: '/dashboard' | '/meals',
  serverUrl?: string,
): string | null {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const base =
    serverUrl ||
    process.env.EXPO_PUBLIC_PAIRING_URL ||
    (projectId ? `https://${projectId}.firebaseapp.com/pair` : null);
  if (!base) return null;
  try {
    const url = new URL(path, base);
    if (url.username || url.password) return null;
    if (
      url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      )
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}
