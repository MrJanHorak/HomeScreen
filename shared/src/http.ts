/** Retain the status code so callers can handle conflicts and expired sessions. */
export class HttpRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

/** Read JSON and prefer a server error message when one is available. */
export async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new HttpRequestError(fallbackMessage, response.status);
  }

  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body &&
      typeof body.error === 'string' && body.error ? body.error : fallbackMessage;
    throw new HttpRequestError(message, response.status);
  }

  // Endpoint types describe the API contract; validate untrusted fields at the boundary when needed.
  return body as T;
}
