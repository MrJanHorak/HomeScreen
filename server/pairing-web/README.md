# TV pairing site

This small TypeScript/Vite app lives beside the Cloud Functions under `server/` because both deploy to the same Firebase project. Firebase Hosting serves it at `/pair`; the Hosting root redirects there for easier typing. The TV also displays a QR link containing its six-character code, which this page pre-fills for the user. The QR does **not** include the private TV poll secret.

The [TV app README](../../HomeScreen/README.md) shows the current dashboard and settings screenshots. This site handles account pairing, dashboard appearance, and the optional meal Sheet connection; personal photo selection starts from the TV's Background or Ambient settings.

## Design the dashboard from a phone

Open `/dashboard` on the same Hosting domain and sign in with the Google account paired to the TV. Choose a layout and palette, set an accent or solid background color, and select an arrangement:

- **Automatic rows:** drag cards to reorder them or use the arrow buttons. Show/hide cards and choose Normal/Wide widths.
- **Free layout:** drag cards around a 12-by-6 canvas, drop one onto another to swap their positions and sizes, or drag a lower-right corner to resize. Select a card to enter its column, row, width, and height; keyboard arrow keys also move a focused card. Cards snap to whole cells and stay inside the dashboard. Minimum card size is 3 columns by 2 rows. Show/hide controls add cards into available space without moving existing cards. Choosing a starting preset resets the arrangement.

**Save to TV** publishes the account's shared appearance settings; a running TV checks for changes about every 45 seconds. Editing autosaves a private account draft after a 1.5-second pause, and **Save draft** saves immediately. Returning to the studio recovers that draft. The draft status reports pending or failed saves; leaving with unpersisted edits prompts the browser's standard warning. All TVs paired to that account share the published settings.

**Undo/Redo** keeps the last 100 edits for the current page session. **Saved designs and published history** stores up to 20 named designs and the latest 30 successful publishes, including TV settings changes. Save as new design, Load, Replace, and Delete manage the library. **Restore to draft** loads a published revision for review; **Save to TV** is still required to publish it. Photos are references to the current saved TV photo selection, not archived copies of images.

If another device changed settings, the server rejects a stale publish and leaves the draft visible. A recovered draft keeps its original base revision. **Discard changes** clears the account draft and loads the latest published settings; it does not delete designs or history. Library changes also use revision checks. After a library conflict, **Refresh designs and history** retains page edits and reloads the library; **Save draft** explicitly keeps those edits, or **Discard changes** returns to the published settings. Undo history resets on reload/sign-out; drafts and designs persist in the account. Signing out clears the editor's account data from the page.

The canvas previews positions and colors, with labels instead of personal widget data or exact TV content. The TV scales the grid to its card area and adapts content to width and height: tall cards show additional events/tasks/meals, while short cards keep the essentials. All cards keep their full detail views. The saved Google background appears in the preview when selected. The header and favorite apps are not movable. Older TV builds show the fallback row arrangement; deploy the updated backend/site and distribute the updated TV app for free placement and card styles. See the [layout contract](DASHBOARD_LAYOUT.md).

### Personalize each card

Open **Card style** to set border thickness (0–4 px) and corner radius (0–32 px) while keeping the theme surface. Disable **Use theme surface** to also
choose a background color and opacity (0–100%). The preview changes immediately;
**Save to TV** applies the settings to both row and grid layouts. Opacity affects
the background surface, not the text or artwork. Themed foregrounds adjust to the
estimated composite color; contrast over a translucent photograph depends on
the image beneath it. Re-enable **Use theme surface** to restore the palette's
surface for that card. Layout presets keep these styles. Typography, spacing
controls remain future work.

### View photos saved for the TV

**Photo zoom** adjusts dashboard framing from 100–150%. The default 105% applies a
slight centered crop; increase it to hide borders embedded in a selected photo,
or use 100% for the normal screen-covering fit. The preview and TV use the same
zoom. This does not edit the saved image or change ambient slideshow framing.

The **Saved photos for your TV** panel below the save actions shows the saved dashboard background and
up to eight selected gallery images. Tap a thumbnail for a larger view; use
**Refresh saved photos** after making a new TV selection. **Selected Google photo**
uses the saved background and previews it behind the cards. The site reads only
the saved account images using authenticated `googlePhotosPicker?action=background`
and `action=gallery` calls; it does not browse the user's Google Photos library or
request another OAuth scope. New photo selection still starts from the TV picker.
Signing out clears the images from the page.

The signed-in site also shows whether Calendar/Tasks/activity, Sheets, and Photos are connected and explains their access. Account controls can remove connections or revoke sessions. Household invitations and separate per-TV configurations are not implemented yet.

## Return to the site and manage TVs

On the TV, open **Settings → Companion site** and scan the permanent QR code, or type the displayed address on a phone or computer. The code opens `/dashboard` without a pairing code or credentials and still requires Google sign-in. Its canonical address comes from the backend's `PAIRING_URL`; the TV's configured public site is the fallback.

Under **Linked TVs**, rename a TV (up to 40 characters) or remove its access. A running TV normally signs out on its next appearance refresh, within about a minute; an offline TV is blocked when it reconnects. Removing one managed TV preserves the owner's browser session and other TVs. Older TV sessions register automatically when the updated TV app connects. **Sign out on every device** still covers older app builds.

For the next layout, sharing, and widget milestones, see [companion roadmap](COMPANION_ROADMAP.md).

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

Hosting also runs the web build before a Hosting deploy. `../firestore.rules` is the deny-all client policy for this repo, which accesses Firestore only through Cloud Functions. Review and merge it with any rules used by other apps on the Firebase project before deploying Firestore rules.

For local UI work, run `npm run dev` from `server/pairing-web`. The full OAuth round trip also needs a registered callback URI and matching `PAIRING_URL` for that environment.

The draft/design/history milestone requires deploying both `appearanceStudio` and the updated `userAppearance` function with Hosting. It keeps the existing TV API and needs no TV rebuild. Data is scoped to the authenticated owner and removed by the existing recursive account deletion. No Firestore rules change or migration is required.

Studio browser regression tests use a local Vite fixture with mocked authenticated APIs, without Google sign-in or production writes. With Playwright and its Chromium runtime available, start Vite and run `node --test test/appearanceEditor.test.cjs`. `STUDIO_TEST_URL` can override `http://127.0.0.1:5173`; `NODE_PATH` can point to bundled Playwright packages, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an installed headless Chromium. The fixture is outside the production bundle. Backend tests run with `npm --prefix ../functions test`.

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

## Select personal photos on the TV

Open **Settings → Background** or **Settings → Ambient → Google Photos** on the TV. After connecting Google Photos, scan the picker QR code with a phone signed into the same Google account and choose up to eight photos. The TV saves the selection for its background or ambient slideshow. Picker links are single-use and expire; use **New QR code** on the TV if a link no longer opens.

This flow uses the Cloud Functions `beginGooglePhotos`, `googleOAuthCallback`, and `googlePhotosPicker` endpoints. It requires the Google Photos Picker API and the `photospicker.mediaitems.readonly` scope configured for the OAuth client; see the [backend setup](../functions/README.md). Photos are selected in Google's picker, not uploaded through this pairing site's `/pair` page.

The signed-in pairing page also has account controls to remove stored photos, disconnect Calendar/Tasks/activity, sign out all devices, or delete the account and saved data. See [security and retention setup](../SECURITY.md) before enabling these actions in production.
