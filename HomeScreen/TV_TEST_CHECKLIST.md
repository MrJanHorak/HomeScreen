# TV installation smoke test

Use this after installing the October 22 TV experience build from USB. These checks
need only the remote. No ADB connection is needed. The original baseline is
`025c1a9`; the later on-TV header cleanup was committed in `55ef529` and is described in the
[dated device report](../docs/reviews/tv-benchmark-2026-10-22.md). The app still
reports version `1.0.0` / code `1`, so that number alone does not distinguish builds.

Record the TV model and Android/firmware version with any failure. For focus issues,
include the starting item, buttons pressed, expected destination, and actual destination.

| Check | Remote actions | Expected result | Result |
| --- | --- | --- | --- |
| Startup | Open HomeScreen after installation. | Dashboard appears with a usable focused control; returning paired TVs keep their account and layout. | October 27: Sony baseline had no focused control and ignored first Select. Signed fix passed post-install focus and three cold-start/first-Select/Back checks. Earlier launcher-return cause remains unresolved; see [startup-focus evidence](../docs/reviews/tv-startup-focus-2026-10-27.md) |
| Exit and reopen | From the dashboard, press Back, select Exit app, then reopen HomeScreen without force-stopping it. | TV launcher appears on exit; reopening shows the dashboard without the old confirmation. Back can open a new confirmation. | Old build reproduced the retained modal; signed fix passed launcher/retained-task reopen on Sony VU1, October 24 |
| Header | Inspect the main header. | Clock and Settings gear; TV controls are under Settings → Device. | Verified on Sony VU1, October 22 |
| Details return | Select a widget, open its details, then Back. | Focus returns to the same widget. | Weather, Schedule, Meals, Activity and Media passed matching labels/bounds on Sony, October 26; initial Select anomaly, hidden widgets and removal fallback remain open. See [detail-return evidence](../docs/reviews/tv-details-2026-10-26.md) |
| Favorite return | Open a favorite app, then return with Back or reopen HomeScreen. | The same app tile is selected; the favorites row reveals it. | Two ARD-main-screen returns passed without mirroring, October 23; original freeze unresolved |
| Installed-app changes | Cover HomeScreen, then install/update/disable/re-enable/remove a temporary app and return without Refresh. | Installed-app list updates automatically, including changed labels/artwork. | All five operations passed on the same Sony process, October 25; temporary fixture removed; see [package-change evidence](../docs/reviews/tv-package-changes-2026-10-25.md) |
| Ambient wake | Open Settings → Ambient → Preview. Press an arrow to wake; also wait for automatic idle entry and wake. | Dashboard returns with the previous entry point selected and the layout intact. | Original build failed; native-handler update passed all four preview arrows, Select/Back and automatic-idle arrow return to Activity on Sony, October 23; see dated follow-up |
| Reduced motion | Settings → Accessibility → Reduce motion. Navigate cards, then preview ambient. Close and reopen HomeScreen. | Focus border remains visible without zoom; photo pan/zoom and plasma movement stop; preference is retained. | Card scale, sampled static photo and restart persistence passed October 23. October 25: sampled plasma stillness for app/OS reduction and live OS stop/resume passed. October 26: selected-photo/info rotation and sampled photo stillness passed under OS reduction; original settings restored. See [motion evidence](../docs/reviews/tv-motion-2026-10-25.md) and [rotation evidence](../docs/reviews/tv-ambient-rotation-2026-10-26.md) |
| Ambient rotation | Preview ambient with three selected photos and a one-minute photo interval; observe for six minutes in standard and reduced motion. Restore the interval afterward. | Photos and enabled information rotate; the information block visits four positions and returns. Reduced motion preserves rotation without photo pan/zoom. | Three photos, five information types and all four positions passed in standard/OS-reduced samples on Sony, October 26. Other sources/cadences and continuous fade timing remain unverified; see [rotation evidence](../docs/reviews/tv-ambient-rotation-2026-10-26.md) |
| TV controls | Open Settings → Device; try Network settings, then return. | Correct system panel opens; HomeScreen returns to its Device panel. | Network/Android panels and section return passed October 23 |
| Inputs | In TV controls, inspect names/states. If available, select a known input. | Custom names are used and the input opens, or a clear unsupported-control message appears. Devices with no inputs show no input list. | Presence checked; switching/no-input devices untested |
| Standby | Put the TV in standby, wake it, then reopen HomeScreen if needed. | Clock catches up, current data refreshes, and focus/navigation still work. | Physical wake, retained process/section, clock and eventual data recovery passed October 23; network ADB dropped during sleep |
| Connection failure/recovery | With a recoverable control route, cold-start while requests fail, then restore connectivity. | Saved cards and source timestamps remain visible; retry runs and live data returns. | Sony refused-HTTP proxy pass and later manual physical offline launch restored cache and recovered in the same process. The user observed ambient information without a photo; no offline screenshot was captured. A separate [emulator pass](../docs/reviews/tv-offline-pairing-2026-10-27.md) verified unpaired first-launch recovery; its updated build is not installed on the Sony. Account/expiry cases remain open. See [Sony proxy evidence](../docs/reviews/tv-connection-recovery-2026-10-27.md) |

