# Current HomeScreen structure

```text
TVScreenWrapper / ThemeProvider / DashboardProvider
└── HomeScreen
    ├── HeaderBar (greeting, clock/date, settings)
    ├── Data-error banner, when needed
    ├── Cards
    │   ├── Automatic rows from appearance.cards; or
    │   └── DashboardGrid from appearance.grid (12 columns × 6 rows)
    │       └── TVCard → AdaptiveDashboardCard (content sized to width/height)
    │   Weather · Schedule · Activity · Media · Meals · Tasks
    ├── FavoriteAppsCarousel (outside the movable grid)
    └── TVDetailModal
        └── Weather / Schedule / Activity / Media / Meals / Tasks / Settings

Idle → AmbientScreen; remote input → dashboard
```

`src/theme/appearance.ts` normalizes old settings and falls back to rows for an
invalid or unsupported grid. `src/theme/ThemeContext.tsx` caches account-scoped
appearance, saves changes, and refreshes remote settings every 45 seconds. The
pure grid contract in `../server/functions/src/utils/dashboardLayout.ts` is shared
by the backend, TV, and companion; Metro watches that folder explicitly.

`AdaptiveDashboardCard.tsx` renders icon/title/metadata and adds further real data
rows or visuals as space allows. `TVCard` applies `appearance.cardStyles[id]` to
its surface and scopes foreground theme colors to the card. The pure validation
and surface/contrast helpers are in `../server/functions/src/utils/cardStyle.ts`.
The summary and row heights are measured. Activity reuses `TVProgressRing` and
`ActivityStats`; media reuses `WatchPoster` for primary and queued artwork.
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

See [README](README.md) for current features, [layout contract](../server/pairing-web/DASHBOARD_LAYOUT.md)
for geometry and compatibility, and [roadmap](../server/pairing-web/COMPANION_ROADMAP.md)
for planned polls, new widgets, saved designs/history, and expanded style controls.
