# TV pairing site

This small TypeScript/Vite app lives beside the Cloud Functions under `server/` because both deploy to the same Firebase project. Firebase Hosting serves it at `/pair`; the Hosting root redirects there for easier typing. The TV also displays a QR link containing its six-character code, which this page pre-fills for the user. The QR does **not** include the private TV poll secret.

## Setup

1. Copy `env.example` to `.env.local` and use the Firebase **web app** config from Project settings. `VITE_API_URL` is the Cloud Functions base URL without a trailing function name. These `VITE_` values are public and bundled into the site. Never put `GOOGLE_CLIENT_SECRET` or `TOKEN_ENCRYPTION_KEY` here.
2. In Firebase Authentication, enable Google sign-in and authorize `tv-homescreen-backend.firebaseapp.com` (and `localhost` for local testing). Use the `firebaseapp.com` address as the public pairing link so redirect sign-in works on phones and computers. The `web.app` alias forwards there.
3. In Google Cloud, configure the OAuth consent screen, enable Calendar, Tasks, and Fitness APIs, and create a **Web application** OAuth client. Set its authorized redirect URI to the exact `GOOGLE_REDIRECT_URI`, for example `https://us-central1-tv-homescreen-backend.cloudfunctions.net/googleOAuthCallback`. Add your account as a test user if the consent screen is in testing mode.
4. In `server/functions/.env`, set `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`, and `PAIRING_URL=https://tv-homescreen-backend.firebaseapp.com/pair`. Provision `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, and `OPENWEATHER_API_KEY` with `firebase functions:secrets:set`.

## Build and deploy

From `server/`:

```bash
npm --prefix pairing-web install
npm --prefix pairing-web run build
firebase deploy --only functions,hosting
```

Hosting also runs the web build before a Hosting deploy. `../firestore.rules.example` shows a deny-all client policy for this repo, which accesses Firestore only through Cloud Functions. Review and merge it with any rules used by other apps on the Firebase project before deploying Firestore rules.

For local UI work, run `npm run dev` from `server/pairing-web`. The full OAuth round trip also needs a registered callback URI and matching `PAIRING_URL` for that environment.

## Google sign-in returns `auth/invalid-credential`

If the browser console reports `invalid_client` and `The provided client secret is invalid` after returning from Google, the failing exchange is Firebase Authentication's Google provider at `https://tv-homescreen-backend.firebaseapp.com/__/auth/handler`. In Firebase Console > Authentication > Sign-in method > Google, make sure its Web SDK client ID and secret are the matching pair from the **same Web application OAuth client** in Google Cloud Console > APIs & Services > Credentials. That client must allow `https://tv-homescreen-backend.firebaseapp.com/__/auth/handler` as an authorized redirect URI. Save the provider settings and retry sign-in. Firebase's [Authentication troubleshooting guide](https://firebase.google.com/docs/auth/faq-and-troubleshooting) also recommends disabling and re-enabling the Google provider when its OAuth client configuration is invalid.

This is separate from `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` used by `googleOAuthCallback` for the later Calendar, Tasks, and activity consent step. Do not put either secret in `pairing-web/.env.local` or the browser bundle. Changing the Firebase Authentication provider does not require rebuilding this site.

## Pairing flow

1. The TV requests a code and privately keeps a separate poll secret.
2. The user scans the QR or opens the Hosting domain, signs in with Google, and confirms the displayed code.
3. Google consent redirects to the Cloud Function callback. The server verifies OAuth state, the Google identity, and the still-pending TV code before storing encrypted access and refresh tokens.
4. The TV receives a one-time Firebase custom token through its authenticated poll secret and signs in.

## Connect a meal Sheet

1. Enable the Google Sheets API in the same Google Cloud project. Add the
   `https://www.googleapis.com/auth/spreadsheets.readonly` scope to the OAuth
   consent screen before releasing this feature to users.
2. Open `/meals` on the pairing site's domain on a phone or computer and sign in with the same
   Google account as the TV. Choose **Allow Google Sheets
   access**, then paste the Sheet's normal `docs.google.com/spreadsheets/d/...`
   link. The account must have access to that Sheet. No public link is needed.
   A paired TV also shows the `/meals` QR code under **Settings → Meals**.
3. Keep adding future weeks to the same workbook. The TV's dinner card refreshes
   with the dashboard (currently every five minutes). **Disconnect meal Sheet**
   removes the stored Sheet selection and meal OAuth token from this app.

The reader finds a visible tab with `Meal`, `Menu`, or `Week` in its name (or
the first visible tab) and expects a header row near the top. It requires
`Date` and `Meal_Name` (also accepts `Main`, `Meal`, or `Dinner`). It also reads
`Servings`, `Recipe_ID`, and `Notes/Prep_Style` from the current workbook.
Dates must be actual Google Sheets dates or `YYYY-MM-DD` text. Empty or past
dates do not appear as upcoming dinners on the TV. Other tabs, including
recipes and groceries, are not displayed by the current card.

This optional connection uses Sheets read-only consent, which Google defines
as access to all spreadsheets on that account. The backend reads only the
Sheet URL that the user selects. Review OAuth verification and narrower
file-selection alternatives before a public launch.

The existing Google Fit REST integration has an announced end-of-2026 support limit. Plan a move to Google Health API or Health Connect for activity data.