October 23 follow-up: installed APK identity and Activity-detail return passed;
system Network/Android shortcuts opened and returned to the Device section.
Ambient arrow wake initially failed; a later signed native-handler update passed
all four preview arrows plus Select/Back and automatic-idle arrow return to
Activity. A user-observed TV freeze
interrupted the first favorite-return attempt; a later cold launch succeeded
after reboot with Android Studio mirroring closed. Physical standby wake and two
later ARD returns passed; motion preference persistence passed and the original
choice was restored. The baseline gate remains
open. The [dated baseline report](../docs/reviews/tv-baseline-2026-10-23.md)
owns detailed results, diagnostic limits and outstanding checks.

Optional follow-ups after the first pass:

- Change/reorder/remove the focused widget through the companion while details are
  open; close details and verify a sensible visible focus target.
- Repeat package-change checks on other supported devices. The Sony fixture pass
  covers install/update/disable/re-enable/removal; selected-favorite retention
  during temporary unavailability and manual Refresh fallback remain untested.
- For a timed poll, verify the join QR closes at the deadline even between minute ticks.
- Repeat **Use device setting** motion checks on other supported devices. The Sony
  passed live transition-scale changes on October 25; this does not replace
  TalkBack/audio or full photo/detail-rotation checks.

This records usability, not speed measurements. Before/after timings require the
same physical TV and setup plus an ADB connection; see [TV experience](TV_EXPERIENCE.md).

## Local APK verification

The release build was verified October 22, 2026:

- Package: `com.anonymous.mytvapp`; activity: `.MainActivity`.
- Version: `1.0.0` / code `1`; minimum Android API 24, target 36.
- ABIs: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`.
- Release signature: `CN=HomeScreen Upload`, APK Signature Scheme v2.
- Signing-certificate SHA-256: `f46aab8ae76040666178db072c3d85abd6f36fddfef45c36b27f23a29342ddd6`.
- APK SHA-256: `5324ec5bae2498b89fe08410b18d6fc8af82b1eb163f8a7c96c7f56b86e76310`.
- `assets/cleanyourtv-notice.txt` was present and matched the tracked source exactly.

The checked APK is `android/app/build/outputs/apk/release/app-release.apk`. A rebuilt
APK can have a different hash. The header-cleanup APK installed on the Sony has
SHA-256 `1ff60fd311b11c2bdcf79e19ebd5e857fc5d63bc00d6f23ea69b9262772d8b31`;
the baseline hash above identifies the earlier header version. Both report the
same version/code, so keep the hash and source/build record together. Desktop
benchmark/report tooling changes do not require another TV app build; the header
UI change did require the signed update recorded in the device report.

Startup/Header have October 22 device results; the table includes later October
23 results and limitations. The dated baseline report owns current follow-up
evidence. Input switching and the remaining lifecycle/accessibility checks are pending.
Do not treat packaging checks as device results.

## October 24 exit confirmation fix

The root exit handler now clears the confirmation's visible state before calling
`BackHandler.exitApp()`. Android can retain the React tree when moving the task
to the background, so exit must not leave that state true.

Before the change, captures 74–76 reproduced confirmation → TV launcher → retained
confirmation, with Exit app still focused after reopening. The signed fix was
installed in place, preserving pairing and settings. Captures 78–80 show
confirmation → launcher → populated dashboard with Settings focused and no exit
dialog; Android reported a HOT launch of the retained task, not a cold restart.
The checks used ADB-injected D-pad/Back keys on the physical Sony. Raw captures
and logs are in the ignored `artifacts/tv-baseline-2026-10-23/` directory.

APK SHA-256: `16103d18b08e789b6f504dfb6ae2d6b2a198b8f9c13c6e67504d5b80e9bc5314`.
TV TypeScript checking, signed release build and APK Signature Scheme v2
verification passed. The preceding cache update's 113-test baseline is unchanged;
the exit-state correction was verified through the native interaction above.
