import type {CalendarEvent} from '../../../../../shared/src/types';
import {scheduleDate, scheduleDayEvents, scheduleTime} from '../../dashboard/schedule/schedulePresentation';

export interface AgendaDay {date?: string; events: CalendarEvent[]}

/** One chronological reading path. Unknown timing retains provider order. */
export function scheduleAgenda(schedule: CalendarEvent[], upcoming: CalendarEvent[], now: number) {
  const days = scheduleDayEvents(schedule, upcoming, now);
  const sort = (events: CalendarEvent[]) => [...events].sort((a, b) => {
    const allDay = (event: CalendarEvent) => scheduleTime(event) === 'All day';
    if (allDay(a) !== allDay(b)) return allDay(a) ? -1 : 1;
    const knownA = Number.isFinite(a.startMs), knownB = Number.isFinite(b.startMs);
    if (knownA !== knownB) return knownA ? -1 : 1;
    return knownA ? a.startMs! - b.startMs! : 0;
  });
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of days.upcoming) {
    const date = scheduleDate(event.date) === 'Date unavailable' ? '' : event.date!;
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(event);
  }
  const future: AgendaDay[] = [...grouped].sort(([a], [b]) => (a || '9999').localeCompare(b || '9999'))
    .map(([date, events]) => ({date: date || undefined, events: sort(events)}));
  return {today: sort(days.today), upcoming: future, upcomingCount: days.upcoming.length};
}
