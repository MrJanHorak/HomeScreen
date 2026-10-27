# Vision and implementation status

Reconciled October 23, 2026 against source through `55ef529` and all 17 commits after the October 9 documentation baseline `5b0d802`. The original vision audit used `5d3ee1e`, the pre-audit README and original TV design/MVP plan. Checked items mean **implemented in source for the stated scope**, not fully deployed or certified on hardware. Unchecked items include partial implementations, explained below. See the [history audit](reviews/history-documentation-audit-2026-10-23.md) for commit coverage and [next-step plan](NEXT_STEPS.md) for completion gates.

The core household dashboard is substantially accomplished: the six original information cards, live integrations, remote detail panels, appearance customization, favorite apps, and idle ambient mode all exist. The broader product vision is incomplete. A single percentage would obscure the difference between implemented dashboard behavior, optional future ideas, and public-release readiness.

## Checked original vision

October 22, 2026 source update: installed-app metadata/artwork caching with package
invalidation, stable dashboard return focus, TV-local reduced motion, standard
Android network/settings/input controls, and an explicit-target hardware benchmark
are implemented. See [TV experience](../HomeScreen/TV_EXPERIENCE.md) for behavior,
verification, release requirements, and attribution. System Home replacement and a
standalone Android screensaver remain open; no hardware speedup is established.

Follow-up: a signed standalone APK at `025c1a9` passed signature/package/ABI and
bundled-license verification. The connected Sony TV received the header cleanup
through an in-place signed update. Five benchmark passes per build and the
Settings → Device control-presence check completed; frame results are mixed and
broader hardware checks remain pending. See the [dated device results](reviews/tv-benchmark-2026-10-22.md).
Desktop benchmark tooling records scenario/build metadata, compares results, and
uses fresh command WaitTime for resume because this TV caches cold TotalTime.

October 23 baseline follow-up: the installed header-update hash was confirmed,
Activity-detail return and system-settings section return passed, and ambient
arrow wake initially failed while Back worked. A later signed native-handler
build passed all four preview-arrow checks plus Select/Back and automatic-idle
arrow return to Activity on the Sony; it requires a new TV APK. A TV freeze during the ARD-return sequence
required recovery; surviving diagnostics do not identify its cause. Mirroring
was closed for the resumed pass. Physical standby wake, online app restart,
motion persistence and two later ARD-main-screen returns passed; the original
motion choice was restored. The original freeze is not proven fixed, and the
hardware gate remains open; see the
[dated baseline results](reviews/tv-baseline-2026-10-23.md).

October 25 startup investigation: a signed update defers background selection
until authentication/local appearance are ready, avoiding an unused default
photo for saved solid backgrounds. Five cold launches per build restored cached
data; sampled decode CPU fell, but launch ranges overlap and JS/render/GC work
remains. No overall speedup or minute-long-delay fix is established. See the
[startup evidence](reviews/tv-startup-2026-10-25.md).

October 25 focus follow-up: customized cards now retain their content theme during
focus/blur, avoiding unnecessary context-driven renders. A failing/passing React
regression and all eight experience browser checks passed; the signed update is
installed on the Sony. See the [focus investigation](reviews/tv-card-focus-2026-10-25.md)
for native measurements and limits. The original startup delay remains open.

Startup phase follow-up: bounded timing diagnostics are installed on the Sony.
Every measured cold launch restored the cache; untraced populated-card commits
took 3.0–6.8 seconds after JS entry. The real Firebase SDK's network-gated auth
initialization can wait 60 seconds in a local stalled-request probe; that would
hold the startup screen, and is not proof of the reported loading-card delay.
Secure-user reads took 16–36 ms in refined device samples. See the
[phase results and limits](reviews/tv-startup-milestones-2026-10-25.md).

October 25 package-change verification: all five temporary-fixture operations
(install, label/artwork update, disable, re-enable and removal) refreshed the Sony
Apps list automatically in the same retained HomeScreen process. The fixture was
removed and the original visible grid/focus restored. No product code change was
needed; the broader hardware gate remains open. See the
[device evidence](reviews/tv-package-changes-2026-10-25.md).

October 25 motion verification: the Sony passed reduced card zoom, sampled
plasma stillness with both the app and OS preference, and live OS-driven
stop/resume without an app restart. Original motion, ambient source and system
values were restored. No product change was needed; full photo/detail rotation
and TalkBack/audio remain open. See the [motion report](reviews/tv-motion-2026-10-25.md).

