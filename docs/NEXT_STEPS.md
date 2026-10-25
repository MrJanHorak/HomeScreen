# Next steps and completion gates

Reviewed October 23, 2026 against source through `55ef529`. This is the ordered
work plan; [project status](PROJECT_STATUS.md) owns the feature inventory and the
[history audit](reviews/history-documentation-audit-2026-10-23.md) records why the
plan changed. All gates below remain open unless a dated result says otherwise.

## Start with one verifiable TV baseline

October 25 follow-up: a [native startup trace and five-pass comparison](reviews/tv-startup-2026-10-25.md)
led to a scoped background-readiness fix, now installed on the Sony. Cache
restoration passed; decode work fell in the trace pair, while overall timings
remain mixed. A subsequent [card-focus investigation](reviews/tv-card-focus-2026-10-25.md)
removed unnecessary content renders for customized card surfaces and installed a
signed update. Startup presentation/allocation work and the open hardware checks
remain; these scoped fixes do not complete the rendering or lifecycle gates below.

The next work item should be a **current-build remote/lifecycle verification pass
on the Sony TV**, followed by a controlled rendering trace. Existing source and
unit coverage are substantial, but the October 22 measurements do not establish
focus restoration, standby recovery, ambient behavior, or an overall speedup.
Finish this evidence before another visual redesign.

The [October 23 baseline pass](reviews/tv-baseline-2026-10-23.md) found an ambient
arrow-wake failure and a TV freeze during the first ARD-return sequence. Diagnose
and retest failures before treating step 1 as complete or moving to a
performance change. The ambient native-handler update subsequently passed all
four preview-arrow checks plus Select/Back and automatic-idle arrow return to
Activity on the Sony; the dated report records the binary and validation.
Standby recovery, motion persistence and two later ARD
returns passed with mirroring off. These successful individual checks do not erase
the original failure; the report distinguishes observed passes and open work.

