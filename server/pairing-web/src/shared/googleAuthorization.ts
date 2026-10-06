/** Never navigate to an arbitrary URL returned by an authorization endpoint. */
export function googleAuthorizationUrl(body: unknown, message: string): string {
  const value = typeof body === 'object' && body !== null && 'authorizationUrl' in body
    ? body.authorizationUrl : null;
  if (typeof value === 'string') {
    try {
      if (new URL(value).origin === 'https://accounts.google.com') return value;
    } catch { /* Use the same error for missing, malformed, and untrusted URLs. */ }
  }
  throw new Error(message);
}
