# TV pairing site

This small TypeScript/Vite app lives beside the Cloud Functions under `server/` because both deploy to the same Firebase project. Firebase Hosting serves it at `/pair`; the Hosting root redirects there for easier typing. The TV also displays a QR link containing its six-character code, which this page pre-fills for the user. The QR does **not** include the private TV poll secret.

The [TV app README](../../HomeScreen/README.md) shows the current dashboard and settings screenshots. The companion handles pairing, dashboard appearance, ambient settings, weather cities, Google Photos selection, meal Sheets, and per-TV favorite apps. All five pages adapt from phones to tablets and laptops. See the [UX review and settings coverage](UX_REVIEW.md) for the design assessment and release checks.

## Weather, ambient, and favorite apps

Open **Weather & goals** (`/settings`) to add up to 20 cities, select the active city, make a city the default, remove cities, and adjust activity targets. Keep at least one city. **Save settings to TVs** publishes these account preferences separately from dashboard drafts. The updated TV app syncs the list and active/default selections every 45 seconds. Transactional revision checks reject stale saves while retaining companion edits. Existing local TV cities import only when the account has no stored list.

Under **Dashboard → Ambient mode**, set on/off, idle delay, photo source and timing, plasma presets or individual colors, information visibility, and rotation timing. These edits participate in the existing dashboard draft, undo, design, and publish flow. Use **Save to TV** to apply them. Preview ambient mode on the TV.

Under **TVs & account** (`/account`), open **Favorite apps** for a linked TV to show/hide its app row, select installed apps, and reorder favorites. **Save favorite apps** affects only that TV. The updated Android TV app reports its installed app names and packages, imports its local favorites when no cloud record exists, and checks for changes every 45 seconds. App icons stay on the TV. Keep the TV online and use **Reload TV apps** after installing or removing apps. TV naming, individual access removal, connections, and destructive account actions live on this page too.

## Design the dashboard from a phone

Open `/dashboard` on the same Hosting domain and sign in with the Google account paired to the TV. Choose a layout and palette, set an accent or solid background color, and select an arrangement:

- **Automatic rows:** drag cards to reorder them or use the arrow buttons. Show/hide cards and choose Normal/Wide widths.
- **Free layout:** drag cards around a 12-by-6 canvas, drop one onto another to swap their positions and sizes, or drag a lower-right corner to resize. Select a card to enter its column, row, width, and height; keyboard arrow keys also move a focused card. Cards snap to whole cells and stay inside the dashboard. Minimum card size is 3 columns by 2 rows. Show/hide controls add cards into available space without moving existing cards. Choosing a starting preset resets the arrangement.

**Save to TV** publishes the account's shared appearance settings; a running TV checks for changes about every 45 seconds. Editing autosaves a private account draft after a 1.5-second pause, and **Save draft** saves immediately. Returning to the studio recovers that draft. The draft status reports pending or failed saves; leaving with unpersisted edits prompts the browser's standard warning. All TVs paired to that account share the published settings.

**Undo/Redo** keeps the last 100 edits for the current page session. **Saved designs and published history** stores up to 20 named designs and the latest 30 successful publishes, including TV settings changes. Save as new design, Load, Replace, and Delete manage the library. **Restore to draft** loads a published revision for review; **Save to TV** is still required to publish it. Photos are references to the current saved TV photo selection, not archived copies of images.

This section also offers **Delete draft** for the single active draft, **Delete** on each published history entry, and **Clear history** with confirmation. History cleanup keeps named designs, the active draft, and current TV settings. Deleting the draft returns the editor to the latest TV settings. History changes on another device require a refresh before retrying cleanup. Future publishes add new entries without restoring deleted history.

If another device saved settings since a draft began, the server rejects a stale publish and leaves the draft visible. A recovered draft keeps its original base revision, so refreshing the browser or reopening the QR link does not resolve that conflict. **Review newer TV settings** lists the areas where the draft differs from the published design. **Keep my draft** updates its base revision without publishing; review it and press **Save to TV** to replace the published design. A further TV change still blocks that save. **Use latest TV settings** or **Discard changes** clears the account draft and loads the latest published settings; neither deletes designs or history. Identical settings saves leave the published revision and history unchanged. Photos and favorites save separately and do not advance the appearance revision.

Library changes also use revision checks. After a library conflict, **Refresh designs and history** retains page edits and reloads the library; **Save draft** explicitly keeps those edits, or **Discard changes** returns to the published settings. Undo history resets on reload/sign-out; drafts and designs persist in the account. Signing out clears the editor's account data from the page.

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

