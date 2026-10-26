# Sony package-change verification — October 25, 2026

## Scope and setup

This closes one outstanding current-build TV baseline check: automatic
installed-app catalog invalidation after package changes while HomeScreen is
covered. It is a behavior check, not a performance comparison or a completed
hardware/release gate.

- Sony BRAVIA VU1, Android 11; ADB target `192.168.1.103:5555`.
- Source baseline `8e57af9`; installed HomeScreen APK SHA-256 verified on-device:
  `7fcc9830d72cb0700e856d46d1184429f8529aeac013dcb9c8714b6e00c69123`.
- Package `com.anonymous.mytvapp`, PID `3731` at baseline. The Apps screen's
  installed-app grid was reached with D-pad arrows. No favorites controls or
  manual Refresh action were selected.
- The temporary package `com.homescreen.roadmapfixture` was confirmed absent
  before ownership was recorded. It requests no permissions, contains only a
  plain local Activity and banner resource, and uses a dedicated temporary test
  signing key. It neither reads household data nor has Internet permission.
- Fixture v1 is labeled **AAA Roadmap Fixture One**, with green artwork. V2 has
  a higher version code, **AAA Roadmap Fixture Two**, and blue artwork. Both
  expose ordinary and Leanback launcher entries and passed APK signature checks.

Each change occurs with Android Settings (`com.android.tv.settings/.MainSettings`)
verified in the foreground and HomeScreen's process still alive. After the
change, HomeScreen is brought forward explicitly, allowed five seconds to settle,
and checked using a fresh native hierarchy and screenshot. The retained Apps
section and scroll position expose the alphabetically first app tiles.

Launching a fresh HomeScreen process or pressing Refresh would invalidate this
specific cache test; the operator checks PID before and after every mutation.
The fixture remains outside the favorite selection throughout the test.

## Results

All five operations passed on the same retained HomeScreen PID `3731`; no manual
Refresh or HomeScreen restart occurred between baseline and final comparison.

| Operation while covered | Result after returning to HomeScreen | Capture |
| --- | --- | --- |
| Install fixture v1 | New **AAA Roadmap Fixture One** tile with green artwork appeared. | 101 |
| Update fixture to v2 | Tile changed to **AAA Roadmap Fixture Two** with blue artwork; the old label was absent. | 102 |
| Disable fixture for user 0 | Fixture disappeared from the installed-app grid. | 103 |
| Re-enable fixture for user 0 | Updated v2 tile returned automatically. | 104 |
| Uninstall fixture | Fixture disappeared; visible grid controls, their bounds and original Angel focus matched baseline exactly. | 105 |

The final package-manager query confirmed the fixture was absent. Back from Apps
returned to the populated dashboard with Settings focused (capture 106). Existing
household apps, favorite selections and preferences were not edited. No product
source fix, HomeScreen APK rebuild or backend deployment was needed.

Fixture APK SHA-256 hashes:

- v1: `a191dc8e801bfd42092cb0393b5884364cff1319fdc01176f83d129f8dd0ee69`.
- v2: `e74e44986b4a23bdab6192efff0e301ab04a7c3a4380a272f7967255eca5da5a`.

The private evidence verifier checked all five successful operations, unchanged
dashboard PID, expected fixture labels/presence, visible Installed apps heading,
restored visible grid/focus and completed cleanup. This verifies captured device
observations, not a new product unit-test suite. Application unit tests were not
rerun because product source was unchanged. Documentation diff checks passed.

## Evidence handling and limits

Raw build sources, fixture APKs, operation records and captures are in ignored
`artifacts/tv-startup-2026-10-25/` and
`artifacts/tv-baseline-2026-10-23/`. They include household app names and UI data.
Captures 100–106 record the baseline through final dashboard return. The helper initially mishandled Sony's status 1
with empty output for an absent package; that operator-only check was corrected
before baseline recording or installation. It is not a product failure.

The test does not count native rebuilds, establish broadcast-coalescing timing,
prove package handling on other OEMs, or exercise favorite retention for a
temporarily unavailable selected app. No household app is installed, updated,
disabled or removed. Offline/account-isolation, the earlier ARD freeze, input
switching, widget removal fallback and remaining accessibility/lifecycle checks
stay open.
