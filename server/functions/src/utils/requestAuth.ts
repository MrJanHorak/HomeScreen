import {Request} from "firebase-functions/v2/https";
import {auth} from "./db";

/** The caller's Firebase UID is the only accepted user identity. */
export async function authenticatedUserId(req: Request): Promise<string | null> {
  const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || "");
  if (!match) return null;

  return verifiedUserId(match[1]);
}

export async function verifiedUserId(idToken: string): Promise<string | null> {
  try {
    // Rejected after sign-out-everywhere or account deletion, including an
    // otherwise unexpired one-hour ID token.
    const decoded = await auth.verifyIdToken(idToken, true);
    return decoded.uid;
  } catch {
    return null;
  }
}