### Choose photos from the companion

**Photo zoom** adjusts dashboard framing from 100–150%. The default 105% applies a
slight centered crop; increase it to hide borders embedded in a selected photo,
or use 100% for the normal screen-covering fit. The preview and TV use the same
zoom. This does not edit the saved image or change ambient slideshow framing.

Open **Photos · choose images for your TV** below the save actions. **Choose dashboard photos** or **Choose ambient photos** starts Google’s picker in a new tab. If Photos access is missing, approve Google consent, return here, and choose photos again. Select up to eight images and press Done in Google. The companion polls and stores the completed selection; if a popup is blocked, use the visible picker link. Expired or failed sessions provide a restart message. Starting another picker replaces the active session, and session checks protect against finishing a different device’s picker.

Dashboard selection uses the first image as the saved background. Ambient selection replaces the shared gallery without replacing the background. Tap a saved gallery photo for a larger view and **Use as dashboard background**. Choosing photos stores media immediately; **Save to TV** publishes the background/ambient source in your design. Existing TVs already using the selected-photo source can receive replacement images even before a new design publish. The updated TV checks lightweight photo revisions with appearance updates, fetching image data only when it changes. The companion receives only selected/saved images; the library stays in Google’s picker. Signing out clears the gallery and stops polling.

**TVs & account** shows whether Calendar/Tasks/activity, Sheets, and Photos are connected and explains their access. Account controls can remove connections or revoke sessions. Household invitations and separate per-TV dashboard designs are not implemented yet; favorite apps already have per-TV settings.

## Return to the site and manage TVs

On the TV, open **Settings → Companion site** and scan the permanent QR code, or type the displayed address on a phone or computer. The code opens `/dashboard` without a pairing code or credentials and still requires Google sign-in. Its canonical address comes from the backend's `PAIRING_URL`; the TV's configured public site is the fallback.

Under **Linked TVs**, rename a TV (up to 40 characters) or remove its access. A running TV normally signs out on its next appearance refresh, within about a minute; an offline TV is blocked when it reconnects. Removing one managed TV preserves the owner's browser session and other TVs. Older TV sessions register automatically when the updated TV app connects. **Sign out on every device** still covers older app builds.

For the next layout, sharing, and widget milestones, see [companion roadmap](COMPANION_ROADMAP.md).

## Source organization

Editors live under `src/features` with their private views, models, templates,
and helpers. The dashboard groups cards, grid editing, preview, library, ambient,
and photos; weather and device management have their own feature folders.
Common request and DOM utilities live in `src/shared`, page markup in `src/app`,
and the app-wide stylesheet in `src/styles`. See the
[source folder guide](src/README.md) for the complete map and placement rules.

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

The draft/design/history milestone requires deploying both `appearanceStudio` and the updated `userAppearance` function with Hosting. It keeps the existing TV API and needs no TV rebuild. Weather/favorites/photo sync additionally requires the new `userPreferences` and `deviceApps` functions, updated `googlePhotosPicker`, `googleOAuthCallback`, and `userAppearance`, Hosting routes, and the updated TV binary. No Firestore rules change is required. Data is scoped to the authenticated owner and removed by the existing recursive account deletion.

Studio browser regression tests use a local Vite fixture with mocked authenticated APIs, without Google sign-in or production writes. With Playwright and its Chromium runtime available, start Vite and run `node --test test/appearanceEditor.test.cjs`. `STUDIO_TEST_URL` can override `http://127.0.0.1:5173`; `NODE_PATH` can point to bundled Playwright packages, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an installed headless Chromium. The fixture is outside the production bundle. Backend tests run with `npm --prefix ../functions test`.

Run `node --test test/appearanceEditor.test.cjs test/companion.test.cjs` for the full browser suite. Companion tests mock Firebase modules and all APIs, blocking external network calls. They verify all five routes at 320/390/768/1024/1440px, weather conflict handling, ambient publishing, photo purposes/expiry/sign-out, and per-TV favorites. Set `COMPANION_SCREENSHOTS` to an output directory to save phone/tablet/laptop screenshots.

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

**TVs & account** has controls to remove stored photos, disconnect Calendar/Tasks/activity, sign out all devices, or delete the account and saved data. See [security and retention setup](../SECURITY.md) before enabling these actions in production.
