import {textLines} from '../shared/cardContentLayout';

export function pollCardLayout(width: number, height: number, scale: number, question: string, hasJoin: boolean, variant = 'auto') {
  const w = width / scale; const h = height / scale;
  const family = h < 120 ? 'summary' : w >= 650 && h < 260 ? 'wide' : w >= 500 && h >= 260 ? 'join' : w < 500 && h >= 250 ? 'tall' : 'standard';
  const gap = 6;
  const titleSize = h < 200 ? 18 : h < 300 ? 22 : 28;
  const titleLimit = h < 120 ? 1 : h < 200 ? 2 : 3;
  const sideBySide = family === 'wide';
  const heroWidth = sideBySide ? w * .42 : w;
  const titleLines = textLines(question, heroWidth, titleSize, titleLimit);
  const hero = 18 + gap + titleLines * titleSize * 1.2 + gap + 15;
  const contentTop = sideBySide ? 18 + gap : hero + gap;
  const available = Math.max(0, h - contentTop);
  const qrSize = hasJoin && variant !== 'results' && family === 'join' && available >= 184 ? Math.min(220, available - 24) : 0;
  const rowWidth = sideBySide ? w - heroWidth - 20 : w - (qrSize ? qrSize + 20 : 0);
  const rowHeight = 44;
  const cap = family === 'summary' ? 0 : family === 'wide' ? 3 : family === 'standard' ? 2 : 4;
  const rows = Math.min(cap, Math.floor(Math.max(0, available - (qrSize ? 0 : 16)) / (rowHeight + gap)));
  return {family, titleSize: titleSize * scale, titleLimit, titleLines, gap: gap * scale, rowHeight: rowHeight * scale, rows,
    qrSize: qrSize * scale, rowWidth: rowWidth * scale, hero: hero * scale, heroWidth: heroWidth * scale, contentTop: contentTop * scale, sideBySide,
    footer: h - Math.max(hero, contentTop + rows * (rowHeight + gap)) >= 20 && !qrSize};
}
