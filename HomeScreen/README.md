# HomeScreen TV app

HomeScreen is an ad-free household dashboard built with Expo, React Native TV, and TypeScript for Android TV. It is an active personal project, not a finished launcher replacement.

![HomeScreen dashboard with schedule, activity, media, weather, meals, tasks, and favorite apps](../assets/Screenshot_20261001_174433.png)

## Current implementation

- The home dashboard shows a clock and greeting, six configurable cards (schedule, activity, media, weather, meals, and tasks), and a favorite-app row. Selecting a card opens a larger detail panel.
- A TV pairing code and QR link connect the app to a Google account through the companion [pairing site](../server/pairing-web/README.md). Firebase Authentication persists the TV session.
- The [Cloud Functions backend](../server/functions/README.md) provides Google Calendar, Google Tasks, Google Fit activity, OpenWeatherMap weather, and an optional Google Sheets dinner plan. Dashboard data refreshes every five minutes. Individual upstream failures do not prevent the other cards from loading.
- On Android TV, Continue Watching reads titles that installed apps publish to the system Play Next row. The web preview uses sample media data.
- Settings include color palettes, a custom accent, backgrounds, layout presets, card order/visibility/width, saved weather locations, favorite apps, meal connection, and device controls. Appearance settings sync through the backend; some TV-specific preferences are local to the device.
- Ambient mode starts after 10 minutes without remote input by default. It can use built-in photos, up to eight selected Google Photos, a plasma backdrop, or a dark background, with a clock and optional rotating information.

The screenshots capture one configured TV on October 1, 2026. Names, connected data, artwork, weather, and available media depend on the account and installed apps.

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

## Run the app

1. Install dependencies from this directory with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Firebase web app identifiers and `EXPO_PUBLIC_API_URL`. The API URL is the Cloud Functions base URL without a function name. Set `EXPO_PUBLIC_PAIRING_URL` if the meal setup QR link should use a pairing URL other than the default derived from the Firebase project ID. For an Android TV device, use an API URL the device can reach; `localhost` points at the TV itself.
3. Start Metro with `npm run start`. Use `npm run android` to build and install the native Android TV app, or `npm run web` for a browser preview.

The backend and pairing site need their own configuration and deployment. See their READMEs before testing account pairing or live data. The web preview cannot read the Android TV Play Next row. Native module or launcher-artwork changes require a fresh Android build.

## Using the dashboard

### Pair a TV

When signed out, the TV shows a six-character code and QR link. Open the link on a phone or computer, sign in with Google, and approve the matching code. The TV polls with a separate private secret and signs in when pairing succeeds.

### Connect a meal plan

Open **Settings → Meals** on the TV and scan its QR link, or open `/meals` on the pairing site's domain. Grant Sheets read access and provide a Sheet URL that the connected Google account can open. The Sheet needs `Date` and `Meal_Name` (or `Main`, `Meal`, or `Dinner`) headers. See the [pairing site guide](../server/pairing-web/README.md#connect-a-meal-sheet) for accepted columns and date formats.

### Customize cards and ambient mode

Open **Settings → Layout** for presets or **Settings → Cards** to reorder, show/hide, and resize dashboard cards; the preview updates as you make changes. **Settings → Colors** changes the palette and accent. **Settings → Background** can use a built-in background, a solid color, or a selected Google Photo.

Open **Settings → Ambient** to change the idle delay, backdrop, rotation interval, and displayed information. **Preview** starts ambient mode immediately; pressing a navigation button returns to the dashboard. To select personal photos, scan the QR code in the Google Photos picker and choose up to eight photos on a phone. A fresh picker link is needed if an earlier one expired. Ambient mode does not replace the TV's own panel protection or power settings.

### Continue Watching

On Android TV, the Watch section reads unfinished titles published to the system Play Next row. If prompted, grant TV listings access. The publishing app controls which titles, posters, episode details, and progress are available. **Resume in app** opens its program intent when provided.

Press a title to move it to **Up Next**. Hold a title to hide it; **Hidden titles** restores hidden series. Those choices are stored on this TV. This feature uses the local `modules/tv-watch-next` Expo module, so native changes need a new Android build.

## Android TV artwork

The app includes `assets/tv-banner.png` for the launcher tile, `assets/icon.png` for the square icon, and `assets/homescreen-splash.png` for the startup mark. Edit and run `scripts/generate-brand-assets.ps1`, or replace the PNGs. Keep the banner at 16:9 with readable text. After changing artwork, run `npx expo prebuild --platform android`, then build and reinstall the app; a Metro reload cannot update native assets.

## Next steps

Current work is focused on TV readability, remote focus behavior, and reliability across different display sizes and upstream service failures. Family profiles, smart-home integration, deeper media integration, and additional ambient content remain ideas for later development.

## Asset credits and license

The dashboard background photograph is by [Jonatan Pie](https://unsplash.com/@r3dmax) on [Unsplash](https://unsplash.com/photos/silhouette-of-off-road-car-h8nxGssjQXs). Sample TV and movie artwork is used for development and remains subject to the rights of its respective owners; [TMDB](https://www.themoviedb.org/) is one source of prototype artwork. Third-party assets retain their own terms. This repository is currently a personal development project; see [LICENSE](LICENSE) for the app's license text.
