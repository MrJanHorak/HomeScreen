# TV pairing site

This small TypeScript/Vite app lives beside the Cloud Functions under `server/` because both deploy to the same Firebase project. Firebase Hosting serves it at `/pair`; the Hosting root redirects there for easier typing. The TV also displays a QR link containing its six-character code, which this page pre-fills for the user. The QR does **not** include the private TV poll secret.

## Setup

1. Copy `env.example` to `.env.local` and use the Firebase **web app** config from Project settings. `VITE_API_URL` is the Cloud Functions base URL without a trailing function name. These `VITE_` values are public and bundled into the site. Never put `GOOGLE_CLIENT_SECRET` or `TOKEN_ENCRYPTION_KEY` here.
2. In Firebase Authentication, enable Google sign-in and authorize the Hosting domain (and `localhost` for local testing).
3. In Google Cloud, configure the OAuth consent screen, enable Calendar, Tasks, and Fitness APIs, and create a **Web application** OAuth client. Set its authorized redirect URI to the exact `GOOGLE_REDIRECT_URI`, for example `https://us-central1-tv-homescreen-backend.cloudfunctions.net/googleOAuthCallback`. Add your account as a test user if the consent screen is in testing mode.
4. In `server/functions/.env`, set `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`, and `PAIRING_URL=https://tv-homescreen-backend.web.app/pair`. Provision `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, and `OPENWEATHER_API_KEY` with `firebase functions:secrets:set`.

## Build and deploy

From `server/`:

```bash
npm --prefix pairing-web install
npm --prefix pairing-web run build
firebase deploy --only functions,hosting
```

Hosting also runs the web build before a Hosting deploy. `../firestore.rules.example` shows a deny-all client policy for this repo, which accesses Firestore only through Cloud Functions. Review and merge it with any rules used by other apps on the Firebase project before deploying Firestore rules.

For local UI work, run `npm run dev` from `server/pairing-web`. The full OAuth round trip also needs a registered callback URI and matching `PAIRING_URL` for that environment.

## Pairing flow

1. The TV requests a code and privately keeps a separate poll secret.
2. The user scans the QR or opens the Hosting domain, signs in with Google, and confirms the displayed code.
3. Google consent redirects to the Cloud Function callback. The server verifies OAuth state, the Google identity, and the still-pending TV code before storing encrypted access and refresh tokens.
4. The TV receives a one-time Firebase custom token through its authenticated poll secret and signs in.

The existing Google Fit REST integration has an announced end-of-2026 support limit. Plan a move to Google Health API or Health Connect for activity data.
