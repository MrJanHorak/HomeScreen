/** Read-only account-link check for a separately authorized Google Health client. */
export type HealthConnectionStatus = "linked" | "not_linked" | "unauthorized" | "unavailable";

export async function checkGoogleHealthConnection(client: {request: (options: {
  url: string; method: "GET"; timeout: number;
}) => Promise<{data: unknown}>}): Promise<HealthConnectionStatus> {
  try {
    const response = await client.request({url: "https://health.googleapis.com/v4/users/me/identity",
      method: "GET", timeout: 15000});
    const data = response.data as {healthUserId?: unknown} | null;
    return typeof data?.healthUserId === "string" && /^[A-Za-z0-9-]{1,63}$/.test(data.healthUserId) ?
      "linked" : "unavailable";
  } catch (error) {
    // Inspect only structured fields; never log or return the error, token, or identity.
    const response = (error as {response?: {status?: unknown; data?: {error?: {
      details?: Array<{reason?: unknown}>;
    }}}})?.response;
    if (response?.status === 400 && Array.isArray(response.data?.error?.details) &&
        response.data.error.details.some((detail) => detail?.reason === "ACCOUNT_NOT_LINKED")) return "not_linked";
    if (response?.status === 401 || response?.status === 403) return "unauthorized";
    return "unavailable";
  }
}
