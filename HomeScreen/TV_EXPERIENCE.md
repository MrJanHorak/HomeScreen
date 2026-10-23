# TV experience and performance

Implemented in source October 22, 2026. Native changes require a new Android app
build; JavaScript updates alone do not add the new native functions. Physical-TV
verification and before/after performance measurements remain required. Source
inspiration and licensing are recorded in [third-party notices](THIRD_PARTY_NOTICES.md).

## App discovery and background work

The native app catalog caches installed-app labels and 160×90 artwork in process
memory. Ordinary returns from another app reuse it. Package install, update,
removal, and enabled-state broadcasts invalidate the snapshot; several broadcasts
while covered lead to one rebuild on return. Foreground updates are coalesced for
150 ms. A change arriving during discovery remains invalidated for the next read.
Settings → Apps → Refresh bypasses the cache, including for changed labels or OEMs
that miss broadcasts. A new process starts with an empty catalog. Favorites remain
keyed by package name, including while an app is temporarily unavailable.

The dashboard clock updates at minute boundaries and at registered poll closing
times, and catches up immediately on resume. It has no background timer. Favorites and appearance polling skip
background/inactive work; favorite preferences refresh on resume. The dashboard
summary's existing foreground-aware refresh/cache behavior is retained.

## Focus and motion

Dashboard widgets, favorite apps, and Settings register stable focus
IDs with screen-local memory. The dashboard stays mounted beneath ambient mode,
preserving measurements and state while disabling focus/accessibility on its controls.
Closing a detail panel, waking from ambient mode,
or returning from another app restores the selected ID after the next layout
commit. Removed items fall back to a neighboring registered entry. Detail controls
do not overwrite the dashboard return target. This does not introduce global
remote interception or system Home-button remapping.

The October 23 ambient wake fix adds a focusable native surface over ambient
content. It handles the four arrows and Select/Enter locally, consumes both
halves of the press, then returns focus to the saved dashboard entry. It requests
focus again when the Settings modal's window finishes closing. Back retains the
existing app handler; system and media keys keep their normal routing. Native
TV-event key releases and focus/blur events do not reset the idle timer or dismiss
a newly opened preview. This requires rebuilding/installing the TV APK because
the existing local module now exports `AmbientWakeView`.

Settings → Accessibility → Motion offers **Use device setting** and **Reduce motion**.
It is saved on this TV, independently of account appearance. The system setting
is observed through Android accessibility or the browser's reduced-motion media
query. Reduced motion removes control zoom/parallax, long modal fades, ambient
photo pan/zoom, and plasma movement. Photos and information still rotate; the
ambient information block changes corner every 90 seconds to avoid keeping it in
one position. Ambient animation loops and timers stop when backgrounded.

## TV controls

Open **Settings → Device** for TV controls. It shows
Wi-Fi/Ethernet/offline status, Network settings and Android settings shortcuts,
and visible passthrough inputs reported by Android's `TvInputManager`, using custom
input names when available. Devices with no reported inputs show no input list.
Use **Refresh TV status** after connecting a source; status also refreshes after
returning from system settings. Firmware that does not expose standard controls
may require the remote's Settings/Input button. No SSID/location permission or
vendor-specific service invocation is added.

## Verification

From `HomeScreen`:

```powershell
npm run typecheck
npm test
npm run test:experience
# Browser checks need Playwright and Chromium (as with the other browser fixtures).
npm run test:experience:browser
```

Native cache regression tests, with the Android SDK and JDK configured:

```powershell
cd android
.\gradlew.bat :tv-watch-next:testDebugUnitTest
```

October 22 verification: TV TypeScript checks, all 102 default unit tests,
5 focus/motion browser checks, 27 existing settings browser checks, 4 native cache
unit tests, native Kotlin compilation, Android Metro/Hermes export, and the
benchmark's dry run passed. Browser checks used installed Chrome with bundled
Playwright. They do not establish native TV focus behavior or a hardware speedup.

Later that evening, five passes per build were completed on a Sony BRAVIA VU1
(Android 11), and the header shortcut was removed and verified on the TV. Results,
the resume-timing correction, and outstanding hardware checks are in the
[dated benchmark report](../docs/reviews/tv-benchmark-2026-10-22.md). TV TypeScript
checks and all 112 current unit tests passed. Frame-timing results are mixed;
an overall speedup has not been established.

