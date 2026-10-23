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
| Startup | Open HomeScreen after installation. | Dashboard appears; returning paired TVs keep their account and layout. | Observed on Sony VU1, October 22; five cold starts per build |
| Header | Inspect the main header. | Clock and Settings gear; TV controls are under Settings → Device. | Verified on Sony VU1, October 22 |
| Details return | Select a widget, open its details, then Back. | Focus returns to the same widget. | Passed for Activity on Sony VU1, October 23; other domains/removal fallback untested |
| Favorite return | Open a favorite app, then return with Back or reopen HomeScreen. | The same app tile is selected; the favorites row reveals it. | Two ARD-main-screen returns passed without mirroring, October 23; original freeze unresolved |
| Ambient wake | Open Settings → Ambient → Preview. Press an arrow to wake; also wait for automatic idle entry and wake. | Dashboard returns with the previous entry point selected and the layout intact. | Original build failed; native-handler update passed all four preview arrows, Select/Back and automatic-idle arrow return to Activity on Sony, October 23; see dated follow-up |
| Reduced motion | Settings → Accessibility → Reduce motion. Navigate cards, then preview ambient. Close and reopen HomeScreen. | Focus border remains visible without zoom; photo/plasma movement stops; preference is retained. | Card scale, sampled static photo and restart persistence passed October 23; full plasma/OS checks pending; original preference restored |
| TV controls | Open Settings → Device; try Network settings, then return. | Correct system panel opens; HomeScreen returns to its Device panel. | Network/Android panels and section return passed October 23 |
| Inputs | In TV controls, inspect names/states. If available, select a known input. | Custom names are used and the input opens, or a clear unsupported-control message appears. Devices with no inputs show no input list. | Presence checked; switching/no-input devices untested |
| Standby | Put the TV in standby, wake it, then reopen HomeScreen if needed. | Clock catches up, current data refreshes, and focus/navigation still work. | Physical wake, retained process/section, clock and eventual data recovery passed October 23; network ADB dropped during sleep |

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
- Install/update/disable an app while another app is foregrounded, then return.
  Settings → Apps should reflect the installed apps; its Refresh remains available.
- For a timed poll, verify the join QR closes at the deadline even between minute ticks.
- Switch **Use device setting** back on and verify the TV's animation accessibility
  setting is respected.

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