| Order | Work and reason | Completion evidence |
| --- | --- | --- |
| 1. TV baseline | Identify the installed APK by source/build record and hash; run the remaining [TV smoke checks](../HomeScreen/TV_TEST_CHECKLIST.md) and [cached-start checks](architecture/tv-client.md#cached-cold-start). Recent commits changed background cancellation, return focus, app discovery and ambient mounting together. | A dated device/build record with actual results for detail/favorite return, ambient wake, both motion modes, standby, offline restart/reconnect, account isolation, app install/update/disable, system settings and input behavior. Record unsupported OEM controls and reproducible failures. Fix failures and rerun affected checks. |
| 2. Rendering investigation | Capture a native trace for one repeatable focus transition. October 22 frame p95 worsened while weighted jank fell; both compared builds already contained the app cache. | Trace and scenario identify whether JS, layout, drawing, GPU/shadows, or other device work causes the stall. Make one targeted change, then repeat the same scenario and five-pass benchmark with controlled warm-up, mirroring, layout, content and motion. Report mixed/null results honestly; keep remote behavior and readability intact. |
| 3. Integration/release gate | Verify Functions, Hosting, indexes/TTL and TV compatibility in a test environment. Local tests do not exercise real Google consent, Hosting cookies or multi-account revocation. | Record deployed revisions/configuration and successful pairing/re-pairing; RSS preset/custom-source outage recovery; TV poll creation/retry without duplicate rounds; phone vote-cookie round trip; two-account activity expiry/revocation; companion publish/conflict/weather/favorites/photo sync. Use the feature guides below for exact rollout requirements. |
| 4. Data trust and recovery | October 24 provider status/freshness, bounded last-success reconciliation and stale-task action guards are deployed to the dashboard Functions and installed on the Sony. Local fault-injection/browser checks and a healthy request on the new revision passed; see the [provider report](reviews/provider-recovery-2026-10-24.md). Startup labels restored data and retains it for seven days; the originally reported minute-long opening remains unconfirmed. | Verify live provider outage/recovery with test accounts and physical offline startup with a recoverable connection. Keep deployed build/revision evidence alongside successful-empty, late-disk, timestamp-expiry, legacy-cache and account-cleanup checks. Define privacy/expiry rules before adding any new disk caches. |
| 5. One core-use feature | Once the baseline and data trust gates pass, choose one household workflow. Recommended first: calendar source selection, then week navigation, because an existing 14-day feed provides a starting point. | Agree the expected remote actions, source/date window and empty/error behavior first. Add coverage for timezones, all-day/overnight events and source access. Month navigation needs a deliberate fetch-window change; fuller task editing/history or a persistent watchlist can replace this choice if household usage warrants it. |

Steps 1 and 2 can use the existing private TV installation. Step 3 is required
before distributing the newer feature set more broadly; recheck the security
guide's outstanding operational findings rather than treating the October 5
review as current production evidence. Public Play release also needs the
separate [release gates](../HomeScreen/RELEASE.md), including package identity,
signing/channel decisions and 16 KB runtime evidence. A private smoke-test pass
does not complete public distribution.

## Start activity migration alongside the TV work

This work has an external deadline and should start during step 1, rather than
waiting for all release validation. Google's [Fit migration guide](https://developer.android.com/health-and-fitness/health-connect/migration/fit)
still gives the end of 2026 as the Fit API support limit. It recommends Google
Health API for cloud integrations and Health Connect for mobile step aggregation.
The [Google Health API site](https://developers.google.com/health) now describes
getting started for new developers; the October 9 blanket onboarding limitation
is no longer a sound planning assumption. Vendor guidance rechecked October 23.

1. **Prove access and metric coverage.** Using the intended project and consenting
   test accounts, establish eligibility, scopes and an actual read path. Map
   steps, distance, calories, active/move minutes, seven-day history, timezone
   boundaries and app-managed goals. Missing metrics must stay unavailable rather
   than silently becoming zero. A landing page alone does not prove this project's
   access or compatibility with its users' data sources.
2. **Choose the smallest viable ingestion route.** Prefer a server adapter if
   Google Health API provides the required data. If phone-local Health Connect
   data is needed, plan a phone app/ingestion service: the present browser
   companion cannot read an Android on-device store by itself. Document setup,
   permissions, offline upload and ongoing maintenance before committing to it.
3. **Implement and verify the transition.** Preserve the TV activity contract where
   possible, require consent for new scopes, and test participant sharing,
   revocation/deletion, unavailable metrics and daily/weekly boundaries. Compare
   representative account results before switching, and explain any changed
   metric meaning. If access/coverage fails, choose an explicit unavailable state
   and communicate the limitation before Fit support ends.

The first deliverable is an access/metric decision record with evidence, followed
by an adapter or a scoped phone-ingestion plan. Another activity UI redesign does
not remove the provider dependency.

## Decisions that should precede broader expansion

- **Ownership:** choose account-wide layouts, independent per-TV designs, or
  personal profiles before changing layout storage. They are different products.
  Activity invitations currently grant activity viewing only. Any new ownership
  model needs authorization, revision/conflict, migration and revocation rules.
- **Offline scope:** secondary-city weather and Polls have no persisted summary
  coverage; People is intentionally memory-only for expiry/revocation. RSS already
  has a separate disk cache. Extend caching only for a demonstrated startup/outage
  need, with freshness and privacy rules; scheduled prefetch is an option to
  evaluate, not a prerequisite to every feature.
- **Maintainability:** extract provider persistence/sync or shared appearance
  contracts when implementing the relevant work. Use the existing
  [quality review](reviews/code-quality.md) as guidance; a repository-wide
  rewrite, universal registry, or blanket strictness migration is not the next
  user-visible milestone.
- **Optional later work:** full media catalogs/watchlists, smart-home controls,
  universal search, daily-content widgets, time-of-day modes, other TV platforms,
  system Home replacement and a standalone screensaver remain proposals. Rank
  them after reliability and provider continuity using actual household demand.

## Working and release checks

Run the root `npm run typecheck` and `npm test`, backend lint and companion build
for a release baseline. Default tests do not start the Firestore emulator or run
browser/native suites. For a behavior change, add the applicable browser fixtures,
emulator transaction tests and physical-TV checks; document skipped checks and
their reason. Repeating an unrelated broad suite is not a substitute for the
missing evidence.

Deployment instructions belong to [Functions](../server/functions/README.md),
[companion](../server/pairing-web/README.md),
[layout](../server/pairing-web/DASHBOARD_LAYOUT.md),
[Feeds](../server/pairing-web/FEEDS.md), [Polls](../server/pairing-web/POLLS.md),
[People](../server/pairing-web/PEOPLE.md), [security](../server/SECURITY.md) and
[TV release](../HomeScreen/RELEASE.md). Record date, revision, environment,
observed result and remaining failures when closing a gate; update project
status and the companion roadmap together.
