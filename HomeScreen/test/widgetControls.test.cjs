const {test} = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadPureModule.cjs');
const {editableWidgetLayout, changeWidget, addDashboardWidget, widgetLabel} = load('src/components/settings/appearance/widgetControls.ts');
const {DEFAULT_APPEARANCE, normalizeAppearance} = load('src/theme/appearance.ts');
const {validWidgetLayout, widgetGridFromRows, legacyWidgetProjection} = load('../server/functions/src/utils/widgets.ts');
const poll = {id: `poll_${'a'.repeat(32)}`, kind: 'poll', roundId: 'b'.repeat(32), visible: true, size: 'standard', accent: '#FF0000', presentation: 'join'};
const person = {id: `activity_${'c'.repeat(32)}`, kind: 'activity', personId: 'c'.repeat(32), visible: true, size: 'wide'};
const feed = {id: `feed_${'f'.repeat(32)}`, kind: 'feed', feed: {url: 'https://feeds.bbci.co.uk/news/world/rss.xml', title: 'World', itemCount: 5}, visible: true, size: 'standard'};

test('poll removal clears its grid footprint and allows adding the same round again', () => {
  const layout = {version: 1, widgets: [poll, person], grid: widgetGridFromRows([poll, person])};
  const removed = changeWidget(layout, poll.id, {type: 'remove'});
  assert.deepEqual(removed.widgets, [person]);
  assert.equal(removed.grid.items.some((item) => item.id === poll.id), false);
  assert.ok(validWidgetLayout(addDashboardWidget(removed, poll)));
  assert.deepEqual(layout.widgets[0], poll);
  assert.throws(() => changeWidget({version: 1, widgets: [poll], grid: null}, poll.id, {type: 'remove'}), /one card shown/);
});

test('row movement skips hidden cards and changes the visible order', () => {
  const hidden = {...feed, visible: false};
  const layout = {version: 1, widgets: [poll, hidden, person], grid: null};
  assert.deepEqual(changeWidget(layout, poll.id, {type: 'order', direction: 1}).widgets.filter((item) => item.visible), [person, poll]);
  assert.deepEqual(changeWidget(layout, person.id, {type: 'order', direction: -1}).widgets.filter((item) => item.visible), [person, poll]);
});

test('feed instances can be added, hidden, resized, moved and removed independently', () => {
  let layout = {version: 1, grid: null, widgets: [feed]};
  const second = {...feed, id: `feed_${'e'.repeat(32)}`};
  layout = addDashboardWidget(layout, second); assert.equal(layout.widgets.length, 2);
  layout = changeWidget(layout, feed.id, {type: 'size'}); assert.equal(layout.widgets[0].size, 'wide'); assert.equal(layout.widgets[1].size, 'standard');
  assert.equal(widgetLabel(feed), 'Feed · World');
  layout = {...layout, grid: widgetGridFromRows(layout.widgets)};
  layout = changeWidget(layout, feed.id, {type: 'visibility'}); assert.equal(layout.grid.items.length, 1);
  layout = changeWidget(layout, feed.id, {type: 'remove'}); assert.equal(layout.widgets.length, 1); assert.equal(layout.widgets[0].id, second.id);
  assert.throws(() => changeWidget(layout, second.id, {type: 'remove'}), /at least one/);
  assert.equal(normalizeAppearance({...DEFAULT_APPEARANCE, widgetLayout: layout}).widgetLayout.widgets[0].feed.url, second.feed.url);
});

test('settings list every widget instance and missing built-ins without exposing the legacy fallback as visible', () => {
  const widgetLayout = {version: 1, grid: null, widgets: [poll, person]};
  const next = editableWidgetLayout({...DEFAULT_APPEARANCE, widgetLayout});
  assert.equal(next.widgets.length, 8);
  assert.deepEqual(next.widgets.filter((widget) => widget.visible), [poll, person]);
  assert.equal(widgetLabel(person, [{id: person.personId, name: 'Alex'}]), 'Activity · Alex');
  assert.equal(widgetLabel(poll, [], [{id: poll.roundId, question: 'Dinner?'}]), 'Poll · Dinner?');
});

