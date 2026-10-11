/** Fit readable headlines into any supported card size without overflowing. */
export function feedCardLayout(width: number, height: number, scale: number, requested: number) {
  const fontSize = 15 * scale; const lineHeight = 19 * scale;
  const headerHeight = 18 * scale; const gap = 8 * scale;
  const footerHeight = height > 100 * scale ? 16 * scale : 0;
  const available = Math.max(0, height - headerHeight - gap - footerHeight);
  const lines = Math.max(1, Math.min(width < 280 * scale ? 3 : 2, Math.floor((available - 14 * scale - gap) / lineHeight)));
  const rowHeight = lineHeight * lines + 14 * scale + gap;
  const rows = Math.max(0, Math.min(requested, Math.floor(available / rowHeight)));
  return {fontSize, lineHeight, headerHeight, gap, footerHeight, lines, rowHeight, rows};
}
