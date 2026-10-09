# Vision and implementation status

Audited October 9, 2026 against source at `5d3ee1e`, the pre-audit README, original TV design/MVP plan, component guides, tests, and dated release/security evidence. Checked items mean **implemented in source for the stated scope**, not fully deployed or certified on hardware. Unchecked items include partial implementations, explained below.

The core household dashboard is substantially accomplished: the six original information cards, live integrations, remote detail panels, appearance customization, favorite apps, and idle ambient mode all exist. The broader product vision is incomplete. A single percentage would obscure the difference between implemented dashboard behavior, optional future ideas, and public-release readiness.

## Checked original vision

### Household information

- [x] Today's schedule and upcoming events from Google Calendar; detail agenda and event status.
- [ ] Full calendar experience: week/month navigation and an in-app calendar selector are missing. The backend reads up to ten Google-selected calendars and the next 14 days; shared calendars can appear when accessible to the connected account.
- [x] Google Tasks lists, due labels, and remote task completion.
- [ ] Full task management and completed-task history: upstream reads incomplete tasks; creation, editing, reopening, and persistent completed history are missing.
- [x] Daily activity, goals, basic metrics, and seven-day history via Google Fit.
- [x] Current weather, hourly/daily forecasts, saved locations, active/default city, and details.
- [x] Today's and upcoming dinners from an optional read-only Google Sheet, including supplied meal metadata.
- [ ] Full meal planning: editing, recipes/groceries views, and broader household meal management are missing.
- [x] Household polls for movie/game/dinner/activity questions, reusable rounds, QR participation, and aggregate TV results. These are generic polls; no movie/game catalog is attached.

### Personalization and idle use

- [x] Enable/hide, reorder, resize, and position widgets; automatic rows and free layout.
- [x] Palette/accent, card surfaces/borders/corners, backgrounds, saved Google Photos, and photo zoom.
- [x] Phone companion for layout, service setup, photos, polls, people, account/TV management, and per-TV favorite apps.
- [x] Persistent preferences, synchronized published appearance, drafts, Undo/Redo, named designs, and published revision history.
- [x] Idle ambient transition, photo slideshow, plasma/dark backdrops, clock, and rotating selected information.
- [ ] Automatic time-of-day themes and distinct schedule/art/astronomy ambient experiences are missing; the implemented ambient mode rotates information.
- [x] Reading font/color/weight/spacing options and optional local spoken navigation.
- [ ] Multiple personal profiles with separate calendars, tasks, media, backgrounds, and layouts are missing. Consented shared activity widgets are implemented, but do not constitute profile switching or general household roles.
- [ ] Independent per-TV dashboard designs are missing. Layout/appearance are account-wide; favorite apps and narration are device-specific.

### Entertainment, platform, and reliability

- [x] Favorite installed app launcher row.
- [x] Continue Watching from supported Android Play Next publishers, local queue/hide controls, and provider program intents when available.
- [ ] Media hub: TMDB/catalog lookup, persistent personal watchlists, recently watched, music-specific shortcuts, and user-controlled recommendations are missing. A favorite music app can already be launched as an app.
- [ ] Broader cross-app content links are missing beyond provider-published Play Next intents.
- [ ] Default system-home replacement is missing: `HomeScreen/app.json` declares LAUNCHER/LEANBACK_LAUNCHER, without a HOME intent category.
- [x] D-pad focus controls, back/exit behavior, adaptive widget layouts, and selectable detail views in source.
- [ ] Full TV polish still requires current-build physical remote, TalkBack/narration, font-scale, overscan, QR-distance, and couch-readability checks; browser fixtures cover only part of this.
- [x] Unified cached dashboard endpoint and isolation of upstream failures.
- [ ] Immediate/offline-first startup is partial: the backend fetches providers on a cache miss; the TV keeps a successful snapshot in memory during temporary failures, but does not persist the summary across cold starts. No scheduled dashboard prefetch exists; `syncUserData` is on demand.
- [ ] Universal search, Home Assistant/smart-home controls, news/information feeds, quotes/jokes/opt-in verses remain unimplemented.
- [ ] Other Smart TV platforms remain unimplemented; Android TV/Google TV is the native target, with a browser preview.

## Where the implementation deviated

| Original direction | Current implementation | Implication |
| --- | --- | --- |
| Home, Calendar, Watch, Favorites, Settings, Smart Home pages and bottom navigation | One dashboard, favorite-app row, modal details, and settings side menu | Simpler navigation supports the calm dashboard; standalone calendar/watch browsing remains absent. |
| Personal profiles and household-specific dashboards | One owner UID/configuration; other accounts can consent to activity-only sharing | Shared activity is useful, but layout ownership and personal feeds still do not switch by profile. |
| Broad media hub, TMDB, local watchlist, and deep links | Android Play Next and installed-app shortcuts | Content and resume behavior depend on publishers/device support. |
| Synchronize → cache → immediate display | Ten-minute backend cache, five-minute dashboard requests, cache-miss provider fetching | Repeat reads benefit from caching; first-load latency and offline cold start remain unsolved. |
| General customization | Bounded 12×6 geometry and typed appearance, with fixed header/favorites | Predictable sizing and validation; arbitrary layouts/design tokens remain constrained. |
| Mostly TV-centric implementation | Companion studio, draft/history lifecycle, voting portal, and account controls | Makes remote-unfriendly editing practical, but increases maintenance and deployment scope. |
| Possible household polls and activity | Browser/invitation voting and explicit activity consent/expiry | Beyond the old signed-in-only poll roadmap; browser voting is not one verified person per vote. |
| Six fixed cards | Versioned widget instances for built-ins, polls, and per-person activity | Expands the vision while preserving legacy fallback; this is not an unrestricted plugin/feed system. |

