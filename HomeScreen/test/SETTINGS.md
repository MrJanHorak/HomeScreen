# TV settings regression checks

Card controls read widget instances from the active layout. Missing built-in
cards appear as hidden options; shared activity and polls retain their own IDs,
bindings, and styles. Free layouts allow swapping complete footprints, moving
into empty space, and resizing without overlaps. Automatic rows fit eight
visible cards and the free grid fits twelve.

Cards owns its scrolling area so the live preview remains visible on the right
while the card controls scroll on the left, including on compact TVs. The preview
retains its full height and uses up to 320 dp of width. Adjust opens one
card's Move and Resize controls and highlights that card in the preview.
Show/Hide actions stay available in each row. Movement uses a directional pad;
unavailable positions and sizes are disabled, including overlaps. Grid dimensions
are omitted from the controls. Reordering keeps the same card selected.

The Layout tab reads saved companion designs through
`appearanceStudio?designs=1`. TV sessions receive saved designs only. Drafts,
history, and library mutations remain restricted to the owner. Selecting a
saved design applies its full appearance through the existing shared settings
sync. Selecting a built-in preset hides extra widgets while retaining them in
the Cards list. A saved legacy design explicitly clears the widget layout.

Run pure regressions with `npm --prefix HomeScreen test`. For browser checks,
start the fixture from HomeScreen:

```powershell
node ../server/pairing-web/node_modules/vite/bin/vite.js --config test/settings.vite.config.mjs
```

Then run `npm --prefix HomeScreen run test:settings`. Playwright must be
resolvable; `NODE_PATH` can point to bundled runtime packages. Set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using an installed Chrome binary. Set
`TV_SETTINGS_SCREENSHOTS=1` to capture previews in `artifacts`.

The fixture uses the real appearance provider and settings components with
mocked authentication, APIs, and local storage. It checks compact and full
widths, keyboard activation, widget persistence, saved and preset layouts,
and retry after a library failure. It also checks preview visibility while
scrolling, compact screen heights, and selection while reordering and hiding.
Native TV focus still needs a device check.

Ambient settings show a live backdrop thumbnail using the same renderer as
ambient mode. Browser checks cover photo and dark selections, all plasma
presets, individual color updates, thumbnail sizing, narrow panel wrapping,
and the full preview action. Plasma gradients use separate IDs when both
previews are mounted. The fixture supplies React Native's global alias for
web animation cleanup.

Release these changes by deploying the updated `appearanceStudio` and
`pollFeed` functions and rebuilding/installing the TV app. No companion UI
change is required to expose its saved designs.
