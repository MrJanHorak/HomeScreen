# First-launch pairing after network loss — October 27, 2026

## Scope and setup

This follows the [Sony startup-focus pass](tv-startup-focus-2026-10-27.md) and
its inconclusive emulator attempts. A fresh isolated Android 16 Android TV
`x86_64` emulator was created under the ignored artifact directory; no existing
AVD data or household account was used. Its virtual Ethernet link was controlled
through a private QEMU monitor, while emulator ADB remained available. Airplane
mode and Wi-Fi disable covered the other guest network interfaces.

`dumpsys connectivity` reported `Active default network: none` before each
offline launch. After reconnection, the baseline Ethernet network was connected
and validated. This tests an unpaired, first-time launch with no saved dashboard;
it does not establish physical Sony offline behavior or account/cache isolation.

The baseline was repository `06fe684`, with the signed startup-focus APK
SHA-256 `cf5a41d13eb0fc5d35d77ba1f2c0647e8d647eedc55e54e2d2f246a31d7ef428`.
The old APK was preserved before rebuilding. Screenshots, native dumps, logs,
emulator state and scripts are in ignored `artifacts/tv-startup-2026-10-27/`.
The test requested short-lived pairing codes after reconnection but did not
authorize or pair an account. Codes and polling secrets are not reproduced here.

## Baseline observation

The offline first launch remained on Connect this TV, displayed “Getting a
pairing code” and exposed a raw DNS exception. Once Ethernet was restored and
validated, the same screen and error remained at the 30- and 75-second samples.
A force-stop/relaunch then obtained a pairing code, showing that connectivity and
the pairing service could recover while the original screen remained stuck.

An initial attempt using the same virtual-link approach captured the offline
screen but stopped early: its foreground guard looked only for an activity field
not present on that Android version. The corrected run above additionally used
the foreground UI hierarchy and completed the reconnect/restart comparison.

## Change and verification

The pairing screen now explains the connection problem and provides a focused
“Retry now” button. While foregrounded, failed code requests retry automatically,
starting at 30 seconds and backing off to at most five minutes. Requests time
out after 15 seconds, cannot overlap, and are canceled on unmount. The request
passes its abort signal through to `fetch`; a late timed-out response cannot
replace a later successful code. Existing valid pairing-code polling remains
separate from code-request retries.

The TV TypeScript check, 119 default TV tests, and 13 focus/motion/pairing browser
checks passed. Pairing checks cover offline retry, background pause, increasing
backoff, manual retry, overlapping and stalled requests, late responses, unmount
cleanup and signal forwarding. A parallel browser run timed out once under load;
the suite passed when run serially. The signed release APK passed v2 signature
verification with the existing HomeScreen Upload certificate. Its SHA-256 is
`101490dcc940da24f52c517dd67bb33d1a47661245ff573b5e63896e8ec6b5bd`.

## Fixed emulator results

On another fresh isolated emulator with no default network, the updated APK
showed a readable connection message, automatic-retry notice and focused Retry
now button. After Ethernet returned, a pairing code appeared automatically by
the 75-second sample without an app restart. In a second isolated app-state
run, the focused button was activated with ADB-injected Select after reconnection,
and a pairing code appeared. Both emulator runs ended without pairing an account.

The earlier Sony HTTP-refusal pass and this emulator's virtual network loss are
distinct evidence. The updated pairing APK was not installed on the Sony.

## First Sony cable attempt

The user disconnected and later reconnected Ethernet. The TV reported no default
network briefly, then automatically switched to its existing Wi-Fi connection.
The detached activity commands also reported failed transactions; the original
HomeScreen PID remained present. A screenshot during the no-network interval
showed the retained ambient screen, not a cold-started dashboard. This attempt
therefore does not establish physical offline startup or saved-cache recovery.
Ethernet returned, and Wi-Fi remained enabled as before.

## Second Sony cable attempt

Wi-Fi was temporarily disabled while Ethernet was connected. After the user
unplugged Ethernet, the device journal reported no default network and Wi-Fi off
at 02:15:11 UTC. Detached activity launches failed with Binder transaction
errors. The user manually opened HomeScreen while offline and reported that it
entered ambient mode with the time and information visible but no image.

Read-only logcat output for the new process recorded JS entry at 02:17:48 UTC,
cache restoration and application about 2.3 seconds later, followed by failed
network refreshes. The startup log also showed Google Photos loading failures.
The selected remote photos are fetched over the network at startup, explaining
the missing image; after reconnection a selected photo appeared again. No offline
UI screenshot was captured. The raw startup log rotated before export, so the
timestamps in the ignored artifact's `manual-startup-observations.txt` are
transcribed from the earlier tool output, not a preserved raw log.

After Ethernet was reconnected, the same process remained running. A later
capture still showed saved-data warnings; by the 02:31:40 UTC capture those
warnings had cleared and dashboard data had changed, consistent with automatic
recovery. The exact reconnection and successful refresh times were not captured.

The detached Wi-Fi restoration watchdog also failed with Binder transaction
errors, despite succeeding in the connected preflight. Wi-Fi was subsequently
enabled directly over ADB after Ethernet returned; `wifi_on=1` and validated
Ethernet were verified. The user's original Wi-Fi setting was restored.

This is evidence of a manually initiated paired Sony offline start, cache
restoration and eventual recovery, together with the user's ambient observation.
It does not establish expired or missing cache behavior, account isolation,
first-time Sony pairing, or a systematic physical-remote test.
