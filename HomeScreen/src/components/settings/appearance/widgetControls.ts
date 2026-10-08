import {CARD_IDS, CARD_LABELS} from '../../../theme/appearance';
import type {DashboardAppearance} from '../../../theme/appearance';
import {freeWidgetSpace, validWidgetLayout, widgetsFromLegacy} from '../../../../../server/functions/src/utils/widgets';
import type {Widget, WidgetLayout} from '../../../../../server/functions/src/utils/widgets';

/** Include missing built-in widgets as hidden options; instance IDs stay independent. */
export function editableWidgetLayout(appearance: DashboardAppearance): WidgetLayout {
  const layout = appearance.widgetLayout || widgetsFromLegacy(appearance.cards, appearance.grid, appearance.cardStyles);
  const missing: Widget[] = CARD_IDS.filter((id) => !layout.widgets.some((widget) => widget.id === id))
    .map((id) => ({id, kind: id, visible: false, size: 'standard'}));
  return {...layout, widgets: [...layout.widgets, ...missing]};
}

export function widgetLabel(widget: Widget, people: {id: string; name: string}[] = [], polls: {id: string; question: string}[] = []): string {
  if (widget.kind === 'poll') return `Poll · ${polls.find((poll) => poll.id === widget.roundId)?.question || 'Saved poll'}`;
  if (widget.personId) return `Activity · ${people.find((person) => person.id === widget.personId)?.name || 'Shared person'}`;
  return CARD_LABELS[widget.kind] || widget.kind;
}

export type WidgetAction = {type: 'order' | 'swap'; direction: -1 | 1} | {type: 'visibility'} | {type: 'size'} |
  {type: 'geometry'; field: 'x' | 'y' | 'width' | 'height'; amount: -1 | 1};

export function changeWidget(layout: WidgetLayout, id: string, action: WidgetAction): WidgetLayout {
  const index = layout.widgets.findIndex((widget) => widget.id === id);
  if (index < 0) return layout;
  const widget = layout.widgets[index];
  let widgets = [...layout.widgets];
  let grid = layout.grid;
  if (action.type === 'swap' && grid) {
    const positions = [...grid.items].sort((a, b) => a.y - b.y || a.x - b.x);
    const position = positions.findIndex((item) => item.id === id);
    const other = positions[position + action.direction];
    const selected = positions[position];
    if (!selected || !other) return layout;
    grid = {...grid, items: grid.items.map((item) => item.id === id ? {...other, id} : item.id === other.id ? {...selected, id: other.id} : item)};
  } else if (action.type === 'order') {
    const next = index + action.direction;
    if (next < 0 || next >= widgets.length) return layout;
    [widgets[index], widgets[next]] = [widgets[next], widgets[index]];
  } else if (action.type === 'visibility') {
    if (grid) {
      if (widget.visible) grid = {...grid, items: grid.items.filter((item) => item.id !== id)};
      else {
        const space = freeWidgetSpace(grid, id);
        if (!space) throw new Error('No room for this card. Shrink or hide a card first.');
        grid = {...grid, items: [...grid.items, space]};
      }
    }
    widgets[index] = {...widget, visible: !widget.visible};
  } else if (action.type === 'size') {
    widgets[index] = {...widget, size: widget.size === 'wide' ? 'standard' : 'wide'};
  } else if (action.type === 'geometry' && grid) {
    grid = {...grid, items: grid.items.map((item) => item.id === id ? {...item, [action.field]: item[action.field] + action.amount} : item)};
  }
  const next = {...layout, widgets, grid};
  if (!validWidgetLayout(next)) throw new Error(action.type === 'geometry'
    ? 'That position or size would overlap another card or go outside the dashboard.'
    : 'Keep at least one card shown. Automatic rows fit eight cards; free layouts fit up to twelve.');
  return next;
}

export function addDashboardWidget(layout: WidgetLayout, widget: Widget): WidgetLayout {
  if (layout.widgets.some((item) => item.id === widget.id)) return layout;
  const hidden = {...layout, widgets: [...layout.widgets, {...widget, visible: false}]};
  return changeWidget(hidden, widget.id, {type: 'visibility'});
}