October 26 detail-return verification: Weather, Schedule, Meals, Activity and
Media each opened the expected detail panel and returned to the same card label
and bounds on the Sony. An initial Activity Select did not open details; its
cause is undetermined. Hidden widgets and removal/reorder fallback remain open.
See the [detail-return report](reviews/tv-details-2026-10-26.md).

October 26 ambient rotation: the selected three-photo loop, all five enabled
information types and four screen positions passed under standard and OS-reduced
motion at a temporary one-minute photo interval. Reduced motion preserved
rotation while sampled backgrounds stayed still between changes. Original
preferences were restored; other photo sources/cadences and audio accessibility
remain unverified. See the [rotation evidence](reviews/tv-ambient-rotation-2026-10-26.md).

October 9–17 changes also implement cached startup and bounded resume retries,
RSS/Atom widgets, grouped schedule details, beyond-goal activity visuals, pinned
meal details, wider media queue previews, sticky Cards/live ambient previews,
voice-preview refinements, TV poll creation and weather freshness improvements.
These refine the implemented dashboard; they do not add calendar week/month
browsing, task editing, profiles or a media catalog.

### Household information

- [x] Today's schedule and upcoming events from Google Calendar; detail agenda and event status.
- [ ] Full calendar experience: week/month navigation and an in-app calendar selector are missing. The backend reads up to ten Google-selected calendars and the next 14 days; shared calendars can appear when accessible to the connected account.
- [x] Google Tasks lists, due labels, and remote task completion.
- [ ] Full task management and completed-task history: upstream reads incomplete tasks; creation, editing, reopening, and persistent completed history are missing.
- [x] Daily activity, goals, basic metrics, and seven-day history via Google Fit.
- [x] Current weather, three-hour forecast samples and daily aggregates, saved locations, active/default city, and details. Default-city precedence, independent ten-minute weather caching, observation timestamps and foreground secondary-city preloading are implemented. Today's H/L covers remaining forecast samples, not full-day observed extrema.
- [x] Today's and upcoming dinners from an optional read-only Google Sheet, including supplied meal metadata.
- [ ] Full meal planning: editing, recipes/groceries views, and broader household meal management are missing.
- [x] Household polls for movie/game/dinner/activity questions, reusable rounds, QR participation, and aggregate TV results. Settings → Polls also creates a limited two-to-six-choice poll/round with idempotent retries; full management remains on the companion. These are generic polls; no movie/game catalog is attached.
- [x] RSS/Atom feed widget instances with per-card source/title/headline limits, companion previews/custom URLs, TV source selection/story summaries/QR links, and cached outage fallback. Added October 10; see [Feeds](../server/pairing-web/FEEDS.md) for release and validation scope.

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

- [x] Favorite installed app launcher row with native in-process metadata/artwork caching, package-change invalidation and manual refresh.
- [x] Return-focus memory, dashboard state preserved beneath ambient mode, TV-local reduced motion, and standard network/settings/input controls under Settings → Device. The extra header shortcut was removed.
- [x] Continue Watching from supported Android Play Next publishers, local queue/hide controls, and provider program intents when available.
- [ ] Media hub: TMDB/catalog lookup, persistent personal watchlists, recently watched, music-specific shortcuts, and user-controlled recommendations are missing. A favorite music app can already be launched as an app.
- [ ] Broader cross-app content links are missing beyond provider-published Play Next intents.
- [ ] Default system-home replacement is missing: `HomeScreen/app.json` declares LAUNCHER/LEANBACK_LAUNCHER, without a HOME intent category.
- [x] D-pad focus controls, back/exit behavior, adaptive widget layouts, and selectable detail views in source.
- [ ] Full TV polish still requires current-build physical remote, TalkBack/narration, font-scale, overscan, QR-distance, and couch-readability checks; browser fixtures cover only part of this.
- [x] Unified cached dashboard endpoint and isolation of upstream failures.
- [x] October 24 Calendar/Tasks recovery is deployed to the two dashboard Functions and installed on the Sony. It adds provider status and last-success timestamps, preserves bounded saved feeds during partial outages, labels unavailable/saved states, and disables stale task completion. Successful empty reads clear old items. Local outage/recovery checks and healthy native/production requests passed; real provider outages remain unverified. See the [provider recovery report](reviews/provider-recovery-2026-10-24.md).
- [x] Cached TV cold startup: an account-scoped dashboard summary persists locally and restores after session recovery while a background refresh runs. October 24 extends the restoration window from 24 hours to seven days so daily/weekend openings retain a fallback. Saved snapshots retain their source timestamp; the footer labels saved data while refreshing and shows timestamp/retry state after a failure. Sign-out/revocation clears them. Cache diagnostics identify misses/failures without account identifiers or household data. The signed update is installed on the Sony and logs confirm a cache restore; the reported minute-long startup is not yet reproduced or established fixed. See the [October 24 results](reviews/tv-cache-startup-2026-10-24.md).
- [x] Foreground summary refresh with a 15-second whole-operation deadline, immediate resume refresh, background cancellation, deduplicated requests and one/two/four/five-minute recovery retries. Hardware standby/offline recovery still needs the recorded smoke pass.
- [ ] Immediate/offline-first startup remains partial for first-ever launches, expired/missing caches, non-default-city weather, and separate Polls/People feeds. The backend still fetches providers on a cache miss. No scheduled dashboard prefetch exists; `syncUserData` is on demand.
- [ ] Universal search, Home Assistant/smart-home controls, quotes/jokes/opt-in verses remain unimplemented. RSS/Atom news/information feeds were added October 10.
- [ ] Other Smart TV platforms remain unimplemented; Android TV/Google TV is the native target, with a browser preview.