On a physical TV, verify return focus after an app launch, a detail panel, Android
settings, and ambient mode. Also remove/reorder the focused widget through the
companion. Install/update/disable an app while another app is foregrounded, then
return and confirm the app list is current. Check both motion choices, the OS's
animation setting, input naming/switching, and devices without HDMI inputs.

For a USB install, the [remote-only smoke test](TV_TEST_CHECKLIST.md) is the first
step. It also records the checked APK identity and keeps actual TV results separate
from local build verification.

## Repeatable device benchmark

Use the same TV, firmware, account, layout, wallpaper, motion preference and release
build mode for both revisions. Close dialogs, start on the dashboard, let content
settle, then run five repetitions per revision. Connect with the normal ADB
workflow in [RELEASE.md](RELEASE.md) first. The script requires an explicit device
and does not install builds or change the default launcher.

```powershell
node scripts/benchmark-tv.cjs --help
node scripts/benchmark-tv.cjs --serial 192.168.1.103:5555 --label before --build-id OLD_COMMIT --runs 5
# Install the comparison build using the release guide, then repeat:
node scripts/benchmark-tv.cjs --serial 192.168.1.103:5555 --label after --build-id NEW_COMMIT --runs 5
```

Optional `--adb` selects the executable, `--component` selects an activity within
`--package`, and `--out` selects a result directory. `--dry-run` prints the planned
ADB commands without contacting the TV. The real run force-stops HomeScreen for
cold launches, opens Android Settings for resume measurements, and sends a fixed
sequence of arrow keys. Do not run it during normal household use.

Results are timestamped JSON in `artifacts/tv-benchmarks` relative to the working
directory. Compare all repetitions, including outliers. The records contain model,
Android/firmware, Android activity launch/wait times, navigation frame percentiles,
Android's jank counts, and final process PSS memory. Unavailable metrics are null.
Raw dumps and other apps' process lists are not saved.

New schema-2 recordings also save the scenario's exact delays/key sequence,
component, and installed app version/debuggable flag. `--build-id` is an
operator-supplied source label, not an independently verified installed commit.
Older schema-1 recordings remain readable by the comparison tool.

Compare the two result files without contacting the TV:

```powershell
node scripts/compare-tv-benchmarks.cjs "artifacts/tv-benchmarks/before-TIMESTAMP.json" "artifacts/tv-benchmarks/after-TIMESTAMP.json"
# Save a reviewable report, refusing to replace an existing file:
node scripts/compare-tv-benchmarks.cjs "before.json" "after.json" --out "comparison.md"
# Machine-readable summary:
node scripts/compare-tv-benchmarks.cjs "before.json" "after.json" --format json
```

The report shows medians, signed changes, valid sample counts, retained outliers
above twice the median, frame-weighted jank, and the final PSS snapshot. Its frame
p50/p95 rows are medians of per-run percentiles, not pooled percentiles. Jank delta
is in percentage points. Missing values stay missing and percentage changes from
a zero baseline are omitted. Known model/Android/firmware, package, scenario, or
debuggable-mode mismatches stop comparison; missing legacy metadata is called out.
The operator still needs to use the same TV, layout, data, wallpaper and motion
setting. These small samples do not establish statistical significance.

The comparison follow-up passed all 111 default unit tests, including 9 report
regressions covering outliers, weighted jank, missing/zero metrics, metadata
mismatches, legacy data, installed-app metadata, file handling and CLI output.
The schema-2 benchmark dry run passed. No new TV app build is needed for these
desktop tooling changes.

Cold launch uses Android `TotalTime`; resume comparison uses `WaitTime`. The
Sony BRAVIA Android 11 test repeats cold `TotalTime` values when an existing
activity resumes, so those values must not be presented as fresh resume timings.
`WaitTime` measures the activity-manager command wait, not first-frame readiness.

Android launch timing measures activity startup, not first populated dashboard
content. Frame duration measures drawing, not key-to-focus latency. The frame ring
buffer is only a sample, while Android's total/janky frame counters can cover a
larger window. This initial harness does not measure idle CPU or provide Perfetto
traces. Supplement it with Android tracing when investigating a specific stall;
do not infer a speedup from source changes or browser results alone.
