# Sony ambient photo/information rotation — October 26, 2026

## Scope and setup

Follow-up to the remaining photo/detail-rotation item in the TV baseline. This
checks the selected-photo loop, enabled information types, four information
positions and sampled backdrop movement on the physical Sony under standard
and OS-driven reduced motion. It does not measure animation smoothness.

- Sony BRAVIA VU1, Android 11, network ADB `192.168.1.103:5555`.
- Repository baseline `223fffb`; clean working tree before the pass.
- Installed startup-diagnostic APK SHA-256:
  `7fcc9830d72cb0700e856d46d1184429f8529aeac013dcb9c8714b6e00c69123`.
- HomeScreen PID `3731` throughout both measured phases and restoration.
- Original ambient settings: On, five-minute idle entry, My photos (3),
  three-minute photo changes, all five information types enabled and a
  30-second detail interval.
- Original Android `transition_animation_scale`: exact string `1.0`.
  Use device setting is selected, confirmed again during restoration.

Only the photo interval is temporarily changed to one minute. Photo selection,
source, information switches, detail interval and idle timeout are retained.
The reduced phase uses Android transition scale `0`; the sampling helper records
and restores the original scale in `finally`, including on failure.

## Method

Animated settings previews can prevent UIAutomator from reaching idle. Settings
inspection therefore briefly disables system transition animation, obtains a
fresh native hierarchy, and restores the exact previous value. Changing motion
can move settings focus back to the modal's Back control, so focus from before
that change is not reused as selection evidence.

The timing and preview setup uses taps at freshly observed native control bounds.
Those taps are setup actions, not evidence about physical remote delivery.
The normal preview is entered with reduction enabled, then system motion is
restored before its sampling clock starts. Thus this pass does not test the
normal entrance fade. Ambient wake/return is checked separately using D-pad input.

Each phase samples at nominal seconds 5, 15, 35, 65, 95, 125, 155, 185, 215,
245, 275, 305, 335 and 365 after setup. Actual screenshot start/end timestamps
are saved. Each sample checks the process ID, system scale and a focused native
AmbientWakeView; saved native dumps also establish foreground activity and
information-block positions. No input or UIAutomator runs during sampling.

Backdrop comparisons use RGB pixels outside all information positions: top
`(100,20)-(1820,100)`, bottom `(100,990)-(1820,1070)` and central gap
`(950,100)-(970,980)`. This excludes changing clock/detail text. Raw equality
and mean absolute RGB-channel difference are recorded. Screenshots can perturb
rendering, and these sparse samples cannot prove continuous stillness, fade
timing, frame rate or physical-remote latency.

Raw screenshots, native dumps, settings XML, timing journals and derived
comparisons remain in ignored `artifacts/tv-startup-2026-10-26/`, since they
contain household information. The existing baseline capture helper records
setup/wake navigation in ignored `artifacts/tv-baseline-2026-10-23/`.

## Results

The standard run is `normal/`; the measured reduced run is `reduced-success/`.
Both sampled the three selected photos in order and returned to the first photo
at 185 seconds. The same three-photo sequence repeated, with the first photo
visible again at 365 seconds. The first five detail samples were Weather (5),
Next up (35), Activity (65), Tasks (95) and Meal plan (125); the sequence then
repeated while the clock continued to update.

| Nominal sample | Information position in both phases |
| --- | --- |
| 5 seconds | Upper left |
| 95 seconds | Upper right |
| 185 seconds | Lower right |
| 275 seconds | Lower left |
| 365 seconds | Upper left again |

Native information-container bounds confirm the sampled position loop;
screenshots establish photo identity and detail labels. The application remained
foregrounded with the native ambient wake surface focused throughout sampling.

For the first same-photo pair (5 to 15 seconds), standard-motion mean absolute
RGB differences were **4.427 top, 3.592 bottom and 6.083 central gap** on the
0–255 scale. The reduced pair was **exactly equal in all three regions**. The
reduced same-photo comparisons after looping (5/185, 65/245, 125/305 and 5/365)
were also exactly equal in all three regions. Different-photo comparisons were
nonzero in both phases. Thus photo/information rotation continued under OS
reduction while the sampled photo backgrounds stayed still between changes.

Setup attempts in `reduced/`, `reduced-run/` and `reduced-cycle/` stopped before
sampling because the expected preview control was absent. A rapid Back/Select
sequence left the dashboard visible; a later Settings opening displayed Colors
rather than Ambient. The guard recorded the errors, saved no measurement frames
and restored `1.0` each time. These attempts are excluded from the rotation
results, and do not resolve the earlier Select observation in the detail-return
report. Ambient was explicitly selected before the successful reduced run.

## Restoration and validation

Arrow wake after the reduced phase returned to the populated dashboard with
Settings focused (baseline capture 166). Restoration settings XML confirms On,
five-minute idle entry, My photos (3), three-minute photo changes, all five
information switches and the unchanged 30-second detail interval. The photo
selection was never edited. Accessibility confirms Use device setting; a final
standard-motion capture is recorded separately from the temporary reduced-mode
settings inspections (167). Final system reads confirm transition scale `1.0`,
animator duration scale `null` and PID `3731`. Back returns to the populated
dashboard (168); D-pad navigation then restores Settings focus after the
touch-based setup (169).

The capture verifier passed 14 samples per phase, foreground/native focus,
all four positions and their wraparound, the normal-motion control, reduced
same-photo equality and system-value restoration. Contact sheets were inspected
for both complete runs. All 90 local documentation links and `git diff --check` passed.
Product unit tests were not rerun because application source was unchanged.

## Limits

This is selected-photo evidence at a temporary one-minute photo interval and
the existing 30-second detail interval on one Sony/build. It does not verify
the built-in gallery, empty/missing photos, other cadences, continuous fades,
background/resume timer behavior, audio/TalkBack, physical-remote latency or
other devices. The three-minute preference is restored afterward; this pass
does not claim a full timed loop at that cadence. The earlier ARD freeze,
reported slow startup, offline/account recovery and broader release gates
remain open. No application source change or APK/backend deployment is needed
for the observed rotation behavior.
