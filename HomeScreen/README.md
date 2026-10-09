# HomeScreen TV app

HomeScreen is an ad-free household dashboard built with Expo, React Native TV, and TypeScript for Android TV. It is an active personal project, not a finished launcher replacement.

![HomeScreen dashboard with schedule, activity, media, weather, meals, tasks, and favorite apps](../assets/Screenshot_20261001_174433.png)

## Current implementation

- The home dashboard shows a clock and greeting, six configurable cards (schedule, activity, media, weather, meals, and tasks), and a favorite-app row. Selecting a card opens a larger detail panel.
- A TV pairing code and QR link connect the app to a Google account through the companion [pairing site](../server/pairing-web/README.md). Firebase Authentication persists the TV session.
- The [Cloud Functions backend](../server/functions/README.md) provides Google Calendar, Google Tasks, Google Fit activity, OpenWeatherMap weather, and an optional Google Sheets dinner plan. Dashboard data refreshes every five minutes. Individual upstream failures do not prevent the other cards from loading.
- Native Firebase sign-in now persists in Expo SecureStore. Rebuild and reinstall the Android TV binary after updating dependencies or native plugins; a Metro reload cannot add the native SecureStore module.
- On Android TV, Continue Watching reads titles that installed apps publish to the system Play Next row. The web preview uses sample media data.
- Settings include color palettes, a custom accent, backgrounds, layout presets, card order/visibility/width, saved weather locations, favorite apps, meal connection, and device controls. Appearance settings sync through the backend; some TV-specific preferences are local to the device.
- The companion studio can position and resize the six cards on a 12-by-6 grid. Cards adapt to both width and height: tall/narrow tiles show wrapped titles and additional data rows, while short tiles keep the essentials. Media can show poster/progress, and larger weather/activity cards include forecasts or goal visuals. Remote selection opens the existing detail panels. The header and favorite-app row remain outside the grid.
- Per-card background colors and opacity sync from the companion and apply to both row and grid layouts. Opacity changes the surface only; text and artwork retain their own visibility. Themed foreground colors adapt to the estimated surface contrast.
- Medium Activity cards reuse the centered-percentage ring and colored metric icons; medium Media shows primary and following artwork with playback progress when supplied by TV Play Next. Short Tasks cards fit compact task rows. The favorites viewport reaches the screen edges and keeps focused apps visible.
- Dashboard photos cover the measured screen, then use the companion's 100–150% photo zoom (105% by default) to crop embedded image borders. Original saved photos and ambient slideshow framing are unaffected.
- Ambient mode starts after 10 minutes without remote input by default. It can use built-in photos, up to eight selected Google Photos, a plasma backdrop, or a dark background, with a clock and optional rotating information.

The screenshots capture one configured TV using automatic rows on October 1, 2026; they predate the companion canvas and device-management controls. Names, connected data, artwork, weather, and available media depend on the account and installed apps.

## Screenshots

| View | Preview |
| --- | --- |
| Dashboard | [Full-size dashboard](../assets/Screenshot_20261001_174433.png) |
| Activity detail | [Fitness and health goals](../assets/Screenshot_20261001_174506.png) |
| Meal detail | [Family meal planner](../assets/Screenshot_20261001_174531.png) |
| Weather detail | [Weather forecast](../assets/Screenshot_20261001_174551.png) |
| Color settings | [Palette and accent controls](../assets/Screenshot_20261001_174623.png) |
| Card settings | [Card order and live preview](../assets/Screenshot_20261001_175228.png) |
| Ambient mode | [Ambient photo and information](../assets/Screenshot_20261001_174401.png) |

## Fonts and reading

Open **Settings → Fonts & reading** for the **Dyslexia-friendly** preset: bundled
OpenDyslexic, warm cream text on opaque charcoal surfaces, and gentle letter
spacing. Font and reading colors can also be selected independently; **Reset
reading settings** restores the system font and theme colors without rearranging
widgets. Reading preferences apply to widgets, detail panels, settings and ambient
text, persist locally, and sync with the shared account appearance.

