import { google } from "googleapis";
import { GoogleTokens } from "../types";

/**
 * Creates and configures an authenticated OAuth2 client for Google APIs
 */
export function getOAuth2Client(tokens: GoogleTokens) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground";

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    id_token: tokens.idToken,
    expiry_date: tokens.expiryDate,
    scope: tokens.scope,
  });

  return oauth2Client;
}
