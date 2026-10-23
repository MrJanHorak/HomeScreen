# Git history and documentation audit — October 23, 2026

Compared all 17 commits after the October 9 documentation baseline `5b0d802`
through `55ef529`, their source/test/documentation diffs, current source and
operational guides. This audit changes documentation only. It does not inspect
current cloud deployments or install/run a new TV binary.

## Findings and reconciliation

Most feature-local guides were maintained alongside implementation. The drift
was concentrated in the root/status/roadmap summaries, architecture diagrams,
TV usage guidance, and the distinction between packaging checks and actual
hardware results. The October 22 benchmark report already correctly qualifies
its results and remains the source of device measurements.

| Commits | Implemented change checked against source | Documentation result |
| --- | --- | --- |
| `0d9281b` | UID-scoped persisted summary, independent local appearance hydration, disk/network race handling and cleanup. | Already in the cache architecture; status now distinguishes implemented restoration from unverified offline hardware behavior. |
| `0f4b96c`, `99e13ed` | RSS/Atom instances, custom/preset sources, richer story/image rendering, QR links and separate disk fallback. | Feeds guide already current; component diagrams now include FeedsProvider and feed card/detail routing. |
| `1c11159` | Schedule card/agenda simplification and calendar display-name fallback. | Retain the dated schedule design update; current TV guide now describes grouped agenda behavior rather than the older two-column schedule. Week/month browsing remains missing. |
| `d80229c`, `8dad96a`, `412b4dc` | Beyond-goal activity progress, activity detail layout/status refinements, and pinned current meal beside scrollable following meals. | Bring current status and TV layout guidance forward; these are refinements of implemented features, not new provider support. |
| `efaec71`, `15d4021` | Sticky live Cards preview, focused Adjust controls, grouped card additions, photo/feed positioning and cache validation refinements. | Settings regression guide already detailed; add concise current TV workflow guidance and retain its fixture commands. |
| `6111fae` | Voice selection/preview reliability, startup/load deadlines and speech cancellation. | Existing narration guidance broadly correct; summarize preview availability without claiming native TalkBack/TTS verification. |
| `d27941e` | Shared ambient backdrop renderer and live thumbnail in settings. | Add thumbnail/full-preview distinction to TV usage guidance. |
| `bec0b0f` | Wider short media cards show additional queued covers. | Existing TV README already current; no implication of a new media catalog/watchlist. |
| `e7f0aaa` | TV multiple-choice poll creation, idempotent request IDs, transactional device checks, and revised Cards arrangement/add/remove controls. | Polls and Settings guides already current; root/status/roadmap/TV usage now acknowledge TV creation and its limited authorization. |
| `f85f095` | Foreground-only summary sessions, cancellation, immediate resume refresh, whole-operation timeout and retry backoff; quiet fixed-height sync footer. | Cache architecture already describes the behavior; summaries and diagrams now reflect it. Physical standby remains unverified in the dated device report. |
| `747c63b` | App settings refinements; weather default-city precedence, independent cache TTL, observation timestamps, future-sample ranges and secondary-city preloading. | Functions guide already detailed; add TV-facing explanation and correct its JSON example to mark H/L as rest-of-day. No claim that both deployments are current. |
| `025c1a9` | Native app/artwork cache, invalidation, focus memory, motion preference, TV controls, mounted dashboard beneath ambient, benchmark tooling and notices. | Dedicated experience guide already current; fix the old architecture hierarchy and clarify remaining image-cache scope. |
| `55ef529` | Remove extra header shortcut; keep controls in Device settings; benchmark comparison and Sony evidence. | Preserve measured mixed results. Link the partial hardware pass from release/status summaries; clarify baseline versus header-update APK identities in the smoke checklist. |

## Planning corrections

- The release evidence is newer than October 6: a signed October 22 baseline and
  in-place header update have packaging and limited Sony verification. That does
  not complete the outstanding remote/lifecycle matrix or cloud rollout.
- Frame p95 worsened in the comparison while weighted jank decreased. Both builds
  already contain the app cache, so these measurements cannot quantify the cache
  optimization. The next performance task is a controlled trace, not a speedup
  claim or another speculative rendering change.
- Calendar/Tasks failures still become empty successful-summary arrays in
  `server/functions/src/services/dashboardSummary.ts`. Distinguishing unavailable
  from truly empty data remains a concrete reliability task.
- The old cache prose overstated freshness labeling: `HomeScreen.tsx` renders the
  footer only when `error` is set. Restoration retains `lastUpdated`/`isCached`
  but does not itself display a pending-refresh label. Corrected the guides and
  included that missing state in the data-trust completion gate.
- Activity still reads Fit REST in `server/functions/src/services/googleFit.ts`.
  Google's [migration guidance](https://developer.android.com/health-and-fitness/health-connect/migration/fit)
  retains the end-of-2026 support limit. Its [Health API site](https://developers.google.com/health)
  now provides new-developer getting-started routes, superseding the October 9
  blanket onboarding statement. Access and metric coverage for this project
  still need proof. External guidance checked October 23.

The authoritative [next-step plan](../NEXT_STEPS.md) orders the work, explains
dependencies and defines completion evidence. Profile/per-TV ownership is a
design decision; broader calendar/tasks/media, smart-home and launcher scope
remain incomplete. Recent UI improvements do not close those product gaps.

## Validation

Fresh local checks on October 23:

- `npm run typecheck`: passed both client checks and the Functions TypeScript build.
- `npm test`: 112 TV tests and 143 backend tests passed; 12 backend tests skipped
  because no Firestore emulator was configured. No test failures.
- `npm --prefix server/functions run lint`: passed.
- `npm --prefix server/pairing-web run build`: passed.
- Local Markdown target/heading check: 206 tracked/new documents, 504 relative
  links, no missing targets or unmatched anchors.
- `git diff --check`: passed.

Earlier test counts in dated reviews remain historical. Browser fixtures,
Firestore-emulator transactions, Android builds, live consent/cloud deployment
and physical-TV checks were not rerun. Local checks cannot close those gates.
