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
An isolated, disabled-by-default [OAuth start and callback](../../server/functions/src/googleHealthOAuth.ts)
now supplies a single-use, expiring PKCE state and a separate OAuth client. It
requires an explicit consent flag and a signed-in owner session, and only stages
credentials; it does not create a share or switch the provider. The People page
offers an explicitly labeled test connection when the feature flag is enabled,
and lets the owner remove a saved test grant even if the flag is later disabled.
Removing the grant invalidates in-flight authorization and leaves Fit credentials
and shares intact. Mocked handler and storage tests cover
replay, scope, account matching, encryption, and a cancelled transaction, but
do not establish a live consent or reproduce Firestore concurrency.

To prepare a future isolated deployment, register the exact Health callback URI
with the Health test project's web OAuth client, enable the Health API and add
test users in that project, and set the documented `GOOGLE_HEALTH_*` configuration
and `GOOGLE_HEALTH_CLIENT_SECRET` secret for the separate callback. Both new
functions and the `googleHealthTest` function must be deployed together, with the
existing encryption secret available to the callback and test reader. The People
function and companion Hosting also need updating. Leave the flag disabled until that setup and an intentional test
client are ready. Deploying all functions also requires provisioning the new secret,
even if the feature flag is off. This was the status before the authorized deployment below.
The Health OAuth state collection also needs its `deleteAt` TTL policy deployed
from `firestore.indexes.json`; expiry is enforced by the callback independently
of eventual TTL cleanup. On October 29, a read-only check confirmed the Health
API remained enabled in the separate test project. The configured dashboard
Firebase project has `TOKEN_ENCRYPTION_KEY` but did not list a
`GOOGLE_HEALTH_CLIENT_SECRET`; Health client settings were absent from the local
Functions environment files. The Health test project was not in the Firebase
project list, so the current companion flow would deploy to the live dashboard
project while using the separate test OAuth client.

On October 29, after the user approved deployment and reported registering the
callback, the test client secret and Health settings were configured for the
dashboard project. The `beginGoogleHealth`, `googleHealthOAuthCallback`, and
`googleHealthTest` functions were created, `people` and `accountSecurity` were
updated, and companion Hosting was deployed. The `health_oauth_states.deleteAt`
TTL policy became active. Unauthenticated smoke checks returned the expected
401s for protected endpoints and 400 for an invalid callback, and the hosted
bundle contains the test controls. These checks do not verify live consent,
account linkage, data reads, or token refresh. The TV still uses Fit.

Subsequently the user shared a screenshot of the deployed People test showing
a saved Health connection and a successful coverage check: steps, distance,
calories and activity levels each had data for all seven days, including today,
with no missing or unavailable days. This provides user-reported evidence that
the deployed consent, encrypted credential and Health read path worked for this
account. The screenshot contains coverage statuses, not personal values. It
does not establish numerical parity with Fit, behavior across travel or repeated
clock hours, shared-person support, or a successful refresh after access-token
expiry. The dashboard continues to use Fit.

A separate, owner-initiated token-refresh check was subsequently added and
deployed to the People test panel. It omits the cached access token and reports
whether the OAuth client obtained one, without displaying credentials or health
values. Mocked success and failure tests and live unauthenticated smoke checks
passed. The user subsequently reported that the deployed check refreshed
successfully, providing live evidence that the saved test refresh token obtained
a new access token. This does not establish behavior after the seven-day testing
grant expires, production OAuth verification, or automatic recovery after revocation.

An owner-only, rate-limited comparison test is deployed in the People panel.
It reads the owner's existing Fit and Health connections, compares matching
completed dates for steps, distance and calories, and returns percentages rather
than raw values. Fit's zero values are ambiguous because its adapter also fills
missing buckets with zero, so those are not compared. Fit distance is rounded,
and calorie semantics, source timing and civil-day boundaries may differ. Activity
levels are intentionally not compared to Fit Move Minutes. Authorization and
connection revisions are rechecked before returning results. Mocked tests and
unauthenticated live smoke checks passed; no live comparison result from this
new endpoint had yet been recorded at deployment.

The user subsequently ran the deployed comparison for the six completed dates
October 23–28. Google Health steps were 0.1%–2.4% lower than Fit, distance was
0.1%–2.2% lower, and total calories were 2.3%–10.0% lower on those dates.
These are user-reported relative differences for one account and time zone, not
proof of source equivalence or of the cause of the calorie gap. They do not test
today's partial day, zero/missing states, travel, repeated DST hours, a second
account, or the meaning of Health activity levels versus Fit Move Minutes.

### Sync timing and calorie interpretation

