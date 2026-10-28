# Activity migration feasibility — October 28, 2026

## Decision and evidence

Investigate a Google Health API server adapter first, but do not switch providers
until an actual consenting account read proves access and useful source coverage.
Google says Fit REST support ends at the end of 2026 ([migration guide](https://developer.android.com/health-and-fitness/health-connect/migration/fit)).
Health Connect is an alternative when needed data is only on a phone; it would
require a mobile ingestion component, since the current companion is a website.

On October 28, a read-only `gcloud services list --enabled` query against the
configured Firebase project `tv-homescreen-backend` succeeded and returned no
match for `health.googleapis.com`. This means that service was not listed as
enabled at the time of the query. It does not establish eligibility, OAuth
approval, data availability, pricing, or whether another project could be used.
No service configuration, consent, credentials or production data were changed.

Subsequent setup on October 28: with the user's approval, the separate project
`tv-health-test-20261028` (TV Health API Test) was created and
`health.googleapis.com` was enabled; a second enabled-services query confirmed
it. OAuth configuration, a linked Google Health account, consent and live reads
were initially outstanding. The existing production project's API configuration
was not changed.

Later October 28, the user configured a test OAuth client and consented to the
activity read scope. A user-provided Playground response for the steps list
returned HTTP 200 and included records from MobileTrack and Health Connect; a
next-page token was present. This proves a successful live steps read for that
account in the test project, not complete history, reconciled totals, other
metrics, Fit parity or production access. No personal values or credentials are
recorded here. The user subsequently reported HTTP 200 responses containing
data points for both distance and active minutes. These latter results are
user-reported; other metric rollups, calories and comparison with Fit remain unverified.
Subsequently, a user-provided October 27 steps daily rollup returned HTTP 200
with a daily count. This confirms one completed-day aggregate, not Fit parity,
seven-day coverage, time-zone equivalence, or other metric rollups.
The user later reported HTTP 200 for distance, active-minutes and total-calories
daily rollups using the same day; the supplied distance response contained a
`millimetersSum` value. Nonempty active-minutes and calorie rollup results were
not independently confirmed at that point.
The user subsequently supplied an active-minutes rollup containing LIGHT,
MODERATE and VIGOROUS entries and said the results seem correct. The precise
comparison method and calorie response content were not captured. Whether and
how those levels match Fit Move Minutes remains an explicit mapping decision.

An isolated [server prototype](../../server/functions/src/services/googleHealthPrototype.ts)
now requests seven completed civil days through an injected authorized client.
It preserves activity levels, measured zeros, missing values and per-metric
request failures; distance is converted from millimeters to kilometers. It is
not connected to production OAuth, dashboard summaries or the TV. Mocked tests
cover request construction, DST-spanning calendar dates, conversions, missing
values and failures; the prototype itself has not been run against a live account.
The existing Fit summary uses the viewer's time zone, whereas Health civil rollups
use offsets recorded with the data; equivalence during travel remains unproven.

## Current contract and candidate mapping

The owner dashboard and separately consented People feed both call
[`fetchHealthData`](../../server/functions/src/services/googleFit.ts). It requests
seven calendar days in the viewer's time zone, with today's interval ending at
the request time. Goals are application settings (default 10,000 steps and 8 km),
not provider goals. Shared activity uses participant credentials, a per-person
and time-zone cache, revision checks, and revocation checks; these must survive
any migration. Owner pairing and People consent currently request Fit scopes.

| Current output | Health API candidate | Open validation |
| --- | --- | --- |
| Steps and seven-day history | `steps` daily rollup | Confirm source coverage, reconciliation, current partial day, zero versus no data, and local-day/DST behavior. |
| Distance in km | `distance` daily rollup | Confirm response units and conversion, source coverage, and parity with Fit. |
| Calories, including a current-day resting estimate | `total-calories` daily rollup | Google describes this as active plus basal energy; compare actual partial-day and historical values, and do not add the existing Fit estimate on top without evidence. |
| Move/active minutes, nullable | `active-minutes` daily rollup | Check availability and meaning for each device; do not assume it equals Fit Move Minutes or Active Zone Minutes. |
| Goal progress and recorded-through timestamps | Calculate progress from available steps; assess timestamps separately | Decide whether equivalent freshness metadata exists and avoid presenting unavailable data as a valid zero. |

Google lists these four types under
[`googlehealth.activity_and_fitness.readonly`](https://developers.google.com/health/filters)
and supports daily rollups; seven days is within its documented 14-day limit for
active minutes and total calories. See [data types](https://developers.google.com/health/data-types),
[steps](https://developers.google.com/health/data-types/steps), and
[calories](https://developers.google.com/health/data-types/calories). A documented
type or source family does not prove that the household's data is present or
semantically equivalent. In particular, compare real overlapping source data and
sync timing rather than assuming all existing Fit data migrates.

The current [`HealthSummary`](../../server/functions/src/types/index.ts) requires
numeric steps, distance, and calories, and the Fit implementation fills missing
daily buckets with zero. The replacement needs an explicit per-metric availability
representation and corresponding TV/companion handling before partial provider
coverage can be reported honestly. A whole-provider unavailable state alone does
not distinguish a missing metric from a measured zero.

## Next proof and release gates

1. Review Google's [setup and developer checklist](https://developers.google.com/health/get-started),
   including scopes, verification and costs, then use an appropriate test project
   or deliberately enable the API for the intended project. Obtain explicit new
   consent from a test account; existing Fit permissions are not Health consent.
2. With a representative account and known device/data sources, query the four
   daily rollups for the same seven local dates and compare with Fit. Record only
   sanitized outcomes, units, source and timing differences; never commit tokens
   or personal health values. Exercise a missing metric, explicit zero, a DST
   boundary, and a second account where practical.
3. Decide the adapter and missing-value contract from the observations. If data
   is absent, investigate the source and Health Connect route rather than filling
   zeros or claiming parity. Confirm the intended ownership and consent flow for
   both owner and participant accounts.
4. Implement and test the adapter and UI states, separate credentials/scopes,
   participant consent, cache revision and expiry, revocation/deletion, and
   migration/rollback. Compare representative accounts before switching. If no
   viable route is ready, present a clear unavailable state before Fit ends.

The list reads and single-day rollup checks above are the live Health API reads
recorded so far; no device comparison or production rollout has been performed.
