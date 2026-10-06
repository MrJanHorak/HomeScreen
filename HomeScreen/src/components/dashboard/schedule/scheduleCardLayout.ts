import type { CalendarEvent } from '../../../../../shared/src/types';
import { textLines } from '../shared/cardContentLayout';
import { cardSectionLayout } from '../shared/cardSectionLayout';

export type ScheduleFamily = 'essential' | 'featured' | 'agenda' | 'tall' | 'wide' | 'large';

export function scheduleFamily(width: number, height: number): ScheduleFamily {
  if (width >= 550) return height >= 300 ? 'large' : 'wide';
  if (height < 110) return 'essential';
  if (height < 190) return 'featured';
  return height >= 300 ? 'tall' : 'agenda';
}

export function scheduleRowSizing(shallow: boolean, roomy: boolean) {
  return { titleSize: shallow ? 14 : roomy ? 16 : 14,
    titleLine: shallow ? 16 : roomy ? 20 : 18,
    titleLimit: shallow ? 1 : 2, detailSize: shallow ? 10 : 11,
    detailLine: shallow ? 12 : 14, detailGap: 3,
    leadingWidth: shallow ? 54 : 66, rowGap: 8 };
}

export function scheduleRowLines(title: string, width: number, size: ReturnType<typeof scheduleRowSizing>) {
  return textLines(title, Math.max(1, width - size.leadingWidth - 11), size.titleSize, size.titleLimit);
}

export interface SchedulePlan {
  family: ScheduleFamily; shallow: boolean; roomy: boolean; sideBySide: boolean; parallelGroups: boolean;
  heroWidth: number; agendaWidth: number; groupWidth: number; header: number; gap: number;
  titleSize: number; titleLine: number; titleLines: number; timeSize: number; timeLine: number;
  detail: boolean; emptyIcon: number; row: ReturnType<typeof scheduleRowSizing>;
  todayCount: number; upcomingCount: number; footer: boolean; used: number;
}

export function planScheduleCard(input: {
  width: number; height: number; scale: number; title: string; hasEvent: boolean; hasDetail: boolean;
  today: CalendarEvent[]; upcoming: CalendarEvent[];
}, emphasize = true): SchedulePlan {
  const { width, height, scale, title, hasEvent, hasDetail, today, upcoming } = input;
  const w = width / scale;
  const h = height / scale;
  const family = scheduleFamily(w, h);
  const shallow = h < 110;
  const following = today.length + upcoming.length > 0;
  const sideBySide = w >= 550 && following;
  const heroWidth = sideBySide ? Math.min(360, w * 0.42) : w;
  const agendaWidth = sideBySide ? w - heroWidth - 16 : w;
  const parallelGroups = sideBySide && today.length > 0 && upcoming.length > 0 && agendaWidth >= 440;
  const groupWidth = parallelGroups ? (agendaWidth - 16) / 2 : agendaWidth;
  const roomy = emphasize && h >= (sideBySide ? 400 : 480);
  const header = shallow ? 16 : 18;
  const gap = shallow ? 4 : 6;
  const titleSize = shallow ? 18 : roomy ? 28 : emphasize && h >= 220 ? 22 : 20;
  const titleLine = shallow ? 22 : roomy ? 34 : emphasize && h >= 220 ? 26 : 24;
  const titleLines = textLines(title, heroWidth, titleSize, shallow ? 1 : 2);
  const timeSize = shallow ? 18 : roomy ? 36 : emphasize && h >= 220 ? 28 : 22;
  const timeLine = shallow ? 22 : roomy ? 42 : emphasize && h >= 220 ? 34 : 26;
  const detail = emphasize && hasDetail && !shallow && (h >= 220 || !following && h >= 130);
  const emptyIcon = !hasEvent && h >= 150 ? Math.min(72, h >= 300 ? 72 : 48) : 0;
  const hero = hasEvent
    ? timeLine + 4 + titleLines * titleLine + (detail ? 20 : 0)
    : titleLines * titleLine + (h >= 110 ? 20 : 0) + (emptyIcon ? emptyIcon + 8 : 0);
  const intro = header + gap + hero;
  const row = scheduleRowSizing(shallow, roomy);
  const section = cardSectionLayout(shallow).height;
  const sectionGap = 8;
  const canPreview = sideBySide || ['agenda', 'tall'].includes(family);
  const available = sideBySide ? h - header - gap : h - intro - sectionGap;
  const counts = {today: 0, upcoming: 0};
  const usedGroups = {today: 0, upcoming: 0};
  // Balanced prefix: one from each group before adding a second. Never swap a visible event for a later one.
  const candidates: Array<'today' | 'upcoming'> = [];
  for (let i = 0; i < 4; i++) {
    if (i < today.length) candidates.push('today');
    if (i < upcoming.length) candidates.push('upcoming');
  }
  const previewCap = shallow || h < 190 ? 1 : h < 300 ? 2 : 4;
  if (canPreview) for (const group of candidates.slice(0, previewCap)) {
    const event = (group === 'today' ? today : upcoming)[counts[group]];
    const lines = scheduleRowLines(event.title || 'Untitled event', groupWidth, row);
    const rowHeight = lines * row.titleLine + row.detailGap + row.detailLine;
    const cost = rowHeight + (counts[group] ? row.rowGap : section);
    const next = {...usedGroups, [group]: usedGroups[group] + cost};
    const total = parallelGroups ? Math.max(next.today, next.upcoming)
      : next.today + next.upcoming + (next.today && next.upcoming ? sectionGap : 0);
    if (total > available) break;
    usedGroups[group] += cost;
    counts[group]++;
  }
  const agendaHeight = parallelGroups ? Math.max(usedGroups.today, usedGroups.upcoming)
    : usedGroups.today + usedGroups.upcoming + (counts.today && counts.upcoming ? sectionGap : 0);
  const used = sideBySide ? header + gap + Math.max(hero, agendaHeight)
    : intro + (agendaHeight ? sectionGap + agendaHeight : 0);
  const plan = {family, shallow, roomy, sideBySide, parallelGroups, heroWidth: heroWidth * scale,
    agendaWidth: agendaWidth * scale, groupWidth: groupWidth * scale, header: header * scale, gap: gap * scale,
    titleSize: titleSize * scale, titleLine: titleLine * scale, titleLines,
    timeSize: timeSize * scale, timeLine: timeLine * scale,
    detail, emptyIcon: emptyIcon * scale, row, todayCount: counts.today, upcomingCount: counts.upcoming,
    footer: h - used >= 22, used: used * scale};
  if (emphasize) {
    const readable = planScheduleCard(input, false);
    // Enlarge within a bounded preview, but never lose an earlier event or a visible group.
    if (readable.todayCount > counts.today || readable.upcomingCount > counts.upcoming) return readable;
  }
  return plan;
}
