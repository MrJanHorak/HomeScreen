import Text from '../../shared/ReadingText';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDashboard } from '../../../context/DashboardContext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import { useTheme } from '../../../theme/ThemeContext';
import useTVClock from '../../../hooks/useTVClock';
import CardHeader from '../shared/CardHeader';
import CardDetailsHint from '../shared/CardDetailsHint';
import CardTextBlock from '../shared/CardTextBlock';
import type { CardDimensions } from '../shared/types';
import { scheduleDate, scheduleDetail, scheduleEventState, scheduleLabel, schedulePreview, scheduleTime } from './schedulePresentation';
import { planScheduleCard } from './scheduleCardLayout';
import ScheduleAgenda from './ScheduleAgenda';

export default function ScheduleDashboardCard({width, height}: CardDimensions) {
  const { schedule, upcomingEvents } = useDashboard();
  const theme = useTheme();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  const now = useTVClock();
  const preview = schedulePreview(schedule, upcomingEvents, now);
  const first = preview.first;
  const title = first ? first.title || 'Untitled event' : 'No events to show';
  const detail = first ? scheduleDetail(first) : 'Open details to review your calendar';
  const plan = planScheduleCard({width, height, scale, title, hasEvent: Boolean(first), hasDetail: Boolean(detail),
    today: preview.today, upcoming: preview.upcoming});
  const badge = first ? scheduleEventState(first, now) === 'in-progress' ? 'Happening now'
    : preview.firstIsToday ? `${preview.todayCount} today` : scheduleDate(first.date) : undefined;
  const time = first ? scheduleTime(first) : '';
  const agenda = <View style={{flexDirection: plan.parallelGroups ? 'row' : 'column', gap: (plan.parallelGroups ? 16 : 8) * scale}}>
    {plan.todayCount > 0 && <View style={{width: plan.groupWidth}}>
      <ScheduleAgenda events={preview.today.slice(0, plan.todayCount)} today scale={scale} plan={plan} now={now} />
    </View>}
    {plan.upcomingCount > 0 && <View style={{width: plan.groupWidth}}>
      <ScheduleAgenda events={preview.upcoming.slice(0, plan.upcomingCount)} today={false} scale={scale} plan={plan} now={now} />
    </View>}
  </View>;
  return <View testID='adaptive-schedule' style={{width, height, minWidth: 0}}>
    <View testID='schedule-content' style={{gap: plan.gap}}>
      <CardHeader id='schedule' scale={scale} height={plan.header} badge={badge} />
      <View style={{flexDirection: plan.sideBySide ? 'row' : 'column', gap: (plan.sideBySide ? 16 : 8) * scale}}>
        <View testID='schedule-featured' accessible accessibilityLabel={first ? scheduleLabel(first, preview.firstIsToday, now) : title}
          style={{width: plan.heroWidth, gap: 4 * scale}}>
          {first ? <Text testID='schedule-time' numberOfLines={1} style={{color: theme.colors.focusRing,
            fontSize: time.length > 12 ? Math.min(plan.timeSize, 16 * scale) : plan.timeSize,
            lineHeight: plan.timeLine, fontWeight: '600'}}>{time}</Text>
            : plan.emptyIcon > 0 && <MaterialCommunityIcons name='calendar-blank-outline' size={plan.emptyIcon} color={theme.colors.focusRing} style={{marginBottom: 4 * scale}} />}
          <CardTextBlock title={title} detail={first ? plan.detail ? detail : undefined : height / scale >= 110 ? detail : undefined}
            titleTestID='schedule-featured-title' titleSize={plan.titleSize} titleLine={plan.titleLine}
            titleLines={plan.titleLines} detailSize={11 * scale} detailLine={16 * scale} detailGap={4 * scale} weight='700' />
        </View>
        {plan.sideBySide && <View style={{width: plan.agendaWidth}}>{agenda}</View>}
        {!plan.sideBySide && (plan.todayCount > 0 || plan.upcomingCount > 0) && agenda}
      </View>
    </View>
    {plan.footer && <View testID='schedule-details-hint' style={{position: 'absolute', bottom: 0, left: 0, right: 0}}>
      <CardDetailsHint scale={scale} />
    </View>}
  </View>;
}
