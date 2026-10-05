# Code readability and reuse

This review focused on the TV settings UI, both clients' request handling,
backend dashboard fetching, and the companion appearance editor and page markup.
The existing card components, hooks, provider
contexts, and backend services already provide useful separation. The changes
below improve the busiest paths; they do not certify every file as finished.

## Changes made

- `server/functions/src/services/dashboardSummary.ts` owns fetching and assembling
  dashboard data. The summary reader and explicit synchronization reuse it.
  Reading still tolerates a failed cache write; explicit synchronization still
  requires the write to succeed. Individual provider failures remain isolated.
- `shared/src/http.ts` owns JSON response parsing and HTTP errors. Errors retain
  their status for conflict handling and use an endpoint message if the response
  is not JSON. It is a browser/TV utility and imports no Firebase or native code.
- `server/pairing-web/src/shared/apiClient.ts` owns authenticated browser requests.
  Editors keep their own loading state, revision checks, and account-change guards.
- `HomeScreen/src/services/api.ts` uses one authenticated request function for
  normal JSON endpoints. Public pairing and the timed device-disconnect request
  keep their distinct behavior. Revoked-session cleanup remains in the TV client.
- `SettingsDetailView` owns settings navigation. `WeatherSettings` and
  `DeviceSettings` own their sections. `SettingsPanel`, `DeviceInfoRow`, and
  `useControlFocus` replace repeated presentation and focus handling. The weather
  panel stays mounted while hidden so changing tabs preserves an unfinished city.
- The companion weather editor uses shared preference types and named functions
  for city actions, row rendering, loading, saving, and clearing editor state.
- Fourteen empty, unreferenced TV component/screen placeholders were removed.
  They did not represent working reusable controls and made the folder structure
  harder to navigate.
- The companion appearance editor delegates its template, card controls,
  preview, and design/history rows to focused modules. The coordinator retains
  draft state, Undo/Redo, autosave, revision conflicts, and explicit publishing.
  API calls and response validation live in `appearanceApi.ts`. Named handlers
  and descriptive state names replace compressed callbacks and directional closures.
- `appearanceModel.ts` and `ambientPreferences.ts` contain pure normalization
  helpers. They repair malformed or legacy appearance fields, return independent
  copies, and discard unrecognized fields. Studio metadata is validated before it
  can affect concurrency checks; malformed revisions or libraries show an error.
- Card-row drags commit on a completed drop. Cancellation leaves the draft intact,
  and clearing/reloading removes window listeners so an old gesture cannot alter
  another account's editor. Browser regressions cover these behaviors.
- `companionPage.ts` owns page markup, navigation, help, and typed route-specific
  copy. The entry point retains authentication and feature initialization.
- `HomeScreen/src/components/dashboard/AdaptiveDashboardCard.tsx` now selects one of six
  domain components. `components/dashboard/shared/CardContent.tsx` owns their shared
  content frame, `CardContentRow` renders a row, and `useCardContentLayout` owns
  native measurement state. Activity delegates its ring and metrics views to
  focused components and retains the existing weekly card.
- Seventeen obsolete TV files were removed after checking the app entry point,
  source imports, tests, and native modules. This includes the old fixed weather,
  schedule, activity, media, meal, and task cards and their exclusive helpers.
- `helpers/activitySummary.ts` shares weekly totals, chart scale, and bar height
  calculations between the dashboard and activity details. Missing Move Minutes
  remain distinct from a recorded zero; empty weeks have finite totals.
- `WeatherDetailView` composes independent location tabs, current conditions,
  hourly forecasts, and daily forecasts from `components/details/weather`.
  Forecast sections share a heading component and weather metrics share a tile.
  Location tabs expose their selected state and reuse the visible focus hook.
- TV components now follow feature ownership: dashboard cards and private views
  live in domain subfolders; common rendering and settings controls live in
  their area's `shared` folder. Reusable TV controls live in `components/shared`.
  The header's clock/greeting hooks, card measurement hook/planner, and ambient
  idle hook live with their consumers. Seven empty source directories were removed.
  See `HomeScreen/src/components/README.md` for the folder map and placement rules.
- The companion source now follows the same ownership convention. Dashboard
  modules live in `src/features/dashboard` with private cards, grid, preview,
  library, ambient, and photo modules. Weather and devices have separate feature
  folders; request and DOM utilities live in `src/shared`, the page shell in
  `src/app`, and common styles in `src/styles`. Nineteen source files moved with
  their imports and fixture URLs updated. See `server/pairing-web/src/README.md`.

## How to write new code here

1. Give each function one clear responsibility. A screen can compose several
   components; a request function should not also render controls or own drafts.
2. Reuse existing domain helpers and components when their behavior matches.
   Extract repeated behavior into a plainly named function before adding a
   configurable framework. Similar styling alone does not imply identical behavior.
3. Prefer descriptive names, early returns, and one meaningful operation per
   line. Move long event handlers into named functions. Comments should explain
   constraints and reasons rather than paraphrase the next line.
4. Keep API, storage, and native calls in services or hooks. Share pure contracts
   without pulling backend dependencies into the TV or browser bundle.
5. Use explicit types at module boundaries. Avoid `any` and validate untrusted
   input where it enters the system. A TypeScript response type is a contract,
   not runtime validation of a remote payload.
