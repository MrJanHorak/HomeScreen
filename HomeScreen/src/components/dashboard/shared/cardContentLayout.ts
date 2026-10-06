import {cardSectionLayout} from './cardSectionLayout';

/** Content dimensions, not grid labels, define the breakpoints (all values in TV dp). */
export interface CardLine {
  title: string;
  detail?: string;
  compactDetail?: string;
  posterUri?: string | null;
  section?: string;
}
export type RowDensity = 'comfortable' | 'compact';
export type CardPresentation = 'standard' | 'meal' | 'media';
export function textLines(
  text: string,
  width: number,
  fontSize: number,
  limit: number,
): number {
  // Conservative word wrapping; live layout measurements refine this estimate.
  const capacity = Math.max(1, width / (fontSize * 0.56));
  let rows = 1;
  let used = 0;
  for (const word of text.split(/\s+/)) {
    const length = [...word].length;
    if (used && used + 1 + length > capacity) {
      rows++;
      used = 0;
    }
    rows += Math.max(0, Math.ceil(length / capacity) - 1);
    used =
      length > capacity ? length % capacity : used + (used ? 1 : 0) + length;
  }
  return Math.min(limit, rows);
}
export function cardTypography(height: number, scale: number) {
  const short = height / scale < 130;
  return {
    gap: (short ? 4 : 6) * scale,
    header: (short ? 18 : 24) * scale,
    titleSize:
      (height / scale < 110 ? 16 : height / scale < 200 ? 19 : 22) * scale,
    subtitleLine: 14 * scale,
    rowLine: 15 * scale,
    detailLine: 12 * scale,
  };
}
export function lineKey(
  line: CardLine,
  width: number,
  density: RowDensity,
  scale: number,
) {
  return JSON.stringify([
    width,
    density,
    scale,
    line.title,
    line.detail,
    line.compactDetail,
    line.posterUri !== undefined,
  ]);
}
function fitCardContent({
  width,
  height,
  scale,
  title,
  subtitle,
  lines,
  artWidth = 0,
  artHeight = 0,
  extraHeight = 0,
  measuredHero,
  measurements = {},
  presentation = 'standard',
}: {
  width: number;
  height: number;
  scale: number;
  title: string;
  subtitle?: string;
  lines: CardLine[];
  artWidth?: number;
  artHeight?: number;
  extraHeight?: number;
  measuredHero?: number;
  measurements?: Record<string, number>;
  presentation?: CardPresentation;
}, readable = false) {
  const type = cardTypography(height, scale);
  const preview = presentation !== 'standard';
  const sideBySide = preview && lines.length > 0 && width / scale >= 650 && height / scale >= 150;
  const heroWidth = sideBySide ? width * 0.44 : width;
  const sectionCompact = readable || height / scale < 220;
  if (preview) type.header = 18 * scale;
  if (preview && (sideBySide && height / scale >= 400 || !lines.length && height / scale >= 300 && width / scale >= 300))
    type.titleSize = 28 * scale;
  if (presentation === 'media' && width / scale < 300)
    type.titleSize = Math.min(type.titleSize, 19 * scale);
  if (readable && preview) type.titleSize = Math.min(type.titleSize, 19 * scale);
  const rowGap = (preview ? 10 : type.gap / scale) * scale;
  const rowSize = (preview ? 14 : 12) * scale;
  const rowLine = (preview ? 18 : 15) * scale;
  const detailSize = (preview ? 11 : 10) * scale;
  const detailLine = (preview ? 14 : 12) * scale;
  const posterHeight = (presentation === 'media' ? 64 : 38) * scale;
  const posterWidth = (presentation === 'media' ? 45 : 27) * scale;
  const maxEntries =
    presentation === 'meal'
      ? height / scale < 220
        ? 2
        : height / scale < 300
          ? 3
          : 4
      : presentation === 'media'
        ? 3
        : lines.length;
  const titleWidth = Math.max(1, heroWidth - (artWidth ? artWidth + type.gap : 0));
  const titleLimit =
    height / scale < 110
      ? 1
      : readable || height / scale < 220
        ? 2
        : presentation === 'media'
          ? 4
          : 3;
  const titleCount = textLines(title, titleWidth, type.titleSize, titleLimit);
  const subtitleCount = subtitle
    ? textLines(subtitle, titleWidth, 11 * scale, !readable && height / scale >= 220 ? 2 : 1)
    : 0;
  const hero =
    measuredHero ??
    type.header +
      type.gap +
      Math.max(
        titleCount * type.titleSize * 1.2 +
          (subtitle ? type.gap + subtitleCount * type.subtitleLine : 0) +
          (extraHeight ? type.gap + extraHeight : 0),
        artHeight,
      );
  const available = Math.max(0, height - (sideBySide ? type.header + type.gap : hero));
  const rowsWidth = sideBySide ? width - heroWidth - 16 * scale : width;
  const candidates = [];
  for (const columns of preview ? [1] : [1, 2, 3]) {
    const cellWidth = (rowsWidth - (columns - 1) * rowGap) / columns;
    if (columns > 1 && cellWidth < 185 * scale) continue;
    for (const density of preview
      ? (['comfortable'] as const)
      : (['comfortable', 'compact'] as const)) {
      let used = 0;
      let count = 0;
      for (let i = 0; i < Math.min(lines.length, maxEntries); i += columns) {
        const group = lines.slice(i, Math.min(i + columns, maxEntries));
        const rowHeight = Math.max(
          ...group.map(
            (line) =>
              measurements[lineKey(line, cellWidth, density, scale)] ??
              Math.max(
                line.posterUri !== undefined
                  ? density === 'compact'
                    ? 24 * scale
                    : posterHeight
                  : 0,
                density === 'compact'
                  ? type.rowLine
                  : textLines(
                      line.title,
                      cellWidth -
                        (line.posterUri !== undefined
                          ? posterWidth + 6 * scale
                          : 23 * scale),
                      rowSize,
                      2,
                    ) *
                      rowLine +
                      (line.detail ? detailLine + 2 * scale : 0),
              ),
          ),
        );
        const newSection = group[0]?.section && (i === 0 || group[0].section !== lines[i - 1]?.section);
        const before = (i === 0 && sideBySide ? 0 : rowGap)
          + (newSection ? cardSectionLayout(sectionCompact).height * scale : 0);
        if (used + before + rowHeight > available - 1) break;
        used += before + rowHeight;
        count += group.length;
      }
      candidates.push({ columns, cellWidth, density, count, used });
    }
  }
  candidates.sort(
    (a, b) =>
      b.count - a.count ||
      Number(b.density === 'comfortable') -
        Number(a.density === 'comfortable') ||
      a.columns - b.columns,
  );
  const rows = candidates[0];
  return {
    ...type,
    rowGap,
    rowSize,
    rowLine,
    detailSize,
    detailLine,
    posterHeight,
    posterWidth,
    ...rows,
    hero,
    heroWidth,
    sideBySide,
    sectionCompact,
    titleLimit,
    subtitleCount,
    footer: height - (sideBySide ? Math.max(hero, type.header + type.gap + rows.used) : hero + rows.used) >= 18 * scale + rowGap,
  };
}
/** Enlarge primary text/section chrome only when it preserves the readable preview. */
export function planCardContent(input: Parameters<typeof fitCardContent>[0]) {
  if (!input.presentation || input.presentation === 'standard') return fitCardContent(input);
  const estimate = {...input, measuredHero:undefined};
  const preferred = fitCardContent(estimate);
  const readable = fitCardContent(estimate, true);
  return fitCardContent(input, readable.count > preferred.count);
}
export function activityLayout(
  width: number,
  height: number,
  scale: number,
  hasWeekly: boolean,
) {
  const w = width / scale;
  const h = height / scale;
  if (hasWeekly && w >= 430 && h >= 160) return 'weekly-wide';
  if (hasWeekly && w >= 175 && h >= 250) return 'weekly-tall';
  if (w >= 175 && h >= 112) return 'ring';
  return 'metrics';
}
/** Preserve the weekly total before spending extra height on a chart. */
export function activitySummaryHeight(
  available: number,
  scale: number,
  hasWeekly: boolean,
) {
  if (!hasWeekly || available < 44 * scale) return 0;
  return available >= 62 * scale ? 62 * scale : 44 * scale;
}

/** Fits beside the total/average inside their existing 62 dp reservation. */
export function activityMiniChartWidth(width: number, scale: number, showAverage: boolean): number {
  return showAverage && width >= 220 * scale
    ? Math.min(140 * scale, Math.max(98 * scale, width * 0.36)) : 0;
}
