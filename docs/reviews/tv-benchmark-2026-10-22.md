# Sony TV benchmark and header cleanup — October 22, 2026

The extra TV-controls shortcut was removed from the main header. The signed update
was installed with `adb install -r` on the connected Sony TV. The account, layout,
favorites and saved preferences were retained. Network/Android/input controls remain
in **Settings → Device**.

## Device and builds

- Sony BRAVIA VU1, Android 11, firmware `RTT7.210105.001`.
- Installed system ABIs: `armeabi-v7a,armeabi`; both APKs include all four release ABIs.
- Both apps: `com.anonymous.mytvapp`, version `1.0.0` / code `1`, non-debuggable.
- Before: `025c1a9`, including the original TV-controls header shortcut.
- After: `025c1a9` plus the working-tree header cleanup; no cache/rendering optimization was added between these runs.
- Both APKs use the existing `CN=HomeScreen Upload` signing identity.

The installed baseline APK was pulled and its SHA-256 matched the previously
verified build. The benchmark's baseline build-ID field is empty, so the generated
comparison warns about it; APK verification supplies the identity independently.

| APK | SHA-256 |
| --- | --- |
| Before | `5324ec5bae2498b89fe08410b18d6fc8af82b1eb163f8a7c96c7f56b86e76310` |
| After | `1ff60fd311b11c2bdcf79e19ebd5e857fc5d63bc00d6f23ea69b9262772d8b31` |

## Five completed passes per build

| Metric | Before | After |
| --- | ---: | ---: |
| Cold launch median, Android TotalTime | 1,804 ms | 1,527 ms |
| Resume command wait median, Android WaitTime | 119 ms | 123 ms |
| Median of per-run sampled frame p50 | 52.58 ms | 52.58 ms |
| Median of per-run sampled frame p95 | 80.47 ms | 146.34 ms |
| Android janky frames, frame-weighted | 92.39% (692/749) | 83.75% (696/831) |
| Final PSS snapshot | 156,363 KiB (152.7 MiB) | 128,849 KiB (125.8 MiB) |

Cold startup and the final memory snapshot were lower in this sample. Resume was
similar. Typical sampled frame cost was unchanged, while the frame-time tail was
worse despite a lower jank percentage. This does **not** establish an overall
performance improvement or a causal effect from removing the shortcut.

These tests compare the two header versions. Both contain the app-catalog cache;
there is no pre-cache control here, so they cannot quantify that optimization.

## Measurement correction and limits

On this TV, each warm `am start -W` returned exactly the previous cold `TotalTime`.
The report now uses the fresh `WaitTime` for resume instead of presenting cached
cold numbers as new resume times. A regression test covers this behavior.
`WaitTime` is an activity-manager command wait, not key-to-focus latency or the
time until household data has populated.

Frame percentiles are medians of each run's ring-buffer percentiles, not pooled
percentiles. Android's jank totals can cover more frames than those ring-buffer
samples. Memory was sampled once after each set. Household data, process/cache
warmth, system load, and the different focus path after removing a header target
can affect the comparison. Android Studio was open per the user; the influence of
mirroring was not isolated. Five passes do not establish statistical significance.

A confirmation set was attempted after the second set, but failed during the
fifth pass while starting Android Settings. No completed JSON was produced for
that set, and it is excluded. A subsequent ADB state check succeeded; the failure's
cause was not established.

## On-TV UI verification

The installed update was inspected with screenshots and Android UI hierarchy data:

- The header has the clock and Settings gear; no separate TV-controls shortcut.
- Remote D-pad navigation reaches **Device** in the settings sidebar.
- The Device panel shows **Network settings**, **Android settings**, and **Refresh TV status**.
- Network type is reported as Ethernet.
- The input list contains AV, HDMI 1, HDMI 2, and HDMI 3 / ARC, with states supplied by Android.
- The app was returned to the dashboard after verification.

Input switching, Wi-Fi configuration changes, standby/wake, and the full ambient /
reduced-motion smoke test were not exercised during this benchmark. No network
configuration or input was changed.

## Local evidence

JSON records, generated comparison, screenshots and build logs are deliberately
kept in the ignored artifact directory:

- [Before JSON](../../HomeScreen/artifacts/tv-benchmarks/installed-with-shortcut-2026-10-23T01-36-48-428Z.json)
- [After JSON](../../HomeScreen/artifacts/tv-benchmarks/settings-only-2026-10-23T01-42-25-981Z.json)
- [Generated comparison](../../HomeScreen/artifacts/tv-benchmarks/header-comparison.md)
- [Dashboard screenshot](../../HomeScreen/artifacts/tv-benchmarks/settings-only-dashboard.png)
- [Device-panel screenshot](../../HomeScreen/artifacts/tv-benchmarks/settings-only-device-panel.png)
- [Signed build log](../../HomeScreen/artifacts/tv-benchmarks/header-release-build.log)

The filenames use UTC; the measurements occurred on October 22 in America/New_York.
The before APK backup is retained locally at `HomeScreen/.release/tv-installed-before-header.apk`.

## Next investigation

Profile native rendering during a fixed focus transition on this TV, separating
CPU/layout work from GPU/shadow cost and controlling mirroring, layout, motion and
warm-up. The high measured jank makes that more useful than adding another visual
effect. Collect a controlled trace before changing shared card rendering.

Validation: TV TypeScript checks, 112 default unit tests, signed release build and
signature verification passed. This includes the new resume-report regression.
