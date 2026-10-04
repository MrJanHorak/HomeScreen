# Companion site direction

The pairing site is also the signed-in dashboard editor at `/dashboard`. It writes the existing `userAppearance` document and needs no additional Google permission to edit appearance. The TV refreshes that document roughly every 45 seconds. The editor supports the six existing cards in automatic rows or a free layout canvas, plus presets, palette, accent, and background choice. A selected Google photo still originates from the TV's Photos picker.

The owner device-management milestone is implemented: the TV settings include a permanent companion QR/address; the site lists newly paired TVs, lets the owner rename them, and removes an individual TV's access. Managed TV requests are checked against a server-issued device claim and the owner's device record. Legacy TV sessions require one re-pair to join the managed device list. Google connections are listed with permission explanations, and Sheets access can be removed even before choosing a workbook. Deployment and a new TV build are required to use these changes.

## Flexible layout

**Implemented in code:** a version-1 12-column by 6-row grid with each card storing `x`, `y`, `width`, and `height`; shared server/client validation; a TV grid renderer; a phone canvas with touch/pointer dragging, corner resizing, numeric controls, and keyboard movement. Validation rejects overlaps, out-of-bounds positions, missing/duplicate cards, and sizes below 3-by-2. Small TV tiles use summaries that open the existing detail views. The same grid scales to compact and full-size TVs, while the existing card list remains the fallback for older TV builds. See the [layout contract](DASHBOARD_LAYOUT.md).

**Save to TV** is the explicit publish action. The studio now autosaves an account draft after editing pauses, recovers it on return, and offers Save draft, Undo/Redo, up to 20 named designs, and the latest 30 published revisions. Loading a design or restoring a revision changes only the draft until Save to TV. Conditional draft/design writes and publishes reject stale revisions while retaining page edits. A recovered draft retains its original publish revision, so it cannot overwrite newer TV settings. Separate per-TV designs and independent compact layouts remain future options. Deployment and an updated TV app are required to use the canvas.

The TV is React Native, so arbitrary web CSS cannot be applied to it. Palette, accent, background, per-card surface color/opacity, border thickness, and corner radius are implemented. Grid cards now adapt their information to width and height, and the companion displays saved TV Photos with a larger view and background preview. New photos are still chosen through the TV picker. Further typed design tokens remain next-stage work: typography scale, spacing, and selectable widget variants, with range and readability validation. Drafts/designs/history use separate documents; the TV continues reading only published settings.

Adaptive summaries now measure text and row heights. Activity retains its original
centered-percentage ring and colored metric icons; Media shows primary and next
artwork and provider-supplied progress; compact Tasks shows multiple icon rows.
Photo zoom (100–150%, default 105%) crops embedded borders while preserving the
saved image. The favorite-app viewport reaches the frame edges and measures
scroll visibility for the focused tile.

## Widgets and polls

Introduce a widget registry with a stable type, versioned settings schema, minimum grid size, data source, and TV detail view. Existing weather, schedule, activity, media, meals, and tasks become registry entries. Quotes, jokes, and verse widgets can follow the same contract. Each should expose source attribution and a content filter or hide control; daily feeds need caching and a fallback when a provider is unavailable. Bible verse should be opt-in.

Polls need their own data model, separate from appearance: question, options, open/close time, visibility, and votes. Start with owner-created household polls and signed-in voting. Enforce one vote per account per poll in a transaction, and do not reveal individual votes on the TV unless the creator opts in. A poll widget reads a summary, while the phone companion handles creation and voting. Public or anonymous voting needs additional abuse controls and should be a distinct later feature.

## Sharing and permissions

Today the Firebase UID is the account boundary. Any TV paired to that account shares its settings and connected Google data; there are no household members or public links. Keep the linked account owner as the only person who can change layout, Sheets, polls, and connections in the first release. The device list now lets the owner remove one managed TV without revoking every session. If sharing is introduced later, add explicit roles and a household record, keep each person's Google OAuth grants private, and require a source-by-source choice before showing personal data to the household. Enforce every role in Cloud Functions, use expiring single-use invitations, and record who last changed a published layout.

## Delivery sequence

1. **Implemented:** companion appearance editing, permission explanations, permanent TV QR/address, and owner device management.
2. **Implemented:** typed grid schema, adaptive TV content, phone canvas, per-card color/opacity, saved photo viewing, Save to TV, and stale-save protection.
3. **Implemented in code:** saved designs, account drafts with autosave/recovery, session Undo/Redo, restoration to a draft, and bounded published revision history. Deploy Functions and Hosting together; this milestone needs no new TV binary.
4. **Next:** owner-created polls and signed-in voting, with a poll summary widget.
5. **Planned:** quotes, jokes, opt-in Bible verses, and deeper style tokens.
6. **Optional later:** household roles and per-TV configurations, with source-specific sharing consent.

Polls and new feed widgets are not implemented. Each milestone can ship independently while the existing TV fallback keeps working.
