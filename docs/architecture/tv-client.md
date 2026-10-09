# Current HomeScreen structure

```text
TVScreenWrapper / AuthProvider / ThemeProvider / NarrationProvider / DashboardProvider / PeopleProvider / PollsProvider
└── HomeScreen
    ├── HeaderBar (greeting, clock/date, settings)
    ├── Data-error banner, when needed
    ├── DashboardLayout
    │   ├── Automatic rows from appearance.cards; or
    │   └── DashboardGrid from appearance.grid (12 columns × 6 rows)
    │       └── DashboardCard (TVCard + inner measurement) → AdaptiveDashboardCard
    │           └── components/dashboard/<domain>/*DashboardCard
    │   Weather · Schedule · Activity · Media · Meals · Tasks · Polls · Person activity
    ├── FavoriteAppsCarousel (outside the movable grid)
    └── DashboardDetailModal → TVDetailModal
        └── Weather / Schedule / Activity / Media / Meals / Tasks / Polls / Person activity / Settings

Idle → AmbientScreen; remote input → dashboard
```

The current `appearance.widgetLayout` adds stable widget instances and independent bindings/styles; legacy `cards`/`grid` remain a built-in fallback. People and Polls providers use separate feeds. Source paths below are relative to `HomeScreen/` unless explicitly rooted.

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
by the backend, TV, and companion; Metro watches that folder explicitly.

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
for remaining profiles, new feed widgets, independent per-TV designs, and expanded style controls. Polls, shared activity, saved designs/history, and reading controls are implemented.

Run `npm test` from `HomeScreen/` for request, layout-planner, and activity-summary checks. To test
rendered cards, start the fixture from the repository root:

```sh
node server/pairing-web/node_modules/vite/bin/vite.js --config HomeScreen/test/vite.config.mjs --strictPort
```

Then run `npm run test:browser` in `HomeScreen` with Playwright and Chromium
available. The suite renders all six cards at all 50 supported footprints in
compact and full modes, and checks loading and live data changes. It mocks data
providers and also checks weather detail forecasts, city selection, and keyboard
focus. It does not test native remote navigation or network synchronization.