6. Preserve account isolation, cancellation guards, revision checks, partial
   failure behavior, accessibility labels, and remote focus when refactoring.
7. Add regression tests for meaningful behavior that could break. Prefer observable
   results to tests that assert a particular private implementation.
8. Keep components and their exclusive subcomponents, hooks, and types together.
   Share within a feature before promoting code to app-wide shared folders.
   Remove empty directories after moving their contents. The TV folder convention
   is documented in `HomeScreen/src/components/README.md`; the companion follows
   `server/pairing-web/src/README.md`.

## Remaining work identified

| Area | Concern | Useful next refactor |
| --- | --- | --- |
| `server/pairing-web/src/features/dashboard/appearanceEditor.ts` | Views and API access are separated; the coordinator still owns the draft lifecycle. | Keep new features in the relevant view/service; extract a draft state module only when its behavior needs reuse. |
| `server/pairing-web/src/main.ts` | Page markup is separated; account actions, pairing, and meal setup still share the entry module. | Move feature controllers into named modules while retaining sign-in redirect and account-change behavior. |
| Appearance types/defaults in TV, browser, and backend | Palette, layout, and ambient contracts are repeated; clients also import pure helpers from the backend source tree. | Establish a shared contract module with build support in all three projects, retaining strict server validation and tolerant legacy client normalization. |
| `HomeScreen/src/context/DashboardContext.tsx` and `src/theme/ThemeContext.tsx` | Providers combine storage, polling, synchronization, and state updates. | Extract persistence/sync hooks around existing account-generation guards. |
| Larger detail views and companion editors | Several files still mix long render sections and compressed callbacks. | Extract repeated rows/controls when behavior matches and expand callbacks when working on those features. |
| TV tooling | The TV TypeScript configuration does not enable strict checking, and the clients lack a common lint/format setup. | Introduce rules incrementally and resolve existing violations before making them required. |

These are maintainability findings, not observed functional failures. Broad
contract, provider, and tooling migrations deserve their own regression coverage.
Making everything generic or minimizing line count would make this code harder
to learn; prefer a small set of direct, reusable building blocks.

## TV dashboard assessment

The dashboard has useful foundations, but it is not consistently easy for a
junior to follow yet. `HomeScreen.tsx` mostly composes the header, cards, ambient
screen, and detail modal. Both automatic rows and the free grid reuse
`MeasuredDashboardCard` and the same content-fitting rules. `TVCard`, `TVText`,
`WatchPoster`, `TVProgressRing`, and `ActivityStats` are existing reusable pieces
worth retaining.

The main readability problem is concentrated responsibilities and dense JSX,
not file length alone. Before the weather detail split, roughly half of that
file was styles. Extracting meaningful sections simplified its responsibilities;
moving its styles alone would not have done that.

| Priority | Finding | Concrete improvement |
| --- | --- | --- |
| 1 | Some detail views still contain independently understandable sections. `MediaDetailView.tsx` combines sample media, native Play Next, the selected program, queue, and hide/restore dialogs. `WeatherSettings.tsx` still contains its entire add-city form and saved-city rows after the initial settings split. | Extract feature components such as `WatchQueue`, `WatchActionsModal`, `AddWeatherLocationForm`, and `SavedWeatherLocationRow`. Keep their state and callbacks explicit. |
| 2 | `DashboardProvider` coordinates summary polling, location preference migration/revisions, location weather, and optimistic task completion. `ThemeProvider` coordinates hydration, storage, remote writes, photo refresh, and appearance mutations. | Extract domain-specific hooks/services with observable tests for late responses, account changes, conflicts, and failed writes. Leave providers to compose their public values. |
| 3 | Focus handling is inconsistent across details and TypeScript strict checking is not enabled. | Reuse the existing focus hook where behavior matches; add explicit labels and visible focus states to extracted controls. Introduce stricter typing incrementally and add provider regression coverage before changing asynchronous behavior. |
| 4 | Some formatting and media episode/progress summaries still live in individual render functions. | Share pure domain calculations when behavior matches. Keep differing visual layouts and wording separate rather than adding configuration solely to share code. |

The dashboard cards now have separate domain, rendering, and measurement
responsibilities, and obsolete card implementations have been removed. The TV
typecheck, 14 unit tests, six browser tests, and Expo web export
pass. Browser checks cover all six cards at 50 footprints in both layout modes,
loading transitions, meal ordering, completed tasks, real zero weather values,
Play Next status changes, and weather detail selection, keyboard focus, and
missing forecast data. These checks do not verify provider lifecycle
behavior, every detail view, or native remote navigation.

## Local checks

From the repository root:

```sh
npm run typecheck
npm test
npm --prefix server/functions run lint
npm --prefix server/pairing-web run build
```

`npm test` runs TV request/card/activity-summary tests and backend tests. Browser tests are separate:
start Vite in `server/pairing-web`, then run `npm run test:browser` there with
Playwright and Chromium available. See that project's README for runtime overrides.
The tests mock authentication and upstream APIs and do not publish to production.
The TV has its own `npm run test:browser` script for the rendered-card fixture;
see `HomeScreen/HOMESCEEN_STRUCTURE.md` for the fixture server command.

TV settings focus and keyboard behavior should also be exercised on an Android
TV remote before release; browser tests and TypeScript cannot establish native
remote behavior.
