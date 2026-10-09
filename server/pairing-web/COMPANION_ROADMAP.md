# Companion roadmap

Reviewed October 9, 2026. Checked milestones are implemented in source; use the [project status](../../docs/PROJECT_STATUS.md) for original-vision gaps, deviations, and dated release evidence. This roadmap does not establish which revision is deployed.

## Completed milestones

- [x] Pair TV with permanent companion QR/address, Google browser ownership, and individually named/revocable managed TV sessions. Unmanaged legacy sessions must pair again.
- [x] Account connections, permission explanations, meal Sheet setup, disconnect/sign-out/deletion controls.
- [x] Automatic rows and validated 12×6 free layout with drag/swap/resize, numeric/keyboard controls, and adaptive TV cards.
- [x] Palette/accent/background, per-card color/opacity/border/corner styling, photo viewing/selection/zoom, and ambient preferences.
- [x] Explicit Save to TV, stale-save protection, autosaved/recovered drafts, session Undo/Redo, up to 20 named designs and 30 published revisions.
- [x] Shared weather locations/active/default selections and activity goals, photo revisions, and per-TV favorite apps.
- [x] Reusable poll templates/rounds, phone QR participation, results/moderation/export, independent widget instances and retention. See [Polls](POLLS.md).
- [x] Invitations with explicit activity-only consent from other accounts, independent activity widgets, and participant/owner revocation. See [People](PEOPLE.md).
- [x] Fonts/reading colors, bold/spacing choices and OpenDyslexic preset in the studio; TV-local narration is configured on the TV.
- [x] Dashboard, Polls, People, Weather & goals, Meals, TVs & account, Pair TV routes, plus separate guest voting; responsive companion shell.

## Remaining priorities

- [ ] Current deployment and real consent/device/hardware verification, including vote cookie forwarding and activity expiry/revocation; see feature release guides and [security setup](../SECURITY.md).
- [ ] Activity-provider migration before Google Fit support ends; eligibility/metric coverage and a possible phone ingestion path need validation.
- [ ] Personal profiles, general household roles/source-specific sharing beyond activity, independent per-TV appearance, or separate compact layouts.
- [ ] Week/month calendar UI and in-app source selection, fuller task management, richer media/watchlists, and offline/cold-start behavior across the product.
- [ ] Additional typed design controls such as text-size scale, layout spacing and selectable widget variants. Reading weight/letter spacing already exist; arbitrary web CSS is not supported on React Native TV.
- [ ] Daily-content widgets (quotes, jokes, opt-in verses) with attribution, filtering, caching and provider fallback. The instance model supports built-ins, polls, and people activity; broader registry/provider support remains work.
- [ ] Universal search, smart-home integrations, automatic time-of-day modes, and broader media intents/catalog integrations.

The account owner remains the layout/connection authority. Activity participants share only consented activity; guest links authorize only their voting round. All linked TVs share published appearance and account data; favorites/narration are device-specific.

For deployment, follow the [companion setup](README.md), [layout contract](DASHBOARD_LAYOUT.md), and Polls/People guides together. Draft/history-only changes can retain the TV API; widget, settings-sync, font/native-speech, and TV-layout changes require the relevant updated TV binary.