These changes broadly preserve the ad-free, useful, calm dashboard intent. The material departures are platform-limited entertainment, shared rather than individual dashboards, and a cache strategy that does not yet meet the immediate-start target. Richer editing and larger widgets need real couch-distance usability evidence to confirm the calm/readable goal.

## Missing work and recommended order

1. **Establish current release evidence.** Test applicable backend, Hosting, indexes/TTL and a current TV binary in staging; verify Google consent, Hosting vote cookies, two-account activity sharing/revocation, settings synchronization, and physical remote/readability. Recheck IAM, dependencies, cost/abuse controls, privacy/retention, OAuth verification, and Play requirements from the security/release guides. Earlier observations do not establish today's production state.
2. **Migrate activity away from Google Fit.** The current adapters use Fit REST. Google's [Fit migration guide](https://developer.android.com/health-and-fitness/health-connect/migration/fit) says support lasts only through the end of 2026. The [Google Health API page](https://developers.google.com/health) currently says new projects are not being onboarded. Validate project eligibility and needed metrics before choosing the replacement; Health Connect would need a phone-side ingestion path. These vendor statements were checked October 9.
3. **Close core-use gaps before adding more widgets.** Improve cold-start/cache freshness and offline behavior; expose meaningful failure/staleness states (Calendar/Tasks currently become empty arrays when their providers fail). Decide whether week/month calendar views, task editing/history, or watchlists are the next household priority.
4. **Decide the ownership model.** Choose whether profiles, household roles/source-specific sharing, or independent per-TV designs are needed. Activity invitations grant activity viewing only; they do not solve collaborative dashboard management.
5. **Expand optional scope deliberately.** Media catalogs/linking, time-of-day modes, feed widgets, universal search, and smart-home controls can follow. The original plan listed possibilities rather than a commitment to implement all of them.

## Release and verification evidence

| Evidence | What it establishes | What remains unknown |
| --- | --- | --- |
| [October 5 security review](../server/SECURITY_REVIEW.md) | Dated source fixes and production observations, including excessive IAM and a then-debug-signed APK | Current IAM, deployment of fixes, dependency state, and later-feature security coverage were not rechecked in this audit. |
| [October 6 release guide](../HomeScreen/RELEASE.md) | Records signed APK/AAB checks and install/cold launch on one Sony TV | Does not validate October 7–9 changes or all hardware interactions; 16 KB runtime and Play review remain outstanding. The debug-signature finding has newer documented build evidence. |
| [Polls](../server/pairing-web/POLLS.md), [People](../server/pairing-web/PEOPLE.md), TV accessibility guides | Source behavior, mocked coverage, and required staging/hardware flows | Current rollout, multi-account consent, live latency/capacity, native accessibility, and physical usability remain unverified here. |

This audit changes documentation only. Fresh local check outcomes are recorded below after validation; historical test counts in dated design/review documents remain historical. Browser, emulator, cloud, and hardware checks are not inferred from unit/type checks.

Fresh October 9 checks: `npm run typecheck` passed for both clients and the backend build. `npm test` passed 51 TV tests and 123 backend tests; 12 emulator-dependent backend tests skipped because no Firestore emulator was configured. Local documentation validation checked 33 Markdown documents and 204 relative links/heading anchors with no missing targets. `git diff --check` passed. Browser fixtures, cloud deployment, OAuth smoke tests, APK builds, and physical hardware checks were not rerun for this documentation-only change.

## Source evidence

Key source paths used for the assessment:

- [TV composition](../HomeScreen/App.tsx), [dashboard refresh/state](../HomeScreen/src/context/DashboardContext.tsx), and [native target/intents](../HomeScreen/app.json).
- [Calendar feed](../server/functions/src/services/googleCalendar.ts), [Tasks read/completion](../server/functions/src/services/googleTasks.ts), and [dashboard aggregation/failures](../server/functions/src/services/dashboardSummary.ts).
- [Widget instance validation](../server/functions/src/utils/widgets.ts), [card styling](../server/functions/src/utils/cardStyle.ts), and [reading contract](../server/functions/src/utils/reading.ts).
- [Endpoint exports](../server/functions/src/index.ts), [Hosting routes](../server/firebase.json), and [companion route shell](../server/pairing-web/src/app/companionPage.ts).
- [Polls provider](../HomeScreen/src/context/PollsContext.tsx), [People provider](../HomeScreen/src/context/PeopleContext.tsx), and [narration provider](../HomeScreen/src/accessibility/NarrationContext.tsx).

## Documentation findings and cleanup

The documentation was **not fully current or consistently structured**. The root README mixed vision, implementation updates, API detail, troubleshooting, and future ideas. The roadmap/TV README called polls, sharing, history, and reading controls future work. Companion instructions incorrectly described legacy session auto-registration, a pairing-root redirect, TV-only Photos selection, and the earlier five-page site. Folder diagrams omitted providers/features, and security prose described only six-card geometry.

The root README is now a short entry point. Architecture, widget design, historical vision, and general reviews have dedicated folders and a [documentation index](README.md). Component setup, release, security, feature workflows, asset attribution, and test guides stay beside their owners. Links are updated, the misspelled structure filename is removed, and the accumulated README is preserved as a historical snapshot. The roadmap/component summaries acknowledge completed features and partial work. Original MVP phases have checked items with qualifications rather than blanket phase completion.

Detailed proposals and dated review results remain references, not claims of current production verification. Live-provider/hardware checks are still needed; this is a source-based audit, not a claim that every external link, screenshot, or operational setting is current.
