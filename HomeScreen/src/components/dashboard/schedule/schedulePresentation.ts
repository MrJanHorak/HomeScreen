import type { CalendarEvent } from '../../../../../shared/src/types';
import { zonedDateKey } from '../../../../../server/functions/src/utils/zonedTime';

export type ScheduleEventState = 'in-progress' | 'upcoming' | 'ended' | 'all-day' | 'unknown';

export function scheduleEventState(event: CalendarEvent, now: number): ScheduleEventState {
  if (!Number.isFinite(now) || !Number.isFinite(event.startMs) || !Number.isFinite(event.endMs) || event.endMs! <= event.startMs!) return 'unknown';
  if (now >= event.endMs!) return 'ended';
  if (now < event.startMs!) return 'upcoming';
  return event.allDay ? 'all-day' : 'in-progress';
}

function calendarDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

/** Calendar date strings are already in the feed's zone; UTC formatting keeps their day intact. */
export function scheduleDate(value?: string, compact = false): string {
  const date = calendarDate(value);
  if (!date) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric',
    ...(compact ? {} : { weekday: 'short' as const }) }).format(date);
}

export function scheduleTime(event: CalendarEvent): string {
  const start = event.time?.trim();
  if (!start) return 'Time unavailable';
  return /^all[ -]?day$/i.test(start) ? 'All day' : start;
}

export function scheduleEnd(event: CalendarEvent): string {
  const end = event.endTime?.trim();
  if (!end || /^all[ -]?day$/i.test(event.time) || end.toLowerCase() === event.time?.trim().toLowerCase()) return '';
  return end.toLowerCase() === 'continues' ? 'Continues' : `Until ${end}`;
}

export function scheduleDetail(event: CalendarEvent): string {
  return [scheduleEnd(event), event.category?.trim()].filter(Boolean).join(' · ');
}

export function scheduleLabel(event: CalendarEvent, today: boolean, now?: number): string {
  return [today ? 'Today' : scheduleDate(event.date), scheduleTime(event), event.title || 'Untitled event',
    now !== undefined && scheduleEventState(event, now) === 'in-progress' ? 'Happening now' : '',
    scheduleEnd(event), event.category].filter(Boolean).join(', ');
}

/** Order known occurrences by live status/time; preserve source order for legacy data. */
export function schedulePreview(schedule: CalendarEvent[], upcoming: CalendarEvent[], now = Date.now()) {
  const seen = new Set<string>();
  const unique = (events: CalendarEvent[]) => events.filter(event => {
    const key = `${event.id}|${event.date || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const calendarDays = new Map<string, string | null>();
  const today: CalendarEvent[] = [];
  const coming: CalendarEvent[] = [];
  const originalToday = new Set(schedule.map(event => `${event.id}|${event.date || ''}`));
  for (const event of unique([...schedule, ...upcoming])) {
    const state = scheduleEventState(event, now);
    if (state === 'ended') continue;
    let isToday = originalToday.has(`${event.id}|${event.date || ''}`);
    if (state !== 'unknown' && event.timeZone && calendarDate(event.date)) {
      if (!calendarDays.has(event.timeZone)) {
        try { calendarDays.set(event.timeZone, zonedDateKey(new Date(now), event.timeZone)); }
        catch { calendarDays.set(event.timeZone, null); }
      }
      const day = calendarDays.get(event.timeZone);
      if (day) isToday = event.date === day;
    }
    (isToday ? today : coming).push(event);
  }
  const rank = (event: CalendarEvent) => ({'in-progress': 0, upcoming: 1, 'all-day': 2, unknown: 3, ended: 4})[scheduleEventState(event, now)];
  today.sort((a, b) => rank(a) - rank(b) || (rank(a) < 2 ? a.startMs! - b.startMs! : 0));
  const future = coming.map((event, index) => ({event, index})).sort((a, b) => {
    const left = calendarDate(a.event.date) ? a.event.date! : '9999-99-99';
    const right = calendarDate(b.event.date) ? b.event.date! : '9999-99-99';
    return left.localeCompare(right) || (Number.isFinite(a.event.startMs) && Number.isFinite(b.event.startMs) ? a.event.startMs! - b.event.startMs! : 0) || a.index - b.index;
  }).map(item => item.event);
  const first = today[0] || future[0];
  return { first, firstIsToday: today.length > 0, todayCount: today.length,
    today: today.slice(1), upcoming: today.length ? future : future.slice(1) };
}
