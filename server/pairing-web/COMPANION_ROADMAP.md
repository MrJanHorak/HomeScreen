# Companion roadmap

Reconciled October 23, 2026 through `55ef529`. Checked milestones are implemented in source; use [project status](../../docs/PROJECT_STATUS.md) for the feature inventory and [next steps](../../docs/NEXT_STEPS.md) for the ordered work, reasons and completion gates. This roadmap does not establish which revision is deployed.

## Completed milestones

- [x] October 22 TV experience source update: cached installed apps, stable return focus,
  device-local reduced motion, standard TV controls, and hardware benchmark tooling.
  Motion remains configured on each TV; see [TV experience](../../HomeScreen/TV_EXPERIENCE.md).
  Follow-up adds signed-APK verification, a USB-install smoke test, and comparison
  reports for device benchmarks. Five passes per build and Settings → Device
  presence checks completed on the Sony VU1; see [device results](../../docs/reviews/tv-benchmark-2026-10-22.md)
  for mixed frame timings and the remaining hardware checks.

- [x] Pair TV with permanent companion QR/address, Google browser ownership, and individually named/revocable managed TV sessions. Unmanaged legacy sessions must pair again.
- [x] Account connections, permission explanations, meal Sheet setup, disconnect/sign-out/deletion controls.
- [x] Automatic rows and validated 12×6 free layout with drag/swap/resize, numeric/keyboard controls, and adaptive TV cards.
- [x] Palette/accent/background, per-card color/opacity/border/corner styling, photo viewing/selection/zoom, and ambient preferences.
- [x] Explicit Save to TV, stale-save protection, autosaved/recovered drafts, session Undo/Redo, up to 20 named designs and 30 published revisions.
- [x] Shared weather locations/active/default selections and activity goals, photo revisions, and per-TV favorite apps.
- [x] Reusable poll templates/rounds, phone QR participation, results/moderation/export, independent widget instances and retention. See [Polls](POLLS.md).
- [x] Invitations with explicit activity-only consent from other accounts, independent activity widgets, and participant/owner revocation. See [People](PEOPLE.md).
- [x] Fonts/reading colors, bold/spacing choices and OpenDyslexic preset in the studio; TV-local narration is configured on the TV.
- [x] Independent RSS/Atom feed widgets, preset/custom source selection, title/headline limits, previews, TV story/QR/source controls and cached fallback. Added October 10; see [Feeds](FEEDS.md).
- [x] Dashboard, Polls, People, Weather & goals, Meals, TVs & account, Pair TV routes, plus separate guest voting; responsive companion shell.
- [x] October 9–17 TV refinements: cached summary startup and resume recovery, weather observation/freshness handling and secondary-city preload, grouped agenda, beyond-goal activity, pinned meals, wider media previews, sticky Cards preview, ambient thumbnail and voice-preview improvements.
- [x] Limited TV poll creation from Settings → Polls: two to six choices, reusable template plus round, retry deduplication and separate card addition. Full owner management stays on the companion; see [Polls](POLLS.md).

## Remaining priorities

The sequence below follows the [completion gates](../../docs/NEXT_STEPS.md); start activity feasibility alongside the TV baseline.

- [ ] Finish remaining current-build TV remote/lifecycle/offline checks; capture a controlled rendering trace before performance changes. October 22 benchmark results are mixed, not an established speedup.
- [ ] Prove activity replacement access/metric coverage, select and implement a migration before Fit support ends. Current vendor guidance and the server-versus-phone decision are in the next-step plan.
- [ ] Verify deployed revisions and real consent, vote cookie forwarding, TV poll creation/retry, activity expiry/revocation and settings sync; follow feature release guides and [security setup](../SECURITY.md).
- [ ] Expose Calendar/Tasks provider failure and freshness separately from true empty data. Cached startup and separate RSS persistence already exist; remaining offline feeds need explicit expiry/privacy choices.
- [ ] Choose one core workflow after reliability: recommended calendar source selection/week navigation; fuller task management/history or persistent watchlists can follow household demand. Month UI needs a fetch-window decision.
- [ ] Decide account/profile/per-TV ownership before implementing personal profiles, general household roles/source-specific sharing, independent per-TV appearance or compact layouts.
- [ ] Additional typed design controls such as text-size scale, layout spacing and selectable widget variants. Reading weight/letter spacing already exist; arbitrary web CSS is not supported on React Native TV.
- [ ] Daily-content widgets (quotes, jokes, opt-in verses) with attribution, filtering, caching and provider fallback. The instance model supports built-ins, polls, people activity and RSS/Atom feeds; broader registry/provider support remains work.
- [ ] Universal search, smart-home integrations, automatic time-of-day modes, and broader media intents/catalog integrations.

The account owner remains the layout/connection authority. Activity participants share only consented activity; guest links authorize only their voting round. All linked TVs share published appearance and account data; favorites/narration are device-specific.

For deployment, follow the [companion setup](README.md), [layout contract](DASHBOARD_LAYOUT.md), and Polls/People guides together. Draft/history-only changes can retain the TV API; widget, settings-sync, font/native-speech, and TV-layout changes require the relevant updated TV binary.
