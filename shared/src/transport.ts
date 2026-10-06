/** Bearer credentials may leave the client only over TLS, except local development. */
export function validatedApiUrl(value: string, allowLocalHttp = false): string {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(allowLocalHttp && local && url.protocol === 'http:')) ||
    url.username || url.password || url.search || url.hash) {
    throw new Error('Configure an HTTPS API URL before using HomeScreen.');
  }
  return url.toString().replace(/\/$/, '');
}
