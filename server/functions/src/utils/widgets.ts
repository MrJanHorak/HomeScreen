import {DASHBOARD_CARD_IDS, overlaps} from "./dashboardLayout";
import type {DashboardCardId, DashboardGridLayout, GridItem} from "./dashboardLayout";
import {validCardStyles} from "./cardStyle";
import type {CardStyle, CardStyles} from "./cardStyle";

export interface Widget {
  id: string;
  kind: DashboardCardId | "poll";
  roundId?: string;
  visible: boolean;
  size: "standard" | "wide";
  style?: CardStyle;
  accent?: string;
  presentation?: "auto" | "results" | "join";
}
export interface WidgetGrid {
  version: 1;
  columns: 12;
  rows: 6;
  items: (Omit<GridItem, "id"> & {id: string})[];
}
export interface WidgetLayout {version: 1; widgets: Widget[]; grid: WidgetGrid | null}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const validPollId = (id: unknown): id is string => typeof id === "string" && /^[a-f0-9]{32}$/.test(id);
export function validWidgetGrid(value: unknown, widgets: readonly {id: string; visible: boolean}[]): value is WidgetGrid {
  if (!record(value) || value.version !== 1 || value.columns !== 12 || value.rows !== 6 || !Array.isArray(value.items)) return false;
  const visible = widgets.filter((w) => w.visible).map((w) => w.id);
  if (!visible.length || value.items.length !== visible.length || visible.length > 12) return false;
  const seen = new Set<string>();
  for (const i of value.items) {
    if (!record(i) || typeof i.id !== "string" || seen.has(i.id) || !visible.includes(i.id) ||
      ![i.x, i.y, i.width, i.height].every(Number.isInteger) ||
      Number(i.x) < 0 || Number(i.y) < 0 || Number(i.width) < 3 || Number(i.height) < 2 ||
      Number(i.x) + Number(i.width) > 12 || Number(i.y) + Number(i.height) > 6) return false;
    seen.add(i.id);
  }
  const items = value.items as GridItem[];
  return items.every((item, index) => !items.slice(index + 1).some((other) => overlaps(item, other)));
}
export function validWidgetLayout(value: unknown): value is WidgetLayout {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.widgets) || value.widgets.length > 24) return false;
  const seen = new Set<string>();
  for (const w of value.widgets) {
    if (!record(w) || typeof w.id !== "string" || seen.has(w.id) ||
      Object.keys(w).some((k) => !["id", "kind", "roundId", "visible", "size", "style", "accent", "presentation"].includes(k)) ||
      typeof w.visible !== "boolean" || !["standard", "wide"].includes(String(w.size)) ||
      (w.kind === "poll" ? !/^poll_[a-f0-9]{32}$/.test(w.id) || !validPollId(w.roundId) :
        !DASHBOARD_CARD_IDS.includes(w.kind as DashboardCardId) || w.id !== w.kind || w.roundId !== undefined) ||
      (w.style !== undefined && !validCardStyles({weather: w.style})) ||
      (w.accent !== undefined && (typeof w.accent !== "string" || !/^#[0-9a-fA-F]{6}$/.test(w.accent))) ||
      (w.presentation !== undefined && !["auto", "results", "join"].includes(String(w.presentation)))) return false;
    seen.add(w.id);
  }
  const visible = value.widgets.filter((w: Widget) => w.visible);
  return visible.length > 0 && (value.grid === null ? visible.length <= 8 : validWidgetGrid(value.grid, value.widgets));
}
export function widgetsFromLegacy(cards: {id: DashboardCardId; visible: boolean; size: "standard" | "wide"}[], grid: DashboardGridLayout | null, styles: CardStyles = {}): WidgetLayout {
  return {version: 1, widgets: cards.map((c) => ({...c, kind: c.id, ...(styles[c.id] ? {style: styles[c.id]} : {})})), grid};
}
/** At most four minimum-width widgets per row, regardless of width weights. */
export function widgetRows(widgets: Widget[]): Widget[][] {
  const visible = widgets.filter((w) => w.visible);
  const split = Math.ceil(visible.length / 2);
  return [visible.slice(0, split), visible.slice(split)].filter((r) => r.length);
}
export function widgetGridFromRows(widgets: Widget[]): WidgetGrid {
  const visible = widgets.filter((w) => w.visible);
  const groups = visible.length <= 8 ? widgetRows(widgets) : [visible.slice(0, 4), visible.slice(4, 8), visible.slice(8)];
  const height = groups.length === 1 ? 6 : groups.length === 2 ? 3 : 2;
  return {version: 1, columns: 12, rows: 6, items: groups.flatMap((row, y) => {
    let x = 0; const widths = widgetRowWidths(row);
    return row.map((w, index) => {
      const width = widths[index];
      const item = {id: w.id, x, y: y * height, width, height}; x += width; return item;
    });
  })};
}
export function widgetRowWidths(row: Widget[]): number[] {
  const total = row.reduce((sum, w) => sum + (w.size === "wide" ? 2 : 1), 0);
  let x = 0; let used = 0;
  return row.map((w, index) => {
    used += w.size === "wide" ? 2 : 1;
    const end = Math.min(12 - (row.length - index - 1) * 3, Math.max(x + 3, Math.round(12 * used / total)));
    const width = end - x; x = end; return width;
  });
}
export function freeWidgetSpace(grid: WidgetGrid, id: string) {
  for (let y = 0; y <= 4; y++) {
    for (let x = 0; x <= 9; x++) {
      const item = {id, x, y, width: 3, height: 2};
      if (!grid.items.some((other) => overlaps(item as GridItem, other as GridItem))) return item;
    }
  }
  return null;
}
/** Old TVs receive only known card IDs. Poll-only dashboards retain a usable fallback. */
export function legacyWidgetProjection(layout: WidgetLayout) {
  const cards = DASHBOARD_CARD_IDS.map((id) => {
    const w = layout.widgets.find((i) => i.kind === id);
    return {id, visible: w?.visible ?? false, size: w?.size ?? "standard" as "standard" | "wide"};
  });
  if (!cards.some((c) => c.visible)) cards[0].visible = true;
  const cardStyles: CardStyles = {};
  for (const w of layout.widgets) if (w.kind !== "poll" && w.style) cardStyles[w.kind] = w.style;
  const items = layout.grid?.items.filter((i) => DASHBOARD_CARD_IDS.includes(i.id as DashboardCardId)) ?? [];
  const grid = layout.grid && items.length === cards.filter((c) => c.visible).length ? {...layout.grid, items} as DashboardGridLayout : null;
  return {cards, cardStyles, grid};
}
