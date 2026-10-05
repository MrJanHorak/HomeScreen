# Component folders

Keep a component beside the subcomponents, hooks, and types that belong to it.
Use the smallest shared scope that matches its actual consumers. Folder names
are lowercase; component filenames use PascalCase and hook filenames use `use…`.

```text
components/
├── shared/                 Reusable TV controls and visuals
│   ├── TVCard.tsx
│   ├── TVText.tsx
│   ├── TVDetailModal.tsx
│   ├── TVProgressRing.tsx
│   └── WatchPoster.tsx
├── dashboard/
│   ├── AdaptiveDashboardCard.tsx
│   ├── MeasuredDashboardCard.tsx
│   ├── DashboardGrid.tsx
│   ├── shared/             Card frame, rows, layout planner, measurement hook
│   ├── activity/           Activity card and its ring, metrics, stats, weekly view
│   ├── weather/
│   ├── schedule/
│   ├── media/
│   ├── meals/
│   ├── tasks/
│   ├── header/             HeaderBar and its private clock/greeting hooks
│   └── favorites/
├── details/
│   ├── weather/            WeatherDetailView and its forecast subcomponents
│   ├── activity/
│   ├── schedule/
│   ├── media/
│   ├── meals/
│   └── tasks/
├── settings/
│   ├── SettingsDetailView.tsx
│   ├── shared/             Panels and Photos picker used by settings sections
│   ├── appearance/         AppearanceSettings and its color picker
│   ├── ambient/
│   ├── weather/
│   ├── device/
│   ├── favorites/
│   ├── meals/
│   └── companion/
├── ambient/                AmbientScreen, PlasmaBackdrop, idle-mode hook
└── layout/                 App wrapper and exit confirmation
```

## Choosing a location

- One owner: keep the implementation with that owner. For example,
  `ActivityRingContent` belongs in `dashboard/activity`, and the clock hook
  belongs in `dashboard/header`.
- Several components within one area: use that area's `shared` folder. The
  content frame belongs in `dashboard/shared`; the Photos picker belongs in
  `settings/shared` because appearance and ambient settings both use it.
- Consumers across areas: use `components/shared` for reusable UI. Pure helpers
  such as weekly activity calculations stay in `src/helpers` when dashboard and
  detail views both use them. Hooks used across areas stay in `src/hooks`.

Small private components can remain in their parent's file until extracting them
makes the file easier to follow. Add another folder level when it expresses
ownership clearly, rather than giving every single file its own folder.
Remove empty folders when their contents move.

## Reuse and imports

Components are reused through explicit exports and imports. A nested folder
does not make a component private, and the shared folder does not register
components globally. Import the named file directly so its origin is clear.

`components/shared` is shared within the TV application. It is separate from
the repository's `shared/src`, which contains pure contracts and utilities used
by the TV, companion, and backend. TV components such as `TVCard` still require
the providers described by their implementation.
