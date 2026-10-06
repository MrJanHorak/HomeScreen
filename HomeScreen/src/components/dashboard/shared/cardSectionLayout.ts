/** Normalized section chrome shared by rendering and domain content budgets. */
export function cardSectionLayout(compact = false) {
  const border = compact ? 0 : 1;
  const paddingTop = compact ? 0 : 6;
  const gap = compact ? 3 : 4;
  const titleLine = compact ? 12 : 14;
  return { border, paddingTop, gap, titleLine, titleSize: compact ? 10 : 11,
    height: border + paddingTop + titleLine + gap };
}
