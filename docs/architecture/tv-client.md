# Current HomeScreen structure

```text
AuthProvider / ThemeProvider / MotionProvider / NarrationProvider / TVScreenWrapper
└── DashboardProvider / WatchNextProvider / FavoriteAppsProvider / PeopleProvider / PollsProvider / FeedsProvider
  └── HomeScreen / ScreenFocusProvider
    ├── HeaderBar (greeting, clock/date, settings)
    ├── DashboardLayout
    │   ├── Automatic rows from appearance.cards; or
    │   └── DashboardGrid from appearance.grid (12 columns × 6 rows)
    │       └── DashboardCard (TVCard + inner measurement) → AdaptiveDashboardCard
    │           └── components/dashboard/<domain>/*DashboardCard
    │   Weather · Schedule · Activity · Media · Meals · Tasks · Polls · Person activity · Feeds
    ├── FavoriteAppsCarousel (outside the movable grid)
    ├── Reserved sync-status footer (quiet refresh/retry status)
    └── DashboardDetailModal → TVDetailModal
        └── Weather / Schedule / Activity / Media / Meals / Tasks / Polls / Person activity / Feeds / Settings

Idle → AmbientScreen overlay; remote input → same mounted dashboard
```

The current `appearance.widgetLayout` adds stable widget instances and independent bindings/styles; legacy `cards`/`grid` remain a built-in fallback. People, Polls and RSS/Atom providers use separate feeds. RSS/Atom snapshots have their own account-scoped, validated disk cache. Source paths below are relative to `HomeScreen/` unless explicitly rooted.

The dashboard's focus frame stays mounted beneath ambient mode, preserving card
measurements/state while suppressing covered controls' focus/accessibility.
Screen-local focus memory restores a stable widget/app/settings target after
details, ambient or an external app. Motion preference is device-local. Native
installed-app labels/artwork are cached in process and invalidated by package
changes; see [TV experience](../../HomeScreen/TV_EXPERIENCE.md) for limits and
hardware verification.

While ambient is active, `components/ambient/AmbientWakeControl.tsx` mounts the
TvWatchNext module's `AmbientWakeView`. This transparent native view takes focus
and consumes arrow/Select presses locally, emitting one `onWake` after release.
It does not register as a dashboard return target. This avoids depending on the
global TV-event listener for ambient wake; the October 23 Sony test found that
listener insufficient even after adding a focused JavaScript control. The
[TV experience guide](../../HomeScreen/TV_EXPERIENCE.md) owns rollout and behavior.

`SettingsDetailView` handles side-menu navigation and delegates weather and device
controls to `WeatherSettings` and `DeviceSettings`. These sections reuse
`SettingsPanel` and `useControlFocus`. See the repository's
[readability and reuse guide](../reviews/code-quality.md) for responsibilities and checks.
`WeatherDetailView` similarly composes the focused components in
`src/components/details/weather`; those components receive weather data and
callbacks rather than performing requests or storing location preferences.

Components and their private children are grouped by feature. Reusable TV
controls live in `src/components/shared`; card rendering shared only by dashboard
cards lives in `src/components/dashboard/shared`. Settings sections live in
`src/components/settings/<feature>` with shared settings controls in
`src/components/settings/shared`. See the
[component folder guide](../../HomeScreen/src/components/README.md) for the complete map and rules.

`src/theme/appearance.ts` normalizes old settings and falls back to rows for an
invalid or unsupported grid. `src/theme/ThemeContext.tsx` caches account-scoped
appearance, saves changes, and refreshes remote settings every 45 seconds. The
pure grid contract in `../server/functions/src/utils/dashboardLayout.ts` is shared
by the backend, TV, and companion; Metro watches that folder explicitly. Appearance
polling pauses while the app is backgrounded.

`dashboard/AdaptiveDashboardCard.tsx` selects a domain component and preserves
the shared loading state. Each domain component lives in its own subfolder of
`src/components/dashboard`, with its exclusive subcomponents beside it.
`CardContent` composes their common header, hero, rows, and details hint;
`useCardContentLayout` refines the pure planner using native measurements. Both
live in `dashboard/shared`, along with the pure `cardContentLayout.ts` planner.
Activity delegates to ring, metrics, or weekly content according to its size.
`TVCard` applies `appearance.cardStyles[id]` to
its surface and scopes foreground theme colors to the card. The pure validation
and surface/contrast helpers are in `../server/functions/src/utils/cardStyle.ts`.
The summary and row heights are measured. Activity reuses `TVProgressRing` and
`ActivityStats`; media reuses `WatchPoster` for primary and queued artwork.
`src/helpers/activitySummary.ts` shares weekly totals and bar calculations with
the activity detail view. Obsolete fixed-card implementations were removed so
there is one active dashboard card implementation per domain.
`TVScreenWrapper` measures the photo bounds and applies a clipped centered zoom
from `backgroundZoom`, normalized by shared `utils/photoFraming.ts`. The favorites
viewport extends to the frame edges and scrolls using measured focus bounds.

The companion `/dashboard` canvas edits card positions, sizes, visibility, and
colors and per-card surface color/opacity. Its photo gallery displays saved TV
images through authenticated Photos background/gallery endpoints, and its photo
zoom control adjusts dashboard cropping without changing the saved image. Save to TV
writes the account's appearance through authenticated Cloud
Functions, with server validation and stale-revision rejection. TV settings keep
palette/background/ambient controls and a permanent companion QR. Choosing a TV
layout preset replaces the free grid with automatic rows. All devices on the
account share one configuration.

