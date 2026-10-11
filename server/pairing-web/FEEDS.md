# Feed widgets

Implemented in source October 10, 2026. Production deployment and a new TV binary are still required; browser fixtures do not establish physical remote/couch-distance behavior.

On the companion Dashboard, **Layout & cards → Add a feed widget** offers BBC World, BBC Technology, Guardian World, Ars Technica, NASA News, or a custom public HTTPS RSS/Atom URL. All five presets were successfully fetched and parsed on October 10. Preview a source, choose a title and 3/5/8 headline limit, then add it. Multiple instances may use the same source. Each retains its own source, title, headline limit, appearance, and position.

Select a feed widget in the editor to apply updated feed settings to the draft. Feed changes participate in existing Undo/Redo, autosaved drafts, named designs and history. **Save to TV** publishes the draft. Hide, reorder, resize and remove work with the normal widget controls. Existing limits still apply: eight visible widgets in automatic rows, twelve on the free canvas, and twenty-four total instances.

On TV, Settings → Appearance offers preset feed cards and normal layout controls, including removing feed instances. Open a feed card to select another preset or any custom source already configured in another widget, change its headline limit, refresh stories, or browse all available stories. Selecting a story shows its publisher summary, source/date, and a QR link to the original article. Back returns to the list before closing the panel. Custom URL entry and titles are configured on the companion site. TV source/count changes sync through the existing account appearance settings.

## Data and limits

- `POST /feeds` accepts `{urls: string[]}` (1–12). Owner and managed-TV authentication are required. Duplicate URLs are fetched once per request. Responses contain bounded plain-text summaries and original HTTP(S) article links, never publisher HTML.
- RSS 2, RSS/RDF and Atom are supported. Images and full-article extraction are outside this version. Empty feeds remain empty, missing dates remain unlabeled, and malformed/blocked feeds show an error.
- Per-account server caches refresh on demand after fifteen minutes. Concurrent requests share a transactional lease. A failed refresh retains successful stories and backs off for one minute. TV requests pause in background/ambient mode and retry failures with increasing delays.
- TV snapshots are bounded, validated, scoped by UID and restored during startup. They expire after seven days and are removed after pending writes on sign-out. Restored or failed data is labeled as potentially out of date.
- Feed requests are limited to 120 per minute per account; actual downloads to 60 per hour. HTTP is accepted only for original article links, not feed fetching. Private networks, IP-literal feed URLs, credentials, unusual ports, unsafe redirect targets and XML DTD/entities are rejected. DNS answers are pinned to the HTTPS socket; TLS retains the publisher hostname. Downloads have a ten-second deadline, three-redirect limit and one-megabyte body limit. Up to thirty articles are returned.
- `users/{uid}/feedCache/{urlHash}` is covered by account recursive deletion. Enable Firestore TTL for collection group `feedCache`, field `expiresAt`, to remove inactive cached feeds after seven days. TTL is retention housekeeping; authentication and freshness are enforced by the function.
- Public feed availability can change and article links may lead to subscription content. Review the selected publisher's feed terms before public/commercial redistribution. A preset indicates technical compatibility, not a content license.

## Release and verification

Deploy Functions (including the new `feeds` export and updated appearance validation), then the companion, then build/install the updated TV app. Old TV binaries cannot render feed instances; their six built-in fallback cards remain available. All TVs still share the account's published layout.

Run root `npm run typecheck`, `npm test`, backend `npm run lint`, and companion `npm run build`. Backend feed fixtures cover parsing, private-address guards, authentication, cache/lease fallback and independent configuration. With the companion Vite fixture on 5173, run `node --test test/appearanceEditor.test.cjs`. With the TV card Vite fixture on 5174, run `node --test test/feeds.test.cjs`. The TV feed fixture checks all fifty legal card sizes in compact/full reading modes plus story/QR/back/source selection. Bundled Playwright can be supplied through `NODE_PATH`, and installed Chromium through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

October 10 verification: the companion editor browser suite (22 cases) passed, as did the TV feed and existing nested voice-picker Back checks (7 cases). Browser screenshots were visually reviewed. A duplicate Escape handler in the shared web detail modal was removed so returning from a story does not also close its feed panel. Emulator/production and physical TV checks remain release work.
