# Sony TV baseline — October 23, 2026

Physical-device pass starting at approximately 09:44, resumed after physical
standby wake and completed for the checks below at 11:31 America/New_York.
The user confirmed that Android Studio was showing the TV mirror; no separate
Android virtual device appeared in ADB. Do not interpret this as emulator
coverage or a completed lifecycle baseline.

## Device and installed build

- ADB target: `192.168.1.103:5555`; Sony BRAVIA VU1, Android 11.
- Firmware fingerprint: `Sony/BRAVIA_VU1_UC/BRAVIA_VU1:11/RTT7.210105.001/366.60436:user/release-keys`.
- Physical display: 1920 × 1080; app package `com.anonymous.mytvapp`, version
  `1.0.0` / code `1`, minimum API 24, target API 36; package is non-debuggable.
- Installed APK SHA-256, computed on the TV:
  `1ff60fd311b11c2bdcf79e19ebd5e857fc5d63bc00d6f23ea69b9262772d8b31`.
  The local release APK has the same hash. This identifies the signed
  header-cleanup build documented in the [October 22 report](tv-benchmark-2026-10-22.md),
  whose source changes were committed in `55ef529`. Current repository HEAD at
  test start was documentation commit `826922e`; no app code had changed since
  that build. No new installation or account reset was needed.
- The TV was awake with its display on. Android's animator-duration setting and
  enabled accessibility-services value returned `null`; those values alone do
  not prove the app motion mode or hardware accessibility behavior.

## Observed checks

Actions used ADB-injected D-pad/Back keys and native screenshots/UI hierarchies.
They exercise physical-TV focus routing but do not measure a handheld remote's
input latency, couch readability, or audio output.

| Check | Actions and observation | Result |
| --- | --- | --- |
| Installed identity/session/header | Installed hash matches the previously recorded update. Dashboard/account/favorites and clock/Settings header were visible. Cold launch after reboot and an intentional app stop/relaunch later both reached the populated dashboard with the paired session retained. | Pass for installed identity, online startup and session persistence. Offline restart remains untested. |
| Detail return | Right selected Settings; Down selected Activity. Center opened Fitness & Health Goals with its Back control focused. Back returned to Activity, confirmed by native `focused="true"` and identical focused-card bounds `[1409,156][1860,605]`. | Pass for Activity details in this layout. Other domains and removal/reorder fallback remain untested. |
| Favorite launch | Down selected Media; Down/Right selected ARD Mediathek. Center opened its onboarding activity, independently confirmed by Android's resumed-activity record and a screenshot. | Launch passed. |
| Favorite return | First attempt ended in the freeze described below. With mirroring off and standard motion restored, two later ARD → explicit HomeScreen reopen attempts succeeded. Native hierarchy captures 40/42 both focus Open ARD Mediathek at `[1008,876][1232,996]`, matching capture 38. Capture 41 independently shows ARD between returns. | Two retests passed without mirroring. The original freeze is unresolved; this does not establish mirroring as its cause. |
| Reduced motion | Selected Reduce motion. Activity retained a visible border and its unscaled bounds `[1422,169][1860,592]`, versus enlarged standard-motion bounds in capture 03. Ambient captures 21/22, about eight seconds apart, have identical PNG hashes. After an intentional app stop/relaunch, capture 36 still selects Reduce motion. Capture 37 restores the original Use device setting and shows Standard motion is active. | Pass for selection, card scale, sampled static photo and persistence. Original preference restored. Full photo/plasma rotation and OS-setting response remain untested. |
| Ambient wake | Original build: Right and additional Center/arrows retained ambient with no focusable controls; Back returned to Settings focus. A later native-handler build was installed and all four preview-arrow checks plus Select/Back passed; see the fix follow-up below. | Original failure reproduced; fixed on the Sony in the later build. Automatic-idle follow-up is recorded separately. |
| System settings | Network settings opened Sony Network & Internet; Back returned to the retained Device panel. Android settings opened Sony General Settings; Back again returned to Device. Return focus was the modal Back control. | Pass for opening/section return. No network configuration was changed. |
| Inputs | Device panel listed AV, HDMI 1, HDMI 2 and HDMI 3 / ARC; Android reported Connected for each. | Presence only; actual input switching and no-input devices untested. |
| Standby | Sleep requested at 10:18:33 with HomeScreen PID 2954. Sony emitted SCREEN_OFF, then network ADB closed; the scripted wake could not reach it. The user later woke the TV physically. ADB reconnected, the same PID 2954 was foreground/awake with the Device section retained, and Back restored dashboard Settings focus. At 11:13, the visible clock matched the capture time and changed weather/activity replaced earlier data. | Pass for physical wake, retained process/section, clock and visible data recovery. Initial post-wake refresh timed out and later recovered; network ADB is not a reliable standby wake route on this setup. |
| Offline restart/reconnect, expired cache, account isolation/revocation | Not exercised. No network settings, account credentials, or stored data were changed. | Not run; requires a recoverable test setup. |
| Package-change cache invalidation | Not exercised; no apps installed, updated or disabled. | Not run. |

