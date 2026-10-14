import {cardTypography} from '../shared/cardContentLayout';

/** Keep short-card artwork within the featured body and preserve a readable text column. */
export function mediaArtworkLayout(width: number, height: number, scale: number) {
  const gap = cardTypography(height, scale).gap;
  const bodyHeight = height - 18 * scale - gap;
  const artHeight = width >= 180 * scale && bodyHeight >= 40 * scale
    ? Math.min(120 * scale, Math.max(48 * scale, height * 0.42), bodyHeight,
      (width - 120 * scale - gap) / 0.7) : 0;
  return {artHeight, artWidth:artHeight * 0.7};
}

/** Short, wide cards preview a few titles beside the featured program. */
export function mediaQueueLayout(width: number, height: number, scale: number, itemCount: number, needsTitles = false) {
  const gap = 16 * scale;
  const featuredWidth = Math.min(280 * scale, width * 0.5);
  const queueWidth = width - featuredWidth - gap * 2 - 1;
  const {artHeight, artWidth} = mediaArtworkLayout(featuredWidth, height, scale);
  const minimumCell = artWidth + (needsTitles ? 82 * scale : 0);
  const count = width >= 360 * scale && height < 150 * scale && artHeight >= 48 * scale
    ? Math.min(3, Math.max(0, itemCount - 1), Math.floor((queueWidth + 12 * scale) / (minimumCell + 12 * scale)))
    : 0;
  const cellWidth = count ? (queueWidth - (count - 1) * 12 * scale) / count : 0;
  return {count, featuredWidth, queueWidth, gap, artHeight, artWidth,
    showTitles: cellWidth >= artWidth + 82 * scale};
}
