# Client and companion component hierarchy

The entry points compose features. Each feature owns its state and private
views; shared UI and pure utilities live at the smallest scope that uses them.
Import defining modules directly, and avoid placeholder folders or barrel files
that obscure ownership.

## HomeScreen TV client

```text
App
└── AuthProvider → ThemeProvider → ThemedScreen
    ├── TVScreenWrapper → Root
    │   ├── StartupScreen while authentication/appearance loads
    │   ├── PairingScreen when signed out
    │   └── DashboardProvider → WatchNextProvider → FavoriteAppsProvider
    │       └── HomeScreen
    │           ├── AmbientScreen when idle or previewing
    │           └── Dashboard when active
    │               ├── HeaderBar
    │               ├── Data-error banner
    │               ├── DashboardLayout
    │               │   ├── Automatic rows OR DashboardGrid
    │               │   └── DashboardCard (TVCard + inner measurement)
    │               │       └── AdaptiveDashboardCard
    │               │           └── Weather / Schedule / Activity / Media / Meals / Tasks
    │               │               └── CardContent and domain-specific views
    │               ├── FavoriteAppsCarousel
    │               └── DashboardDetailModal → TVDetailModal
    │                   ├── Domain detail view
    │                   └── SettingsDetailView → feature settings panels
    └── ExitConfirmationModal on Android
```

`HomeScreen` coordinates navigation and ambient mode. `DashboardLayout` owns
row/grid selection; both paths reuse `DashboardCard` for labels, focus, theming,
and measurement. Measurement happens inside the themed shell so padding and
custom borders are excluded. `AdaptiveDashboardCard` selects domain content and
preserves loading behavior. `DashboardDetailModal` owns detail definitions and
the Settings ambient-preview callback.

Use `components/<area>/<domain>` for private UI and `components/<area>/shared`
for reuse within an area. `components/shared` is TV-wide UI; cross-area hooks
and calculations belong in `src/hooks` and `src/helpers`. Providers and services
own data access. See the [TV folder guide](HomeScreen/src/components/README.md).

## Companion site

The companion uses TypeScript DOM controllers and templates, rather than React.
Its composition follows the same ownership rules.

```text
main.ts — configuration, Firebase authentication, active-feature wiring
├── authNavigation — remember/recover the originating sign-in route
├── companionPage — navigation, account sign-in panel, route copy, page shell
└── One active feature
    ├── /pair: pairingTemplate + pairingController
    ├── /dashboard: appearanceTemplate + appearanceEditor
    │   ├── Cards and card styles
    │   ├── Grid editor
    │   ├── Appearance preview
    │   ├── Saved designs and history
    │   ├── Ambient editor
    │   └── Photo gallery and picker
    ├── /settings: weatherEditor
    ├── /meals: mealTemplate + mealController
    └── /account: accountTemplate + accountController
        └── deviceManager → per-TV deviceAppsEditor
```

Only the active page's markup, listeners, and controller are initialized. Its
constructor sets up controls; authentication triggers `load`, and account changes
trigger `clear` before loading another user. Each controller owns loading state
and invalidates late responses. The shell owns common sign-in/status controls;
features own their forms, requests, and feature status messages.

Reuse `src/shared/apiClient` for authenticated transport, `dom` for required
element lookup and status presentation, and `googleAuthorization` for Google
redirect validation. Keep feature templates beside their controller. See the
[companion folder guide](server/pairing-web/src/README.md).

## Reuse boundaries

TV UI and browser DOM UI remain platform-specific. Repository `shared/src` is
for pure contracts and utilities used across applications. Share repeated
behavior where it matches; preserve distinct layouts and asynchronous lifecycles.
Keep small private components in their owner file when another file would add
indirection. Remove an old implementation when its replacement is adopted.

## Verification

Run both client type checks, the companion production build, and TV unit tests.
With local Vite fixtures running, the browser suites cover card sizes and both
TV layouts, companion routes across viewport sizes, pairing, meals, account
actions, account-change guards, redirects, and dashboard draft editing. Native
TV remote behavior still needs device verification before release.
