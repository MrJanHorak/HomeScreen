import Text from '../../shared/ReadingText';
import { View } from 'react-native';
import type { CalendarEvent } from '../../../../../shared/src/types';
import { useTheme } from '../../../theme/ThemeContext';
import CardSection from '../shared/CardSection';
import CardTextBlock from '../shared/CardTextBlock';
import { scheduleDate, scheduleDetail, scheduleEventState, scheduleLabel, scheduleTime } from './schedulePresentation';
import { scheduleRowLines } from './scheduleCardLayout';
import type { planScheduleCard } from './scheduleCardLayout';

export default function ScheduleAgenda({ events, today, scale, plan, now }: {
  events: CalendarEvent[]; today: boolean; scale: number; plan: ReturnType<typeof planScheduleCard>; now: number;
}) {
  const theme = useTheme();
  const row = plan.row;
  return <CardSection title={today ? 'More today' : 'Coming up'} scale={scale}
    compact={plan.shallow} testID={today ? 'schedule-today' : 'schedule-upcoming'}>
    <View style={{gap: row.rowGap * scale}}>
      {events.map((event, index) => {
        const color = /^#[0-9a-f]{6}$/i.test(event.color) ? event.color : theme.colors.focusRing;
        const leading = today ? scheduleTime(event) : scheduleDate(event.date, true);
        const detail = today ? [scheduleEventState(event, now) === 'in-progress' ? 'Happening now' : '',
          scheduleDetail(event)].filter(Boolean).join(' · ') || 'Today'
          : [scheduleTime(event), event.category].filter(Boolean).join(' · ');
        return <View key={`${event.id}-${index}`} testID='schedule-event' accessible
          accessibilityLabel={scheduleLabel(event, today, now)} style={{flexDirection: 'row', alignItems: 'flex-start', gap: 8 * scale}}>
          <View style={{width: row.leadingWidth * scale, borderLeftWidth: 3 * scale, borderLeftColor: color, paddingLeft: 5 * scale}}>
            <Text numberOfLines={1} style={{color: theme.colors.textSecondary,
              fontSize: 11 * scale, lineHeight: row.detailLine * scale}}>{leading}</Text>
          </View>
          <CardTextBlock style={{flex: 1}} title={event.title || 'Untitled event'} detail={detail}
            titleTestID='schedule-event-title' titleLines={scheduleRowLines(event.title || 'Untitled event', plan.groupWidth / scale, row)}
            titleSize={row.titleSize * scale} titleLine={row.titleLine * scale}
            detailSize={row.detailSize * scale} detailLine={row.detailLine * scale} detailGap={row.detailGap * scale} />
        </View>;
      })}
    </View>
  </CardSection>;
}
