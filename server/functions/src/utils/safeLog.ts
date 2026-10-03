/** Provider errors can carry request headers or URLs. Log only safe diagnostics. */
export function logSafeError(label: string, error: unknown): void {
  const candidate = error as {code?: unknown; response?: {status?: unknown}; status?: unknown};
  const code = candidate?.response?.status ?? candidate?.status ?? candidate?.code;
  console.error(label, {code: typeof code === "number" || typeof code === "string" ?
    String(code).slice(0, 50) : "unknown"});
}
