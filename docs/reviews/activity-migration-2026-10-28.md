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

In a later seven-day Playground check, the user reported data from all four
rollup endpoints and supplied excerpts showing multiple days of distance and
active minutes, plus a total-calories result with `kcalSum`. These shapes match
the prototype's parsing assumptions. The excerpts do not establish complete
seven-day coverage for every metric or numerical parity with Fit, and the
prototype itself was not used for these live requests. No health values were
copied into this record.

Later the Sony TV's Activity detail screen was checked with the user's
authorization. For October 27, the displayed Fit step count was approximately
1.2% lower than the previously supplied Health daily rollup. This is one day's
display comparison, not proof of equivalent sources or complete seven-day
parity. The TV screen did not show per-day historical distance, calories or
Move Minutes, so those comparisons remain open. The temporary accessibility
capture on the TV was removed after returning to the dashboard.

An isolated [server prototype](../../server/functions/src/services/googleHealthPrototype.ts)
can request seven completed civil days or six completed days plus a partial
current day through an injected authorized client.
It preserves activity levels, measured zeros, missing values and per-metric
request failures; distance is converted from millimeters to kilometers. It is
not connected to production OAuth, dashboard summaries or the TV. Mocked tests
cover request construction, partial-day and midnight boundaries, DST-spanning
calendar dates, conversions, missing values and failures. The current-day cutoff is expressed in
the viewer's civil time, while Health uses offsets recorded with data; repeated
clock hours and travel require live verification before enabling it.

To run the prototype privately against the test account, build the Functions
package, then run `node scripts/health-prototype-check.cjs America/New_York`
from `server/functions` in an interactive terminal. Authorize the Health read
scope in OAuth Playground and paste its short-lived access token only at the
hidden terminal prompt. The command displays only counts of available, missing
and failed days and whether today's values are present; it does not print or
save values or credentials. An HTTP 401 means a fresh token may be needed. It
does not compare Fit values, write data, store refresh tokens or exercise
production consent. Ensure the computer clock is correct. Never share a token,
client secret, or Playground request headers in chat or commit them to the repo.
The user subsequently ran this command with a fresh token and reported seven
days with data and today's value present for all four metrics, with no missing
or unavailable days. This is a user-reported live prototype result; it does not
establish numerical parity, participant consent or production readiness.
The local check now first calls Health's `users/me/identity` endpoint to detect
an unlinked Health account or failed authorization without printing identifiers.
That addition has mocked coverage but has not yet been run against the live test
account. It is not a substitute for the existing Google ID-token-to-Firebase
account match or the transaction and revocation checks in a future consent flow.
The existing Fit summary uses the viewer's time zone, whereas Health civil rollups
use offsets recorded with the data; equivalence during travel remains unproven.

The staged [Health summary mapping](../../server/functions/src/services/googleHealthSummary.ts)
retains the per-day availability states and activity levels, and calculates goal
progress only when today's steps are measured. Its `fetchedAt` is the request time,
not the time through which a device recorded data. It does not yet replace the
numeric Fit contract or drive a UI; the activity-level mapping, consent and live
consumer handling remain release work. It adds no resting-calorie estimate.

The staged [consent completion service](../../server/functions/src/services/googleHealthConsent.ts)
requires the Health activity scope and refresh token, verifies the Google ID
token against the OAuth client and the signed-in Firebase user, and checks the
Health account link before writing separately encrypted credentials. Its write
checks the authorization version in the same transaction, so a disconnect or
account deletion can cancel an in-flight consent. Existing activity disconnect
and account deletion remove the activity collection, including this record.
The service is not exposed by an OAuth endpoint or UI yet; tests use mocks and
do not establish a live consent or exercise Firestore transaction races. A future
caller must supply a single-use, expiring PKCE state and the correct client
configuration, and must not enable a provider switch before UI and sharing
semantics are ready.

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