The companion's **Dashboard Studio → Fonts & reading** adds preferred text color,
bold weight and spacing controls with a live sample, undo, drafts and saved designs.
Use **Save to TV** to publish. Reading color modes take priority over custom widget
surfaces; switching back to theme colors restores them. Custom ink uses a readable
fallback where it fails 4.5:1 contrast on the evaluated surface. Transparent photo
surfaces still depend on the image beneath them; use Warm cream or High contrast
for opaque reading surfaces.

Fonts load from bundled files through Expo Font, with system-font fallback while
loading or on failure. Widget text retains its existing sizes and bounded line
budgets; select a widget for full details. `npm run test:reading` checks keyboard
controls, persistence, font rendering and all 50 widget footprints at 960px/1920px
against the settings and card Vite fixtures. Native font rendering and couch-distance
readability still need an Android TV hardware check.

## Spoken navigation

Open **Settings → Accessibility → Read selections aloud → On** to hear focused
cards, menus, favorite apps and named text fields. It starts off, and stores the
toggle, speaking speed and voice on this device rather than syncing them to every
TV on the account. **Preview voice** works while narration is off; **Stop speaking**
interrupts speech. Voices and their languages come from the device's installed
text-to-speech engine. Selecting another language changes the voice, not the UI
language or the content's language.

Fast navigation cancels previous announcements. Android TalkBack takes priority;
the app pauses its own narrator while the screen reader is active. Speech also
stops when the app goes into the background, opens another app, closes a detail
panel, or enters ambient mode. Dashboard focus reads card names, not entire
private feeds. Controls in an opened detail view may include personal information;
text fields announce their labels without reading typed values. Passive clock,
weather and data refreshes are silent.

The TV app uses Expo Speech; the web preview uses the browser's Speech Synthesis
API. Browsers cannot detect screen readers, so turn the preview narrator off when
using a browser screen reader. Unsupported or unavailable speech displays a
message without preventing navigation. Voices may require downloads or connectivity,
depending on the device's text-to-speech engine.

**Rebuild and reinstall the Android TV app** to include the native `expo-speech`
module; a Metro reload cannot add it to an existing APK. This change needs no
Functions/Hosting deployment. Native voice playback and TalkBack focus behavior
still need a hardware check.

`npm test` includes cancellation, state announcements, race handling and preference
normalization checks. For browser integration, start the Vite fixtures with
`node ../server/pairing-web/node_modules/vite/bin/vite.js --config test/narration.vite.config.mjs`,
then run `npm run test:narration` with Playwright available. The browser fixture
uses simulated device accessibility events and speech output to verify controls,
speed, voice selection, persistence and stopping at 960×540 and 1920×1080.

The next layout work should fit content to font metrics and text scale, prioritize
essential information in cards, and use smaller detail headers and more efficient
TV detail layouts. Spoken navigation preserves the existing card/detail styles.

## Run the app

1. Install dependencies from this directory with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Firebase web app identifiers and `EXPO_PUBLIC_API_URL`. The API URL is the Cloud Functions base URL without a function name. Set `EXPO_PUBLIC_PAIRING_URL` if the setup QR links should use a pairing URL other than the default derived from the Firebase project ID. The Companion site tab prefers the backend's canonical pairing site when available. For an Android TV device, use an API URL the device can reach; `localhost` points at the TV itself.
3. Start Metro with `npm run start`. Use `npm run android` to build and install the native Android TV app, or `npm run web` for a browser preview.

The backend and pairing site need their own configuration and deployment. See their READMEs before testing account pairing or live data. The web preview cannot read the Android TV Play Next row. Native module or launcher-artwork changes require a fresh Android build.

Keep the repository structure when building: `metro.config.js` adds the pure layout contract in `../server/functions/src/utils` to Metro's watched folders. No Firebase Admin code is imported into the TV bundle.

### Build a signed release and install over the network