## Where the implementation deviated

| Original direction | Current implementation | Implication |
| --- | --- | --- |
| Home, Calendar, Watch, Favorites, Settings, Smart Home pages and bottom navigation | One dashboard, favorite-app row, modal details, and settings side menu | Simpler navigation supports the calm dashboard; standalone calendar/watch browsing remains absent. |
| Personal profiles and household-specific dashboards | One owner UID/configuration; other accounts can consent to activity-only sharing | Shared activity is useful, but layout ownership and personal feeds still do not switch by profile. |
| Broad media hub, TMDB, local watchlist, and deep links | Android Play Next and installed-app shortcuts | Content and resume behavior depend on publishers/device support. |
| Synchronize → cache → immediate display | Ten-minute backend summary cache with independent weather recheck, five-minute foreground requests and immediate resume refresh, persisted TV summary restored during background refresh | Returning TVs can display a saved summary offline after session recovery; first-ever/expired-cache latency and scheduled prefetch remain open. |
| General customization | Bounded 12×6 geometry and typed appearance, with fixed header/favorites | Predictable sizing and validation; arbitrary layouts/design tokens remain constrained. |
| Mostly TV-centric implementation | Companion studio, draft/history lifecycle, voting portal, and account controls | Makes remote-unfriendly editing practical, but increases maintenance and deployment scope. |
| Possible household polls and activity | Browser/invitation voting and explicit activity consent/expiry | Beyond the old signed-in-only poll roadmap; browser voting is not one verified person per vote. |
| Six fixed cards | Versioned widget instances for built-ins, polls, per-person activity, and RSS/Atom feeds | Expands the vision while preserving legacy fallback; arbitrary plugin widgets remain outside scope. |

These changes broadly preserve the ad-free, useful, calm dashboard intent. The material departures are platform-limited entertainment, shared rather than individual dashboards, and first-load provider fetching when no usable TV cache exists. Richer editing and larger widgets need real couch-distance usability evidence to confirm the calm/readable goal.

## Missing work and recommended order

The [next-step plan](NEXT_STEPS.md) is authoritative for order, reasons and completion evidence:

1. **Finish the current-build TV baseline, then profile rendering.** Complete the remaining remote/lifecycle/offline checks. Use a controlled native trace to investigate the mixed October 22 frame results before changing shared rendering.
2. **Start activity migration feasibility alongside the baseline.** Fit REST is still in use. Google's [migration guide](https://developer.android.com/health-and-fitness/health-connect/migration/fit) retains the end-of-2026 support limit, while the [Health API site](https://developers.google.com/health) now describes new-developer onboarding. Prove project access and metric coverage before selecting a server adapter or phone ingestion route. Guidance rechecked October 23.
3. **Close integration/release and data-trust gaps.** Record the applicable deployed revisions, live consent/vote/sharing/sync results and security/release gates. October 24 Calendar/Tasks failure/freshness handling is deployed; live provider-outage/recovery verification remains open.
4. **Deliver one core-use workflow.** Calendar source selection and week navigation are the recommended next feature after reliability; validate household demand against task editing/history or watchlists. Decide ownership before implementing profiles or per-TV designs.
5. **Defer optional expansion until those gates pass.** Broader media, search, smart-home and time-of-day modes remain possible scope rather than commitments. RSS/Atom is already implemented.

## Release and verification evidence

