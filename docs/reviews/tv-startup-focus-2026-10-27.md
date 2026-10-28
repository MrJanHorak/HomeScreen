# Sony startup focus and Select checks — October 27, 2026

## Setup

- Sony BRAVIA VU1, Android 11, network ADB `192.168.1.103:5555`.
- Repository baseline `08cd788`; the installed startup-diagnostic APK was the
  same `7fcc9830d72cb0700e856d46d1184429f8529aeac013dcb9c8714b6e00c69123`
  binary used in the preceding connection-recovery pass.
- The existing process was in ambient mode. An injected Up woke it and returned
  to the populated dashboard with Settings focused. Controls and times below
  are native UIAutomator/ADB observations, not physical remote measurements.
- Raw hierarchies, screenshots, activity records, input journals, emulator
  artifacts and the preserved baseline APK are in ignored
  `artifacts/tv-startup-2026-10-27/`; they may contain household data.

## Baseline results

Six repetitions started with a fresh native hierarchy showing the dashboard
Settings button focused. A single injected Select opened Settings and Back
returned to the same Settings focus in all six cases. The foreground activity and
HomeScreen PID remained the same throughout. These passes do not explain or
erase the earlier missed Select on an already-focused control.

Three online force-stop/cold launches were sampled around 5, 15 and 30 seconds
after launch. All three remained in HomeScreen; the previously observed return
to the TV launcher was not reproduced. At each 30-second hierarchy, the populated
dashboard had no focused native control. D-pad Up focused Settings.

A fourth cold launch independently confirmed no focused control after 30 seconds.
One injected Select left the dashboard visible and the hierarchy still had no
focused control. D-pad Up restored Settings focus. This establishes a startup
focus problem in this setup; it does not prove the cause of the separate earlier
Select failures when a control was already focused. ADB-injected keys also do
not measure delivery from a physical remote.

The Sony's activity dump identified HomeScreen as resumed during the checks.
The separately queried window dump exposed no matching current-focus field; the
probe therefore recorded that absence rather than treating it as evidence.

## Change and local verification

When a TV dashboard first mounts without a remembered selection, the focus
restorer now requests Settings after two animation frames. It does so only while
the dashboard is active and only if a user-selected target has not appeared in
the meantime. Browser startup focus is unchanged, and the existing remembered
target remains authoritative after a modal, ambient mode or resume.

The regression exercises the missing/default/blocked target and ensures an
existing selection wins. The Android-style browser fixture verifies initial
focus, and the web fixture checks browser focus is unchanged. TV TypeScript,
all 118 default TV tests and eight focus/motion browser tests passed. The first
build attempt could not access the sandboxed Gradle cache; the signed build was
rerun with access to the existing cache.

## Signed Sony verification

The release APK passed APK Signature Scheme v2 verification with the existing
HomeScreen Upload certificate and was installed in place. Its SHA-256, verified
against the installed Sony package, is:
`cf5a41d13eb0fc5d35d77ba1f2c0647e8d647eedc55e54e2d2f246a31d7ef428`.
The previous APK was preserved locally before the build.

After installation, an untouched launch showed the populated dashboard with
Settings already focused. Three additional force-stop/cold launches each had
HomeScreen resumed and Settings focused at the 30-second capture without input.
For each, a single injected Select opened Settings and Back restored Settings
focus; each cycle retained its process and populated dashboard. The capture
verifier passed all six baseline Select cycles, three baseline cold starts, the
ignored initial Select, post-install focus and all three updated-build cycles.

The Sony was left on the populated dashboard with Settings focused. Pairing and
household data remained present. These checks establish the observed startup
focus improvement on this Sony/build, not a fix for the earlier missed Select
when the control was already focused, physical-remote behavior, other devices,
or a performance improvement.

## Isolated offline attempt

A separate fresh Android TV emulator was created under the ignored artifact
directory without using the existing emulator's user data. Its first attempt is
inconclusive: airplane mode disabled Wi-Fi but `dumpsys connectivity` still
showed a validated Ethernet default network, and HomeScreen did not stay in
the foreground. Those screenshots do not establish first-launch offline or
reconnection behavior. The isolated emulator was stopped; the Sony's network
and account were not modified for this attempt.

A second boot of the same isolated emulator checked its Android Ethernet shell
interface before changing any network settings or app data. `cmd ethernet help`
returned `No shell command implementation`, so the guarded test stopped and shut
down the emulator without attempting a disconnect or clearing the app. A real
network-loss check still needs another supported control route or physical help.

Physical network loss, missing/expired caches, account switching/revocation,
provider outages, the earlier Select anomaly and original ARD freeze remain
open. The broader hardware, rendering and integration gates are not complete.