## Freeze and transport interruption

At approximately 09:50, the existing network ADB target changed to `offline`.
The `am start -W` reopen attempt exited without a successful launch result;
subsequent capture reported `error: closed`. `adb connect` timed out with Windows
socket error 10060; reconnecting the single target did not restore access during
the initial recovery attempt. No network configuration or sleep/power command had
been issued. The user then reported the TV frozen on the HomeScreen splash,
with the remote indicator stuck white and normal control unresponsive. Treat
the baseline as failed pending diagnosis/retest, rather than merely a missed
focus result. The precise failure layer is undetermined: neither an app crash,
an ANR, a native rendering failure nor a system/firmware stall is established
without diagnostics. A TV restart was requested, leaving HomeScreen unopened
after recovery so available exit/system records can be collected first.

## Evidence and next action

Post-restart diagnostics collected at approximately 09:57 show a cold boot and
109 seconds of uptime. HomeScreen was not running, and its persisted exit history
had no entry for the freeze: the newest app-exit entry was an older background
`LOW_MEMORY` termination on October 22. That historical memory pressure does not
establish an out-of-memory event today. The retained last-kernel entry contains
only a corrupted/truncated trace tail, insufficient to identify the failed
subsystem. A `media.swcodec` native SIGABRT in VP8 encoding was recorded at
09:56:49, after reboot; it cannot by timing alone explain the earlier freeze.
No HomeScreen Java/JS/native crash or ANR was established by these surviving logs.

The user closed Android Studio to remove live mirroring from the next pass.
Closing it also ended the host ADB server/session; reconnecting restored access.
No screen-sharing/mirroring process matched the subsequent process check. A
controlled HomeScreen cold launch then succeeded (`TotalTime` 1,351 ms,
`WaitTime` 1,360 ms). These measure Android activity launch, not populated-data
readiness; they are a single observation, not a performance comparison.

After mirroring was closed, the pass exercised reduced-motion selection,
ambient rendering/Back wake and both system-settings round trips without another
observed freeze before standby. Following physical wake, two ARD-return retests
also succeeded with mirroring off. They cover ARD's main screen; the earlier
onboarding transition and exact original conditions were not recreated. Filtered
live logs were collected in both resumed portions. No HomeScreen fatal error
was identified. Final exit history adds only the intentional 11:14:25 app stop
(`USER REQUESTED`), with no new app crash/ANR entry. The native crash buffer still
contains the earlier 09:56:49 codec crash. System warnings alone must not be
treated as an app-specific failure report.

The app-restart test's first immediate `am start` returned an apparently
successful result while the screenshot showed the stock launcher. That capture
34 is excluded from app-start success evidence; the subsequent launch/capture 35
confirms the populated HomeScreen dashboard. This is why launch-command status
alone is insufficient. Capture 36 verifies persisted motion preference after
that restart.

Screenshots, native hierarchy XML, JSON summaries and the fixed-target capture
helper are kept locally in `artifacts/tv-baseline-2026-10-23/`, excluded from Git
because they contain household data. Captures `01`–`07` establish the dashboard,
Activity return and selected favorite; `08-favorite-direct.png` establishes ARD
onboarding, and `09-favorite-return` establishes ARD's main screen.

Exclude `08-favorite-launched.xml/json` from focus evidence: UIAutomator reported
a null root, and its old remote XML was reused. The screenshot at that label
shows a transitional frame. The capture helper was corrected to require a
successful dump to a unique filename before accepting subsequent UI evidence.