| Evidence | What it establishes | What remains unknown |
| --- | --- | --- |
| [October 5 security review](../server/SECURITY_REVIEW.md) | Dated source fixes and production observations, including excessive IAM and a then-debug-signed APK | Current IAM, deployment of fixes, dependency state, and later-feature security coverage were not rechecked in this audit. |
| [October 6 release guide](../HomeScreen/RELEASE.md) | Records signed APK/AAB checks and install/cold launch on one Sony TV | Historical build evidence; 16 KB runtime and Play review remain outstanding. Later source is not covered by that build alone. |
| [October 22 TV report](reviews/tv-benchmark-2026-10-22.md) and [smoke checklist](../HomeScreen/TV_TEST_CHECKLIST.md) | Signed `025c1a9` baseline, signed header-cleanup update, five benchmark passes per build, retained account/preferences, header and Device-panel inspection on Sony VU1 | Mixed frame results; both builds contain the app cache. Detail/favorite return, ambient/motion, actual input switching, standby and broader accessibility/integration checks remain open. |
| [Polls](../server/pairing-web/POLLS.md), [People](../server/pairing-web/PEOPLE.md), TV accessibility guides | Source behavior, mocked coverage, and required staging/hardware flows | Current rollout, multi-account consent, live latency/capacity, native accessibility, and physical usability remain unverified here. |

Both documentation audits changed documentation only; intervening implementation is described in the [TV client architecture](architecture/tv-client.md#cached-cold-start) and feature guides. Fresh October 23 local checks are recorded in the [history audit](reviews/history-documentation-audit-2026-10-23.md#validation). Historical test counts below and in dated design/review documents remain historical. Browser, emulator, cloud, and hardware checks are not inferred from unit/type checks.

Fresh October 9 checks: `npm run typecheck` passed for both clients and the backend build. `npm test` passed 51 TV tests and 123 backend tests; 12 emulator-dependent backend tests skipped because no Firestore emulator was configured. Local documentation validation checked 33 Markdown documents and 204 relative links/heading anchors with no missing targets. `git diff --check` passed. Browser fixtures, cloud deployment, OAuth smoke tests, APK builds, and physical hardware checks were not rerun for this documentation-only change.

## Source evidence

Cached-start implementation checks (October 9): `npm test` in `HomeScreen` passed
67 tests, including 16 cache/session/provider/startup regressions; TV TypeScript checking
passed. Local appearance hydration also releases startup without waiting for remote
settings, so a stalled appearance request cannot block summary restoration. The
cache implementation required no backend changes or new dependencies.
Physical TV cold launch, cloud deployment, and APK build were not rerun; the
[TV client guide](architecture/tv-client.md#cached-cold-start) records the hardware
verification steps.

Key source paths used for the assessment:

- [TV composition](../HomeScreen/App.tsx), [dashboard refresh/state](../HomeScreen/src/context/DashboardContext.tsx), and [native target/intents](../HomeScreen/app.json).
- [Calendar feed](../server/functions/src/services/googleCalendar.ts), [Tasks read/completion](../server/functions/src/services/googleTasks.ts), and [dashboard aggregation/failures](../server/functions/src/services/dashboardSummary.ts).
- [Widget instance validation](../server/functions/src/utils/widgets.ts), [card styling](../server/functions/src/utils/cardStyle.ts), and [reading contract](../server/functions/src/utils/reading.ts).
- [Endpoint exports](../server/functions/src/index.ts), [Hosting routes](../server/firebase.json), and [companion route shell](../server/pairing-web/src/app/companionPage.ts).
- [Polls provider](../HomeScreen/src/context/PollsContext.tsx), [People provider](../HomeScreen/src/context/PeopleContext.tsx), and [narration provider](../HomeScreen/src/accessibility/NarrationContext.tsx).

## October 9 documentation findings and cleanup

The documentation was **not fully current or consistently structured**. The root README mixed vision, implementation updates, API detail, troubleshooting, and future ideas. The roadmap/TV README called polls, sharing, history, and reading controls future work. Companion instructions incorrectly described legacy session auto-registration, a pairing-root redirect, TV-only Photos selection, and the earlier five-page site. Folder diagrams omitted providers/features, and security prose described only six-card geometry.

The root README is now a short entry point. Architecture, widget design, historical vision, and general reviews have dedicated folders and a [documentation index](README.md). Component setup, release, security, feature workflows, asset attribution, and test guides stay beside their owners. Links are updated, the misspelled structure filename is removed, and the accumulated README is preserved as a historical snapshot. The roadmap/component summaries acknowledge completed features and partial work. Original MVP phases have checked items with qualifications rather than blanket phase completion.

Detailed proposals and dated review results remain references, not claims of current production verification. Live-provider/hardware checks are still needed; this is a source-based audit, not a claim that every external link, screenshot, or operational setting is current.
