# Companion source folders

Keep an editor with the views, contracts, templates, and helpers that belong to
it. Move code into the app-wide `shared` folder when separate features actually
use it. Feature and subfeature folder names are lowercase.

```text
src/
├── main.ts                     Entry point and authentication/flow wiring
├── vite-env.d.ts
├── app/
│   └── companionPage.ts        Route copy, navigation, and common page markup
├── features/
│   ├── dashboard/
│   │   ├── appearanceEditor.ts Coordinator: drafts, Undo/Redo, conflicts, publish
│   │   ├── appearanceApi.ts    Requests and response validation
│   │   ├── appearanceModel.ts  Pure contracts, presets, normalization
│   │   ├── appearanceTemplate.ts
│   │   ├── cards/             Card controls and card styling
│   │   ├── grid/              Positioning, sizing, and grid gestures
│   │   ├── preview/           Dashboard preview rendering
│   │   ├── library/           Saved designs and published-history rows
│   │   ├── ambient/           Ambient editor and its preference helpers
│   │   └── photos/            Photo gallery and picker lifecycle
│   ├── weather/
│   │   └── weatherEditor.ts
│   └── devices/
│       ├── deviceManager.ts
│       └── apps/
│           └── deviceAppsEditor.ts
├── shared/
│   ├── apiClient.ts           Authenticated requests used across features
│   └── dom.ts                 Required DOM element lookup
└── styles/
    └── style.css              Current app-wide stylesheet
```

## Placement rules

- Keep private views and helpers with their feature. The ambient preferences
  belong with the ambient editor, and favorite-app controls belong under devices.
- Put behavior shared by several dashboard subfeatures at the dashboard level.
  For example, the appearance model is used by the coordinator, cards, preview,
  and API service.
- Use `src/shared` for utilities used by independent features, such as the
  authenticated request client. This is separate from the repository's
  `shared/src`, which provides pure contracts/utilities across applications.
- Keep future feature-specific styles with their feature. The current common
  stylesheet stays under `styles` to preserve the existing cascade.
- Import the defining module directly. Folder placement expresses ownership;
  it does not make exports global or prevent another module from importing them.
- Remove empty folders after moving code. Create a new feature folder when it
  has an implementation rather than adding empty placeholders.

`main.ts` still coordinates authentication, redirect recovery, and the existing
pairing, meal, and account flows. Extracting those controllers is a separate
behavioral refactor; it needs regression coverage for asynchronous account changes
and redirects. New extracted controllers should live in their own feature folders.

## Verification

Run `npm run build` for strict TypeScript checking and the Vite production build.
Start Vite with `npm run dev`, then run `npm run test:browser` with Playwright and
Chromium available. The tests cover companion routes and dashboard editing with
mocked authentication and API responses. `test/studio.html` is the dashboard's
development fixture; its module URLs follow the feature layout above.
