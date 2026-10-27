# Sony cached startup during HTTP failure — October 27, 2026

## Scope and setup

Follow-up to the offline/reconnection priority after the ambient-rotation pass.
This exercises a cold start with refused HTTP connections on the physical Sony,
followed by restoration of the original connection settings. The network link and
ADB stay available. It is transport-failure evidence, not a physical network-loss
or Android connectivity-state test.

- Sony BRAVIA VU1, Android 11, ADB `192.168.1.103:5555`.
- The Device panel reports Network: Ethernet.
- Repository baseline `260764f`; clean working tree before the pass.
- Installed APK SHA-256:
  `7fcc9830d72cb0700e856d46d1184429f8529aeac013dcb9c8714b6e00c69123`.
  This matches the startup-diagnostic build in the preceding device reports.
- Paired owner, saved summary and appearance already present. Account, stored
  summary, published design, ambient and motion preferences were not edited.
- All five global HTTP proxy settings were initially absent.

Raw screenshots, native activity dumps, UI hierarchies, process logs, original
settings and the helper/verifier remain in ignored
`artifacts/tv-startup-2026-10-27/`; they contain household data.

## Method and safety

After an online dashboard capture, temporarily set the Android global HTTP proxy
to `127.0.0.1:9`, where connections are refused. This routes HTTP clients toward
an unavailable local endpoint without cutting the LAN control connection.
Android's [versioned proxy implementation](https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-11.0.0_r1/services/core/java/com/android/server/connectivity/ProxyTracker.java)
describes the setting and proxy broadcast; actual application logs establish that
the tested requests used it. No request contents or credentials are intercepted.

A device-side shell guard is armed before the setting changes and restores the
original proxy state after 240 seconds if the desktop helper is interrupted.
The helper also restores it in `finally`, clears the guard and records exact
setting equality. The guard is a fallback; the measured run uses normal cleanup.

Force-stop/relaunch HomeScreen while the proxy is active, then take screenshots
and native/log samples at nominal 5, 15, 30, 65 and 90 seconds. A fresh hierarchy
follows the last sample. Restore the proxy and observe the retained process at
10, 45 and 95 seconds without refresh, navigation or a restart during that interval.
These are sparse observations with capture overhead, not frame-rate or latency
benchmarks. Startup milestones measure JS-side commits/callbacks, not the instant
pixels become visible.

## Observed failure behavior

The measured failure launch stayed resumed in PID `3598`. Its milestones, in
milliseconds from JS entry, were:

| Phase | Elapsed |
| --- | ---: |
| Authentication ready | 1,734 ms |
| Local appearance ready | 1,754 ms |
| Saved summary applied | 1,979 ms |
| Cached content effect | 2,655 ms |
| Cached frame callback | 3,117 ms |
| First summary failure | 3,811 ms |

All five samples retained the same process, resumed activity, saved-summary
restoration and configured failure proxy. No live-summary marker appeared during
the bounded startup logging window. Logs show connection refusal at
`127.0.0.1:9` for remote appearance/Photos and weather, plus failed dashboard
requests. Remote appearance failure did not hold the startup screen.

Screenshots show populated Weather, Schedule, Meals and Activity cards, native
Media and favorite apps. The saved Calendar/Tasks footer retains the original
October 27, 5:29:32 PM source timestamp; Schedule is labeled Saved. It remains
populated after refresh fails. The second dashboard request failed about 60
seconds after the first, establishing the first automatic retry on this run.
The provider-specific footer takes precedence over the generic retry text in
the current implementation. The pending Updating footer was not captured.

An earlier online cold-launch probe restored cached content in its JS logs but
ended with the TV launcher foregrounded and HomeScreen stopped. Its cause is
undetermined; exclude that probe from visible cold-start/timing comparisons.
The online precheck and measured failure run have separate captures. This pass
does not establish an overall startup speedup or resolve that launch observation.

## Reconnection and validation

Normal cleanup restored all five proxy settings to their original absent state
at 5:39:40 PM. The retained PID `3598` stayed resumed throughout the subsequent
captures. No navigation, manual refresh, background/resume or restart occurred
during the recovery observation window.

The 45-second post-restoration screenshot still shows saved-provider warnings;
the 95-second screenshot and final native hierarchy show them cleared. Schedule
returns from Saved to its date label and an Activity value updates. This is a
successful automatic recovery in the existing process, consistent with the
two-minute retry scheduled after the second failure. Sparse captures do not
establish the exact successful-response time. The process-local startup logger
stops after two minutes, so no later live marker is expected or required as
evidence; the UI transitions establish the result.

After the automatic-recovery interval, D-pad Up focused Settings. The first
injected Select left the dashboard visible (baseline captures 171–172), repeating
the earlier input observation without establishing its cause. A tap at the
freshly observed Settings bounds opened the panel. Eight D-pad Down presses
reached Device; selecting its observed control showed Connected & Live before
any manual summary refresh.

After scrolling the Device pane, the helper initially paused because the native
hierarchy exposes Refresh Live Data through both its container and child text.
No refresh or sign-out was selected on that attempt. Deduplicating the same
observed bounds allowed activation of Refresh Live Data; after 20 seconds the
panel remained Connected & Live without a displayed refresh error. This is a
control-activation/status check, not a measured provider-response comparison.
Touch setup does not establish physical-remote Select delivery.

Back and D-pad Up then returned to the populated dashboard with Settings focused,
still PID `3598`, and all five proxy settings absent. Temporary device guard files
were removed. No account or published appearance settings were changed.

The capture verifier passed all five failure samples, resumed-state/PID
continuity, cache restoration, repeated failures, exact settings restoration and
the recovered populated dashboard without saved/failure warnings. Failure and
recovery screenshots were visually inspected. All 145 local links in the seven
changed documents and `git diff --check` passed. Product unit tests were not
rerun because application source is unchanged.

## Remaining scope

Physical network loss/reconnect, Android offline-state behavior, stalled rather
than refused requests, expired/missing caches, first-ever offline startup,
account switching/revocation and unavailable secondary-city/Polls/People data
remain open. Use a test account/emulator or a separately recoverable control
route for disruptive account and true disconnection checks. The reported
minute-long startup, prior Select anomalies/ARD freeze and broader rendering,
accessibility and release gates remain open.

Application source and the installed APK are unchanged. No backend or companion
deployment is required for this verification.
