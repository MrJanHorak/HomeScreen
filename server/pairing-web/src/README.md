# Companion source folders

Keep an editor with the views, contracts, templates, and helpers that belong to
it. Move code into the app-wide `shared` folder when separate features actually
use it. Feature and subfeature folder names are lowercase.

```text
src/
├── main.ts                     Bootstrap, authentication, active-feature wiring
├── vite-env.d.ts
├── app/
│   ├── companionPage.ts        Route copy, navigation, and common page shell
│   ├── authNavigation.ts       Remember/recover paths across sign-in redirects
│   └── signInError.ts          Firebase sign-in error copy
├── features/
│   ├── dashboard/
│   │   ├── appearanceEditor.ts Coordinator: drafts, Undo/Redo, conflicts, publish
│   │   ├── appearanceApi.ts    Requests and response validation
│   │   ├── appearanceModel.ts  Pure contracts, presets, normalization
│   │   ├── appearanceTemplate.ts
│   │   ├── readingEditor.ts   Reading controls
│   │   ├── cards/             Card controls and card styling
│   │   ├── grid/              Positioning, sizing, and grid gestures
│   │   ├── preview/           Dashboard preview rendering
│   │   ├── library/           Saved designs and published-history rows
│   │   ├── ambient/           Ambient editor and its preference helpers
│   │   └── photos/            Photo gallery and picker lifecycle
│   ├── polls/                React management/voting/widget editor and private CSS
│   ├── people/               React sharing manager and private CSS
│   ├── weather/
│   │   └── weatherEditor.ts
│   ├── pairing/                Pairing controller and form template
│   ├── meals/                  Meal controller and section template
│   ├── account/                Account controller and section template
│   └── devices/
│       ├── deviceManager.ts
│       └── apps/
│           └── deviceAppsEditor.ts
├── shared/
│   ├── apiClient.ts           Authenticated requests used across features
│   ├── dom.ts                 Required element lookup and status messages
│   └── googleAuthorization.ts Validate Google authorization redirect URLs
└── styles/
    ├── style.css              Base stylesheet
    ├── companion.css          Companion shell
    └── reading.css            Reading controls
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

`companionPage.ts` renders the common shell plus only the current route's feature
template. `main.ts` constructs just that feature and connects authentication to
its `load`/`clear` lifecycle. Constructors initialize their controls without
starting network work. An account change clears the previous user's feature state
before loading the next user's data; sign-out also clears it. Controllers ignore
late asynchronous completions after clearing. The account controller composes
the device manager, which owns the per-TV app editors.

Keep markup and control state with their feature. A small private render helper
can remain in its owner file; extract a template when it clarifies a substantial
view. Use shared status and request helpers before adding another wrapper or
controller abstraction. All current features expose their own lifecycle directly.

## Verification

Run `npm run build` for strict TypeScript checking and the Vite production build.
Start Vite with `npm run dev`, then run `npm run test:browser` with Playwright and
Chromium available. The tests cover companion routes and dashboard editing with
mocked authentication and API responses. `test/studio.html` is the dashboard's
development fixture; its module URLs follow the feature layout above.
