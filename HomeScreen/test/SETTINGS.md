# TV settings regression checks

Card controls read widget instances from the active layout. Missing built-in
cards appear as hidden options; shared activity and polls retain their own IDs,
bindings, and styles. Free layouts allow swapping complete footprints, moving
into empty space, and resizing without overlaps. Automatic rows fit eight
visible cards and the free grid fits twelve.

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
and retry after a library failure. Native TV focus still needs a device check.

Release these changes by deploying the updated `appearanceStudio` and
`pollFeed` functions and rebuilding/installing the TV app. No companion UI
change is required to expose its saved designs.
