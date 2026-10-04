// Pure layout contract shared by the API, TV and companion editor.
// Kept inside the Functions source tree so Firebase deploys it with the API.
export const DASHBOARD_CARD_IDS = ["weather", "schedule", "activity", "media", "meal", "todo"] as const;
export type DashboardCardId = typeof DASHBOARD_CARD_IDS[number];
export interface GridItem {
  id: DashboardCardId;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface DashboardGridLayout {
  version: 1;
  columns: 12;
  rows: 6;
  items: GridItem[];
}
interface LayoutCard {id: DashboardCardId; visible: boolean; size: "standard" | "wide"}

export function overlaps(a: GridItem, b: GridItem): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Reject unknown versions, invalid geometry and a mismatch with visible cards. */
export function validGrid(value: unknown, cards: readonly {id: string; visible: boolean}[]): value is DashboardGridLayout {
  if (!value || typeof value !== "object") return false;
  const grid = value as DashboardGridLayout;
  if (grid.version !== 1 || grid.columns !== 12 || grid.rows !== 6 || !Array.isArray(grid.items)) return false;
  const visible = cards.filter((card) => card.visible).map((card) => card.id);
  if (!visible.length || grid.items.length !== visible.length || grid.items.length > DASHBOARD_CARD_IDS.length) return false;
  const seen = new Set<string>();
  for (const item of grid.items) {
    if (!item || !visible.includes(item.id) || !DASHBOARD_CARD_IDS.includes(item.id) || seen.has(item.id) ||
      ![item.x, item.y, item.width, item.height].every(Number.isInteger) ||
      item.x < 0 || item.y < 0 || item.width < 3 || item.height < 2 ||
      item.x + item.width > 12 || item.y + item.height > 6) return false;
    seen.add(item.id);
  }
  return grid.items.every((item, index) => !grid.items.slice(index + 1).some((other) => overlaps(item, other)));
}

/** Turn the legacy card order/widths into a valid starting canvas. */
export function gridFromCards(cards: readonly LayoutCard[]): DashboardGridLayout {
  const visible = cards.filter((card) => card.visible);
  const split = Math.ceil(visible.length / 2);
  const groups = [visible.slice(0, split), visible.slice(split)].filter((row) => row.length);
  const items: GridItem[] = [];
  groups.forEach((row, rowIndex) => {
    const weight = row.reduce((sum, card) => sum + (card.size === "wide" ? 2 : 1), 0);
    let x = 0;
    let consumed = 0;
    row.forEach((card, index) => {
      consumed += card.size === "wide" ? 2 : 1;
      const remaining = row.length - index - 1;
      const end = Math.min(12 - remaining * 3, Math.max(x + 3, Math.round(12 * consumed / weight)));
      items.push({id: card.id, x, y: rowIndex * 3, width: end - x, height: groups.length === 1 ? 6 : 3});
      x = end;
    });
  });
  return {version: 1, columns: 12, rows: 6, items};
}

/** Add a hidden card without disturbing the owner's existing positions. */
export function findGridSpace(grid: DashboardGridLayout, id: DashboardCardId): GridItem | null {
  for (let y = 0; y <= 4; y++) {
    for (let x = 0; x <= 9; x++) {
      const item = {id, x, y, width: 3, height: 2};
      if (!grid.items.some((other) => overlaps(item, other))) return item;
    }
  }
  return null;
}

/** Identical cell/gap geometry in the TV renderer and browser canvas. */
export function gridRect(item: GridItem, width: number, height: number, gap: number) {
  const cellWidth = Math.max(0, (width - 11 * gap) / 12);
  const cellHeight = Math.max(0, (height - 5 * gap) / 6);
  return {
    left: item.x * (cellWidth + gap), top: item.y * (cellHeight + gap),
    width: item.width * cellWidth + (item.width - 1) * gap,
    height: item.height * cellHeight + (item.height - 1) * gap,
  };
}
