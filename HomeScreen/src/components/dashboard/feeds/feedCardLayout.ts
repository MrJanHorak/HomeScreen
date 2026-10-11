/** Prioritize the requested story count, then spend spare room on wrapping and excerpts. */
export function feedCardLayout(width: number, height: number, scale: number, requested: number, measured: number[] = []) {
  const fontSize = 15 * scale; const lineHeight = 19 * scale;
  const dense = height < 180 * scale;
  const headerHeight = 18 * scale; const gap = (dense ? 4 : 6) * scale; const footerHeight = 16 * scale;
  const columns = width >= 560 * scale ? 2 : 1;
  const columnWidth = (width - (columns - 1) * 18 * scale) / columns;
  const available = Math.max(0, height - headerHeight - gap - footerHeight - gap);
  const metadata = dense ? 0 : 14 * scale;
  const count = Math.max(0, Math.min(requested, columns * Math.floor((available + gap) / (lineHeight + metadata + gap))));
  const rowCount = Math.ceil(count / columns);
  const titleHeights = Array.from({length: rowCount}, (_, row) => Math.max(...Array.from({length: Math.min(columns, count - row * columns)}, (_, col) =>
    Math.max(lineHeight, Math.min(2 * lineHeight, measured[row * columns + col] || 2 * lineHeight)))));
  const wrappedHeight = titleHeights.reduce((sum, title) => sum + title + metadata, 0) + Math.max(0, rowCount - 1) * gap;
  const lines = wrappedHeight <= available ? 2 : 1;
  const heights = titleHeights.map((title) => (lines === 2 ? title : lineHeight) + metadata);
  const used = heights.reduce((sum, row) => sum + row, 0) + Math.max(0, rowCount - 1) * gap;
  const excerptLines = heights.map(() => 0);
  let spare = available - used;
  if (count === requested) for (let round = 0; round < 4; round++) for (let row = 0; row < rowCount; row++) {
    const cost = (17 + (excerptLines[row] ? 0 : 4)) * scale;
    if (spare >= cost) {excerptLines[row]++; spare -= cost;}
  }
  return {fontSize, lineHeight, headerHeight, gap, footerHeight, columns, columnWidth, count, lines, heights, excerptLines, dense};
}
