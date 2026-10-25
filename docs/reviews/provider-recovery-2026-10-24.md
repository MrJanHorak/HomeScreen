# Calendar and Tasks recovery — October 24, 2026

The next implementation closes the data-trust gap where provider exceptions
became empty lists in a successful summary and could overwrite a usable snapshot.

## Behavior

- The additive shared contract reports Calendar/Tasks `ok`, `unavailable`, or
  `not_connected`, with each provider's last-success timestamp when available.
- Calendar list and individual calendar failures now reach the aggregator. A
  failed calendar read retains the previous complete feed, avoiding a partial
  agenda that silently omits one failed calendar.
- Backend aggregation and TV sessions reconcile failed feeds with existing data.
  Seven-day expiry uses the provider timestamp, so unrelated successful refreshes
  cannot keep an old task list alive indefinitely. A successful empty read clears
  the old list; explicit disconnection also clears it. The existing account-scoped
  cache and sign-out/revocation cleanup remain in use, with no extra disk store.
- A late disk read may fill only providers that failed in the network response.
  The merged result is persisted. Fresh providers always win over disk.
- Cards/details/footer distinguish saved or unavailable data from an empty
  successful read. Task completion waits for a live successful Tasks response.
- A partial-outage backend cache retries providers on the next request under the
  existing refresh quota, allowing recovery before the normal cache TTL.

Legacy responses/snapshots without metadata remain readable. They cannot report
provider failures that an older backend swallowed; both Functions and TV updates
are needed for the full behavior.

## Verification and rollout

Root typechecking and backend lint passed. The default TV suite passed 117 tests;
backend tests passed 147 with 12 Firestore-emulator tests skipped. New coverage
includes provider exceptions, successful-empty recovery, source timestamp expiry,
late disk/network races, persisted merged feeds, disconnected feeds and recovery
through the backend cache. Account scoping/removal tests remain in the TV suite.
The final optional-cache-read guard in synchronization also passed all 11 targeted
dashboard summary tests after its addition. Companion production build passed.
Six new browser checks passed in installed Edge: compact/full dashboard cards and
960/1920 detail views with/without saved items. A saved-calendar screenshot was
visually checked after transitions/fonts settled. The details fixture now stubs
unavailable native Expo modules, avoiding Android-only dependency optimization in
web tests. Local fixture servers were stopped after verification.

## Rollout and Sony follow-up

The signed release built and passed APK Signature Scheme v2 verification with
the existing HomeScreen Upload certificate. APK SHA-256:
`0cac134996a71a0b4c7ea14deb335ce9b2fd7828fcdde6cd9d43678b12bdf037`.
It was installed successfully with `adb install -r`, preserving pairing, layout
and favorites. The Sony logged a cache restoration at 23:04:10 local time.
Capture 81 was a startup frame and does not establish data readiness; capture 82
at 23:04:41 confirms populated information/media cards and favorite apps. Filtered
diagnostics showed the cache-restored outcome and no matching fatal/JS errors.

Only these two Functions were deployed to `tv-homescreen-backend`; predeploy
lint/build and both update operations succeeded:

| Function | Revision | Update time (America/New_York) |
| --- | --- | --- |
| getDashboardSummary | `getdashboardsummary-00038-jem` | October 24, 23:04:18 |
| syncUserData | `syncuserdata-00038-rut` | October 24, 23:04:25 |

Captures 83/84 verify Exit app → Sony launcher → retained-task HOT reopen without
the exit dialog, with Settings focused and the dashboard populated. A production
request at 23:09:16 returned HTTP 200 on `getdashboardsummary-00038-jem`. Existing
healthy backend cache entries may omit the new metadata until their ten-minute
TTL elapses; no household cache was deleted to force migration. The Sony was
left awake on the populated dashboard. Raw household captures/build/deploy/test
logs remain in the ignored baseline artifact directory.

The Sony has only network ADB connected. No network or account settings were
changed to simulate an outage. Physical offline restart, expired-cache startup,
account revocation and real provider-outage checks remain open; local fault
injection does not establish those device/integration passes. This change also
does not explain the previously reported minute-long startup or resolve the
separate ARD-return freeze.