## Remaining work and final state

The broader baseline gate remains open. The later ambient wake fix and its
native/device regressions are recorded below. Continue freeze diagnosis using an instrumented repeat of the original
onboarding/return conditions, controlling mirroring separately. Two successful
main-screen returns do not prove the original freeze fixed. Neither result
justifies a speculative shared-rendering change.

Use a separate emulator/test account or recoverable local connection for
offline/expired-cache/account-isolation tests. Package-change invalidation,
actual input switching, no-input devices, widget removal/reorder fallback,
physical remote latency, TalkBack/narration and couch readability also remain
open in the [smoke checklist](../../HomeScreen/TV_TEST_CHECKLIST.md).

At the end of the baseline portion, the TV was awake on HomeScreen, ARD Mediathek's favorite tile focused,
and the original Use device setting motion choice restored. Android Studio was
closed by the user; no pairing credentials were cleared, no network configuration
was changed, and no new APK had yet been installed. No application source had
changed before the ambient fix follow-up.
The intentional force-stop appears in diagnostic history and is not a crash.
Documentation link checks and `git diff --check` passed; no app build or unit
suite was rerun for these observation/documentation changes.

## Ambient arrow-wake fix follow-up — October 23

The original ambient screen disabled covered dashboard focus and had no focused
input surface. A first focus-only JavaScript build allowed Select wake but still
failed Right wake on the Sony: the global `TVEventHandler` path was insufficient
on this setup. The final change uses a small native `AmbientWakeView` in the
existing TvWatchNext module, rendered only over active ambient content.

The view acquires focus on attach/window focus, consumes complete arrow and
Select/Enter presses, then emits the wake callback on release. Unpaired/canceled
releases cannot close a newly opened preview. Back keeps its existing handler;
system/media keys are outside the native handler's key set. The JavaScript hook
also ignores key-up/focus noise and leaves ambient Select to its wake surface.
The saved dashboard target remains separate from ambient focus.

Signed APK SHA-256:
`810c2f08b3e28e6253bedcf7e3322666169cad8ceb63760c99ab67bc3281ec2b`.
It uses the existing HomeScreen Upload signer/certificate recorded above and
was installed with `adb install -r`, retaining the paired account and layout.
This is a working-tree fix after `826922e`; version/code still report `1.0.0`/`1`.
It requires the updated native binary, not just a JavaScript reload. No backend
or companion deployment is involved.

Validation:

- TV TypeScript check and all 112 default TV tests passed.
- Seven browser interaction tests passed, including two new ambient tests using
  the real hook/wake wrapper with a mocked native view. They verify callback
  wiring, retained dashboard nodes/focus, key-release noise and Select/Back;
  they do not establish Android key delivery.
- Seven native unit tests passed: four existing app-cache tests and three new
  ambient-key tests for all directions/Select, unpaired/canceled/focus-lost
  releases and system/media keys outside the handler.
- Signed release build and APK Signature Scheme v2 verification passed.
- On the physical Sony, captures 53/56/59/62 show the native ambient view focused.
  Right/Left/Up/Down wake captures 54/57/60/63 each show the dashboard with Settings
  focused. Captures 66/69 confirm Select and Back return without opening Settings.
  Preview entry stayed in ambient until another input was sent.

Animated photos can prevent UIAutomator from reaching idle. Ambient evidence
therefore uses native view dumps plus screenshots; post-wake hierarchy captures
verify the focused dashboard label. An unavailable hierarchy is not treated as
a successful focus check. Raw captures/build logs remain in the ignored local
baseline directory. The original photo selection was restored after a temporary
source change during navigation; the motion preference remains Use device setting.

Automatic idle entry also passed with the configured five-minute timeout.
Capture 70 selected Activity at 12:09:24 EDT; capture 71 at 12:15:53 showed
ambient content with the native wake view focused. One Right press returned to
Activity at 12:16:15 (capture 72), with the same focus bounds and no detail panel
opened. The TV was left awake on that dashboard with the original My photos (3)
source and Use device setting motion choice retained.

The ambient arrow-wake finding is resolved on this installed build. The separate
ARD freeze and other outstanding baseline checks remain open.