Sync timing is a plausible explanation for some differences, especially for
recent activity. Google says its Health API data becomes available after the
tracker syncs with the Health app, and describes automatic sync behavior for
supported Fitbit devices ([Health data availability](https://developers.google.com/health/data-types)).
Google also describes temporary differences in Fit caused by syncing delays
([Fit FAQ](https://developers.google.com/fit/faq)). These descriptions do not
establish the precise sync schedule of this household's particular devices or
prove that sync caused the observed gaps. A consistent gap across six completed
days could also reflect different sources, reconciliation, day boundaries or
calorie estimates.

Both candidate calorie metrics intend to include resting energy: Health's
[`total-calories`](https://developers.google.com/health/data-types/calories)
is derived from activity and basal metabolism; Fit's
[`com.google.calories.expended`](https://developers.google.com/fit/datatypes/activity)
includes resting calories. That shared definition does not establish identical
inputs or algorithms. The dashboard's Fit adapter adds its separate resting
estimate only to **today's** total, so it did not add that estimate to the six
completed-day values in this comparison. Do not apply that estimate to Health.

To test the sync hypothesis, leave the two apps and tracker connected long
enough for their normal sync, then rerun **Compare completed days with Fit** in
the same browser time zone. Compare only overlapping completed dates against the
October 23–28 baseline and record the time and percentage differences, not
personal values. Changes on the same date would demonstrate that at least one
side's comparison changed; they would not identify which side changed or prove
the cause. Stable gaps across repeated checks would make an ordinary short sync
delay less likely, but would not rule out later corrections or other causes.
The earlier October 27 comparison used a TV display and a separate Health read;
its approximately +1.2% difference cannot be directly equated with the later
endpoint's approximately -1.1% result without controlling source and timing.

The user subsequently shared a repeat comparison with identical displayed
percentages for all three metrics on all six October 23–28 dates. The elapsed
time between checks and the devices' sync states were not supplied. This shows
the rounded relative differences stayed the same at the two observations, not
that underlying totals were unchanged or that sync delay has been ruled out.

For the eventual Health UI, keep LIGHT, MODERATE and VIGOROUS as separately
labeled levels until product semantics and device coverage are verified.
Google's [active-minutes reference](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints)
defines those levels; it does not establish their equivalence to Fit Move Minutes.

### Source-family diagnostic

Google documents that Health daily rollups reconcile overlapping data, and can
filter by source family ([aggregation guide](https://developers.google.com/health/aggregate-data),
[source families](https://developers.google.com/health/filters)). A staged,
owner-only diagnostic, deployed October 30, compares each completed day's `total-calories` rollup for
Google sources and Google wearables against the all-sources rollup. It returns
only percentage differences and availability, not raw calorie values or device
identities, and does not modify dashboard data. A missing or failed filter is not
interpreted as zero. The source groups are reconciled separately; their results
are not additive and do not establish the cause of any difference with Fit.
Filtered `total-calories` behavior and the account's source coverage need a live
check. Mocked tests cover request family selection, zero/missing/failure handling,
authorization and connection changes. The deployed endpoint rejected an
unauthenticated request and the hosted page included the control; live filtered
data has not yet been verified.

On October 30 the user reported successful filtered source results for October
24–29. Google-source and wearable totals had the same displayed percentage on
each date and were 4.5%–19.6% above the all-sources Health baseline. In five
overlapping dates from the prior Fit comparison (October 24–28), combining the
separately observed, rounded percentages implies that Health's filtered calorie
totals were approximately 0.7%–1.1% below Fit on October 24–27 and 2.1% above
Fit on October 28. These calculations combine separate reads at different times,
so they are exploratory, not a simultaneous direct comparison or proof that
either filtered source matches Fit. The equal displayed group percentages do not
prove the same underlying records, and separately reconciled source filters do
not establish which source caused the all-sources difference. No raw calorie
values or device identifiers were recorded. Confirm filtered semantics, test
other accounts and missing-data behavior before considering a provider mapping.

The deployed Fit comparison was subsequently extended to read all-source,
Google-source and wearable Health calories alongside the same Fit read, using
one request time and completed-day matching. Each group is compared directly
with Fit; a missing or failed group remains missing or unavailable. These are
concurrent requests rather than an atomic provider snapshot. Mocked backend and
browser tests passed, and live unauthenticated checks confirmed the endpoint
requires sign-in. The live simultaneous comparison remains to be run by the
account owner, and filtered totals have not been established as a safe default
for users without wearable data.

The user subsequently reported the concurrent comparison for October 24–29.
On October 24–27 the Google-source and wearable calorie results were 0.7%–1.1%
below Fit, versus 8.0%–10.0% below for all sources. On October 28 the filtered
results were 2.1% above Fit and all sources were 2.3% below. On October 29 the
filtered results were 23.3% above Fit while all sources were 3.1% above. Both
filtered groups displayed the same percentage on every date. These observations
confirm that the earlier cross-run estimate held for the overlapping dates, but
also show that filtered results can diverge more from Fit on a different day.
Matching displayed percentages do not prove matching records, and neither Fit
nor Health is established as ground truth. Retain the all-sources default while
investigating the October 29 source and reconciliation difference, and test a
non-wearable account before making any source-family or fallback decision.

The isolated [Health read service](../../server/functions/src/services/googleHealthRead.ts)
now loads the separate encrypted grant, uses the Health OAuth client to refresh
access on demand, and stores a refreshed access token encrypted for reuse. It
distinguishes a consistently rejected grant from per-metric temporary failures,
and checks both the account authorization version and connection revision after
the read before returning results or saving a refreshed token. The companion's
owner-only, rate-limited test endpoint reports only seven-day coverage counts and
availability, not health values. This path is deployed for testing and is not used by the TV.
Tests use mocked network and
Firestore operations, including a simulated expired grant and disconnect during a
read; a live refresh and real transaction concurrency remain unverified. A
future caller must supply the Health client secret and enforce its own rate,
sharing, and final response authorization checks.

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
