import type { CalendarEvent } from '../../../../../shared/src/types';
import { useDashboard } from '../../../context/DashboardContext';
import CardContent from '../shared/CardContent';
import type { CardDimensions } from '../shared/types';

function eventDetail(event: CalendarEvent): string {
  const hasEndTime = event.endTime && event.endTime !== event.time;
  const time = hasEndTime ? `${event.time} – ${event.endTime}` : event.time;
  return [event.date?.slice(5), time, event.category]
    .filter(Boolean)
    .join(' · ');
}

export default function ScheduleDashboardCard(dimensions: CardDimensions) {
  const { schedule, upcomingEvents } = useDashboard();
  const first = schedule[0] || upcomingEvents[0];
  const following = schedule.length
    ? [...schedule.slice(1), ...upcomingEvents]
    : upcomingEvents.slice(1);
  let badge = 'No events today';
  if (schedule.length) badge = `${schedule.length} today`;
  else if (first) badge = 'Next up';

  return (
    <CardContent
      {...dimensions}
      id='schedule'
      title={first?.title || 'No events planned'}
      subtitle={first ? eventDetail(first) : 'A little room in your day'}
      badge={badge}
      lines={following.map((event) => ({
        title: event.title,
        detail: eventDetail(event),
        compactDetail: [event.date?.slice(5), event.time]
          .filter(Boolean)
          .join(' · '),
      }))}
    />
  );
}