See [RELEASE.md](RELEASE.md) for the complete Windows PowerShell guide: one-time
private signing setup, standalone APK builds, ADB pairing/network installation,
troubleshooting, and signed Android App Bundles for Google Play TV distribution.

From this directory, after configuring `.env.local`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
$env:ANDROID_HOME = 'D:\androidSDKs'
# First setup only; existing signing files are never overwritten:
npm run android:signing:init
npm run android:release
# For Google Play, when ready:
npm run android:bundle
```

Private credentials live in the ignored `.release/` directory and survive Expo
prebuilds. Back up that directory securely. The normal release commands reject
missing private signing; `-AllowDebugSigning` is an explicit internal-APK fallback.
A different signing key prevents upgrading an existing installation; see the guide
before uninstalling an app and clearing its local data.

## Using the dashboard

### Pair a TV

When signed out, the TV shows a six-character code and QR link. Open the link on a phone or computer, sign in with Google, and approve the matching code. The TV polls with a separate private secret and signs in when pairing succeeds.

To return to the companion after pairing, open **Settings → Companion site**. Its permanent QR and readable address open Dashboard Studio, where the owner can change appearance and manage linked TVs. The QR contains no sign-in credentials. Newly paired TV sessions can be named and removed individually from the site; older sessions need one re-pair to appear in the managed list. **Settings → Device** displays the saved TV name.

The companion also offers **Weather & goals** for shared weather cities and activity targets, **Dashboard → Ambient mode** and **Photos** for ambient preferences and direct Google Photos selection, and **TVs & account → Favorite apps** for each TV's app row. The updated TV syncs weather/favorites every 45 seconds and fetches changed photos using lightweight revisions. Local cities and favorites seed only an empty cloud configuration. These controls require the updated Functions, Hosting, and TV binary; see the [companion UX review](../server/pairing-web/UX_REVIEW.md).

### Connect a meal plan

Open **Settings → Meals** on the TV and scan its QR link, or open `/meals` on the pairing site's domain. Grant Sheets read access and provide a Sheet URL that the connected Google account can open. The Sheet needs `Date` and `Meal_Name` (or `Main`, `Meal`, or `Dinner`) headers. See the [pairing site guide](../server/pairing-web/README.md#connect-a-meal-sheet) for accepted columns and date formats.

### Customize cards and ambient mode

Open **Settings → Layout** for presets or **Settings → Cards** to reorder, show/hide, and resize dashboard cards; the preview updates as you make changes. **Settings → Colors** changes the palette and accent. **Settings → Background** can use a built-in background, a solid color, or a selected Google Photo.

For free placement, scan **Settings → Companion site**, sign in, and select **Arrangement → Free layout**. Drag a card to move it or its lower-right corner to resize it; position/size fields provide an alternative. Cards cannot overlap and must stay inside the grid. **Save to TV** publishes the change, normally picked up within 45 seconds. Tall cards use their space for more information, and short cards keep a concise overview; selecting either opens the full detail panel. Colors and ambient settings still work on the TV while a free layout is active. Edit free-layout card positions, sizes, and visibility on the site; choosing a TV layout preset or restoring defaults replaces the canvas with automatic rows.

On the companion, open **Personalize each card**, turn off **Use theme surface** for a card, then choose its color and background opacity (0–100%). Save to TV applies the style. Re-enable **Use theme surface** to restore that card's palette surface. Selecting a layout preset keeps card styles; **Restore default appearance** clears them. The companion also displays the saved background and selected TV photo gallery; tap a thumbnail to enlarge it. Selecting **Selected Google photo** uses the saved background. Choosing new photos still starts from the TV's Google Photos picker.

Older TV builds continue to display the saved card list as rows. They preserve a stored canvas when changing compatible appearance settings; visibility changes incompatible with that canvas are rejected by the backend. Update the TV app to display free placement. See the [layout contract](../server/pairing-web/DASHBOARD_LAYOUT.md).

Open **Settings → Ambient** to change the idle delay, backdrop, rotation interval, and displayed information. **Preview** starts ambient mode immediately; pressing a navigation button returns to the dashboard. To select personal photos, scan the QR code in the Google Photos picker and choose up to eight photos on a phone. A fresh picker link is needed if an earlier one expired. Ambient mode does not replace the TV's own panel protection or power settings.

### Continue Watching

On Android TV, the Watch section reads unfinished titles published to the system Play Next row. If prompted, grant TV listings access. The publishing app controls which titles, posters, episode details, and progress are available. **Resume in app** opens its program intent when provided.

Press a title to move it to **Up Next**. Hold a title to hide it; **Hidden titles** restores hidden series. Those choices are stored on this TV. This feature uses the local `modules/tv-watch-next` Expo module, so native changes need a new Android build.

## Card content across sizes

Card content shares measured renderers across automatic rows and the free canvas.
It uses the measured inner size to fit readable content. Meals shows a few dated
dinners in one column, and Media uses larger posters with spacious queue previews.
Schedule emphasizes the current/next event with separate capped Today/Coming up
groups; Tasks uses a capped readable checklist with at most two columns. Meals
and Media separate supporting sections and use side compositions on wide cards.
Weather uses larger
current values/artwork and separate, capped hourly/daily forecast strips. Medium Activity
retains its ring, all four daily metrics and a weekly summary whenever space permits,
before adding a chart. Wider/taller cards add entries and weekly/forecast information
when supplied. All six cards and all
50 supported footprints are checked at compact and full TV dimensions. See
[card content breakpoints](CARD_CONTENT_BREAKPOINTS.md) for thresholds, content
priorities and verification commands.

The [widget design guide](WIDGET_DESIGN_GUIDE.md) documents the complete size
contract and a reusable process for future layouts. The implemented
[weather design](WEATHER_LAYOUT_DESIGN.md) maps six layout families across all
50 footprints in both reference profiles. The implemented
[Schedule design](SCHEDULE_LAYOUT_DESIGN.md) maps all sizes, sparse/busy behavior
and TV-clock event status. With updated Functions, Schedule marks timed events
as **Happening now** and removes ended events from the dashboard preview while
retaining the full day in details. All-day entries remain for their calendar day;
legacy feeds with missing timestamps keep their existing behavior. The
[Tasks design](TASKS_LAYOUT_DESIGN.md) maps its checklist across all 50 sizes.
[Meals/Media/Activity refinements](PREVIEW_WIDGET_REFINEMENTS.md) cover named
sections and selective enlargement. These refinements need updated TV code, with
no backend migration. The [other widget assessment](WIDGET_LAYOUT_ASSESSMENT.md) identifies follow-up
opportunities and the shared components that support them.

## Android TV artwork

The app includes `assets/tv-banner.png` for the launcher tile, `assets/icon.png` for the square icon, and `assets/homescreen-splash.png` for the startup mark. Edit and run `scripts/generate-brand-assets.ps1`, or replace the PNGs. Keep the banner at 16:9 with readable text. After changing artwork, run `npx expo prebuild --platform android`, then build and reinstall the app; a Metro reload cannot update native assets.

## Next steps

The [companion roadmap](../server/pairing-web/COMPANION_ROADMAP.md) tracks saved designs/history, owner-created polls, feed widgets, and deeper style controls. Polls, quotes, jokes, Bible verses, household roles, and separate per-TV configurations are not implemented. TV readability, remote focus behavior, and reliability remain ongoing work.

## Asset credits and license

The dashboard background photograph is by [Jonatan Pie](https://unsplash.com/@r3dmax) on [Unsplash](https://unsplash.com/photos/silhouette-of-off-road-car-h8nxGssjQXs). Sample TV and movie artwork is used for development and remains subject to the rights of its respective owners; [TMDB](https://www.themoviedb.org/) is one source of prototype artwork. Third-party assets retain their own terms. This repository is currently a personal development project; see [LICENSE](LICENSE) for the app's license text.