test('row reorder, visibility and width controls preserve poll bindings, styles and other activity instances', () => {
  const layout = {version: 1, grid: null, widgets: [poll, person]};
  const moved = changeWidget(layout, person.id, {type: 'order', direction: -1});
  assert.deepEqual(moved.widgets, [person, poll]);
  const sized = changeWidget(moved, poll.id, {type: 'size'});
  assert.deepEqual(sized.widgets[1], {...poll, size: 'wide'});
  const hidden = changeWidget(sized, poll.id, {type: 'visibility'});
  assert.equal(hidden.widgets[1].visible, false);
  assert.throws(() => changeWidget(hidden, person.id, {type: 'visibility'}), /one card shown/);
  assert.deepEqual(layout.widgets, [poll, person]);
});

test('free-layout hide/show finds empty space and swaps exchange complete footprints even on a full canvas', () => {
  const widgets = [poll, person];
  const grid = widgetGridFromRows(widgets);
  const layout = {version: 1, widgets, grid};
  const swapped = changeWidget(layout, poll.id, {type: 'swap', direction: 1});
  assert.ok(validWidgetLayout(swapped));
  assert.deepEqual(swapped.grid.items[0], {...grid.items[1], id: poll.id});
  assert.deepEqual(swapped.grid.items[1], {...grid.items[0], id: person.id});
  const hidden = changeWidget(layout, person.id, {type: 'visibility'});
  assert.equal(hidden.grid.items.length, 1);
  assert.ok(validWidgetLayout(changeWidget(hidden, person.id, {type: 'visibility'})));
  assert.throws(() => addDashboardWidget(layout, {...poll, id: `poll_${'d'.repeat(32)}`}), /No room/);
});

test('free-layout placement and resizing reject overlaps and bounds and retain valid moves', () => {
  const layout = {version: 1, widgets: [poll, person], grid: {version: 1, columns: 12, rows: 6,
    items: [{id: poll.id, x: 0, y: 0, width: 3, height: 2}, {id: person.id, x: 4, y: 0, width: 3, height: 2}]}};
  const moved = changeWidget(layout, poll.id, {type: 'geometry', field: 'x', amount: 1});
  assert.ok(validWidgetLayout(moved));
  assert.throws(() => changeWidget(moved, poll.id, {type: 'geometry', field: 'x', amount: 1}), /overlap/);
  assert.throws(() => changeWidget(layout, poll.id, {type: 'geometry', field: 'width', amount: -1}), /outside/);
  assert.ok(validWidgetLayout(changeWidget(layout, person.id, {type: 'geometry', field: 'height', amount: 1})));
});

test('add controls enforce row limits and keep unique bindings after hide/show', () => {
  const layout = editableWidgetLayout(DEFAULT_APPEARANCE);
  const next = addDashboardWidget(addDashboardWidget(layout, poll), person);
  assert.ok(validWidgetLayout(next));
  assert.throws(() => addDashboardWidget(next, {...poll, id: `poll_${'d'.repeat(32)}`}), /eight cards/);
  assert.deepEqual(addDashboardWidget(next, poll), next);
  assert.equal(next.widgets.find((widget) => widget.id === person.id).personId, person.personId);
});

test('saved-layout normalization preserves widgets, geometry and background zoom with a compatible legacy projection', () => {
  const widgetLayout = {version: 1, widgets: [poll, person], grid: widgetGridFromRows([poll, person])};
  const saved = {...DEFAULT_APPEARANCE, layout: 'custom', widgetLayout, ...legacyWidgetProjection(widgetLayout), backgroundZoom: 1.5};
  const normalized = normalizeAppearance(saved);
  assert.deepEqual(normalized.widgetLayout, widgetLayout);
  assert.deepEqual(normalized.cards, saved.cards);
  assert.equal(normalized.backgroundZoom, 1.5);
});