See [README](../../HomeScreen/README.md) for current features, [layout contract](../../server/pairing-web/DASHBOARD_LAYOUT.md)
for geometry and compatibility, and [roadmap](../../server/pairing-web/COMPANION_ROADMAP.md)
for remaining profiles, daily-content widgets, independent per-TV designs, and expanded style controls. Polls, shared activity, RSS/Atom feeds, saved designs/history, and reading controls are implemented.

## Cached cold start

After Firebase restores a signed-in session, `ThemeProvider` loads account-scoped
local appearance settings (or defaults if storage fails) and releases the startup
screen without waiting for remote appearance or photo requests. Appearance sync
continues in the background; a late response does not overwrite pending or saved
local edits made after startup.

`DashboardProvider` then starts local
snapshot hydration and a summary request independently. A valid local snapshot
clears card loading immediately; a successful network response replaces it and
persists the new summary. A late disk read cannot overwrite a network response.
The five-minute refresh and Settings refresh reuse one in-flight summary request,
with a 15-second deadline covering authentication and the HTTP response. Failed
refreshes keep the last displayed summary and retry after one, two, then four
minutes, capped at the normal five-minute cadence. Background/inactive AppState
transitions cancel pending work quietly and pause polling. Returning to active
starts a fresh request immediately; old completions cannot overwrite it. The
deadline releases the session even when authentication or transport ignores abort.

`src/services/dashboardCache.ts` stores a versioned, UID-scoped AsyncStorage entry
containing schedule, upcoming events, tasks, meals, activity, default-city weather,
saved location metadata, and the backend's `updatedAt` timestamp. Restoration
rejects malformed, incompatible, oversized, future-dated, or more-than-24-hour-old
entries. Age is measured from the source timestamp, rather than the time the TV
received the response. Storage errors do not prevent live startup. Once displayed,
a snapshot stays visible during an outage; the 24-hour limit applies to restoration.
Saved data can include yesterday's schedule or completed tasks until refresh succeeds.

The provider retains the restored snapshot's timestamp and cached flag, but cache
restoration alone does not show a dashboard freshness label while the first live
request is pending. After a live refresh fails, a single muted line below favorite apps says refresh
is delayed and retrying, with the last summary timestamp. Its space is always
reserved so failures do not shift cards. Technical errors appear in Device &
Connectivity settings; refresh logs record time, duration and failure category
without tokens or dashboard content.
`src/services/dashboardSession.ts` coordinates restore/refresh races and prevents
updates or persistence after provider disposal. Sign-out and server-reported
session revocation remove the account's snapshot through `clearLocalUserData`;
removal waits for any already-started cache write. Other accounts' snapshots are
never restored for the current account.

This covers returning TVs with a recoverable authentication session and a usable
snapshot. First-ever launches and expired/missing caches still need a connection.
Non-default-city weather, Polls, and consented People activity use separate feeds
and are not persisted in this summary. People activity intentionally retains its
existing memory-only expiry/revocation behavior. Provider-specific Calendar/Tasks
failures still become empty arrays in a successful backend summary. Backend
prefetch and broader content-image caching remain separate work; native app
artwork already has an in-process cache. Secondary-city weather now preloads and
refreshes in the foreground, but is not persisted in the summary. The October 22
Sony checks establish partial startup/UI evidence, not the offline and lifecycle
matrix below. See the [next-step plan](../NEXT_STEPS.md).

Weather has an independent ten-minute backend cache which is rechecked even on
a summary-cache hit. The TV keeps newer usable observations when older summary
data or failed location requests arrive. H/L values describe future forecast
samples for the rest of the location's day; they are not observed daily extrema.
See [Functions weather behavior](../../server/functions/README.md) for timestamps,
secondary-city request cadence and rollout dependencies.

`npm test` includes cache and session regression checks for offline restoration,
refresh recovery, account isolation/cleanup, disk failure, invalid/expired entries,
deduplicated requests, late disk/network responses, and appearance readiness while
the network is pending or unavailable. For hardware verification:

1. Load a paired TV online; note its populated summary and selected default city.
2. Force-stop the app, disconnect the network, and relaunch. Confirm cards appear
   after session restoration and remain after refresh fails; the failure footer
   should then show the saved timestamp and retry status.
   Also test a stalled connection: remote appearance must not hold the startup screen.
3. Reconnect and use Settings refresh. Confirm current data replaces the snapshot
   and the saved-data banner clears.
4. Sign out/revoke the TV and pair another account. Confirm prior-account data is
   absent. Also verify first-ever launch and a cache older than 24 hours offline.

Run `npm test` from `HomeScreen/` for request, cache/session, layout-planner, and activity-summary checks. To test
rendered cards, start the fixture from the repository root:

```sh
node server/pairing-web/node_modules/vite/bin/vite.js --config HomeScreen/test/vite.config.mjs --strictPort
```

Then run `npm run test:browser` in `HomeScreen` with Playwright and Chromium
available. The suite renders all six cards at all 50 supported footprints in
compact and full modes, and checks loading and live data changes. It mocks data
providers and also checks weather detail forecasts, city selection, and keyboard
focus. It does not test native remote navigation or network synchronization.
