# Sony startup investigation — October 25, 2026

## Finding and change

The app could request its bundled NASA background before Firebase session
restoration and local appearance hydration completed. The Sony's saved choice
was **Solid color**, confirmed without changing it (baseline captures 85/86).
The initial default photo was therefore unnecessary.

`ThemedScreen` now waits for authentication initialization, and for a signed-in
account's local appearance, before choosing a background image. Confirmed
signed-out pairing can still use the default background; selected photos remain
available once preferences are ready. Provider mounting and the stable screen
wrapper are unchanged. No backend deployment was needed.

This removes an unnecessary image request. It does **not** establish an overall
startup speedup or resolve the previously reported minute-long wait.

## Builds and setup

- Physical Sony BRAVIA VU1; network ADB target `192.168.1.103:5555`.
- Before: source `50c70b3`, installed APK SHA-256
  `0cac134996a71a0b4c7ea14deb335ce9b2fd7828fcdde6cd9d43678b12bdf037`.
- After: background-readiness change after that commit, APK SHA-256
  `34084a9461dac98ae6f12a38a3544d41fb9e41001bcb9890d0a633fcd0516583`.
  Release signing and APK Signature Scheme v2 verification passed. The generated
  bundle source map matched the final saved App.tsx before installation.
- `adb install -r` retained account, layout, background and favorites. No apps,
  credentials, network settings or motion preferences were changed. No Android
  Studio/scrcpy process was observed on the host during setup.

## Method and results

One approximately 24-second native `atrace` recording per build covered scheduling,
graphics/view, activity/window management, resources, VM/GC, binder and database
events. Timed screenshots sampled startup. Five additional untraced cold launches
per build used the same force-stop/explicit-launch/capture schedule. All ten
untraced launches logged successful dashboard cache restoration.

| Observation | Before | After | Interpretation |
| --- | --- | --- | --- |
| Android WaitTime samples (ms) | 1,272 / 1,207 / 1,144 / 923 / 1,061 | 1,082 / 973 / 1,065 / 960 / 1,217 | Medians 1,144 and 1,065; overlapping ranges. Activity launch is not data readiness. |
| Fresco decode CPU in the traced interval | ~1,173 ms | ~420 ms | Less decode work in this trace pair. |
| Longest decode starting in the first six seconds | ~1,502 ms | ~6 ms | Consistent with avoiding the unused photo; the trace does not identify its URI. |
| JavaScript thread CPU in the traced interval | ~4,140 ms | ~4,063 ms | Substantial startup work remains. |
| Main thread CPU in the traced interval | ~3,266 ms | ~3,496 ms | Mixed; no general rendering improvement established. |
| Longest observed GC slice | ~861 ms | ~1,252 ms | GC/frame stalls remain; not an overall performance win. |

The traced baseline's 5-second screenshot showed loading cards. Its 7.5-second
sample showed saved information and the saved-data footer; the next sample showed
refreshed data. The updated trace also showed saved cards in its 7.5-second sample
and refreshed data in the following sample. Apps/media artwork filled in
separately. The minute-long delay was not reproduced.

Screenshot labels are target times, **not exact first-visible times**. Each image
records capture-start/end bounds. Readback/encoding often took 1.5–3 seconds; one
baseline capture took 9.3 seconds and delayed later samples. Captures perturb
graphics work. Runs were sequential, not randomized; live contents, caches,
JIT/OS work and thermal state were not frozen. Trace buffer wrap excludes some
early system events. CPU accounting is approximate. These limits prevent a
reliable screen-readiness percentile or frame-speedup claim.

## Verification and next work

TV TypeScript checking and all 117 default TV tests passed, including 28 cache,
session, provider and appearance-startup checks. Captures 87/88 confirm Exit app
returned to the launcher, then a retained-task HOT reopen showed the populated
dashboard with Settings focused and no exit dialog. The TV was left awake there.
Alternative photo choices/pairing were preserved in source, not retested by
signing out or changing household preferences.

Continue with a screenshot-free trace of a repeatable focus/layout scenario and
more precise startup presentation markers before changing shared rendering.
Physical offline recovery, the earlier ARD freeze and broader accessibility/
lifecycle gates remain open.

Raw traces, screenshots, logs, helpers and summaries are in Git-ignored
`artifacts/tv-startup-2026-10-25/`; they include household/system activity data.
Android's [system-tracing guide](https://developer.android.com/topic/performance/tracing/command-line)
documents category-based collection.
