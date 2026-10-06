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
