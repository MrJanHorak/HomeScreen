import Pressable from '../../shared/NarratedPressable';
import Text from '../../shared/ReadingText';
import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useTheme} from '../../../theme/ThemeContext';
import {useDashboard} from '../../../context/DashboardContext';
import useTVClock from '../../../hooks/useTVClock';
import type {CalendarEvent} from '../../../../../shared/src/types';
import {useDetailLayout} from '../../shared/DetailLayout';
import {calendarDisplayName, scheduleDate, scheduleEnd, scheduleEventState, scheduleTime} from '../../dashboard/schedule/schedulePresentation';
import {scheduleAgenda} from './scheduleAgenda';
import ScheduleScrollView from './ScheduleScrollView';

export default function ScheduleDetailView() {
  const theme = useTheme();
  const {compact, width} = useDetailLayout();
  const {schedule, upcomingEvents, isLoading} = useDashboard();
  const now = useTVClock();
  const agenda = scheduleAgenda(schedule, upcomingEvents, now);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  const [focusedTab, setFocusedTab] = useState<string | null>(null);
  const scale = compact ? 1 : 1.4;
  const narrow = width < 560;
  const timeWidth = (theme.reading.font === 'opendyslexic' ? 190 : 140) * scale;
  const ink = theme.colors.textPrimary;
  const secondary = theme.colors.textSecondary;
  const tabs = [{id: 'today' as const, title: 'Today', count: agenda.today.length},
    {id: 'upcoming' as const, title: 'Upcoming', count: agenda.upcomingCount}];
  const groups = activeTab === 'today' ? [{date: agenda.today.find(event => event.date)?.date, events: agenda.today}] : agenda.upcoming;
  const empty = activeTab === 'today' ? agenda.today.length === 0 : agenda.upcomingCount === 0;

  const renderEvent = (event: CalendarEvent) => {
    const state = scheduleEventState(event, now);
    const status = state === 'in-progress' ? 'Happening now' : state === 'ended' ? 'Ended' : '';
    const calendar = calendarDisplayName(event.category);
    const start = scheduleTime(event), end = scheduleEnd(event);
    const title = event.title || 'Untitled event';
    const color = /^#[0-9a-f]{6}$/i.test(event.color) ? event.color : theme.colors.focusRing;
    return <View key={`${event.id}|${event.date || ''}`} testID='schedule-detail-event' accessible
      accessibilityLabel={[start, end, title, calendar, status].filter(Boolean).join(', ')}
      style={[styles.event, {paddingVertical: 16 * scale, paddingHorizontal: 18 * scale, gap: 20 * scale,
        borderColor: state === 'in-progress' ? theme.colors.focusRing : theme.colors.glassBorder,
        backgroundColor: state === 'in-progress' ? theme.colors.glassSurfaceFocused : theme.colors.glassSurface},
        narrow && styles.stackedEvent]}>
      <View testID='schedule-detail-time' style={{width: narrow ? '100%' : timeWidth, gap: 4 * scale}}>
        <Text style={{color: ink, fontSize: 20 * scale, fontWeight: '700'}}>{start}</Text>
        {!!end && <Text style={{color: secondary, fontSize: 16 * scale}}>{end}</Text>}
      </View>
      <View style={[styles.eventInfo, {gap: 6 * scale}]}>
        <Text testID='schedule-detail-title' style={{color: ink, fontSize: 22 * scale, fontWeight: '600'}}>{title}</Text>
        {(!!calendar || !!status) && <View style={[styles.metadata, {gap: 14 * scale}]}>
          {!!status && <Text style={{color: ink, fontSize: 16 * scale, fontWeight: state === 'in-progress' ? '700' : '400'}}>{status}</Text>}
          {!!calendar && <View style={[styles.calendarLabel, {gap: 7 * scale}]}>
            <View style={[styles.calendarDot, {backgroundColor: color}]} />
            <Text style={{color: secondary, fontSize: 16 * scale, flexShrink: 1}}>{calendar}</Text>
          </View>}
        </View>}
      </View>
    </View>;
  };

  return <View style={styles.container}>
    <View accessibilityLabel='Schedule views' style={[styles.tabBar, {gap: 12 * scale}]}>
      {tabs.map(tab => {
        const selected = activeTab === tab.id;
        const focused = focusedTab === tab.id;
        return <Pressable key={tab.id} accessibilityLabel={`${tab.title}, ${tab.count} events`}
          accessibilityState={{selected}} onPress={() => setActiveTab(tab.id)}
          onFocus={() => setFocusedTab(tab.id)} onBlur={() => setFocusedTab(null)}
          style={[styles.tab, {paddingVertical: 10 * scale, paddingHorizontal: 18 * scale,
            borderColor: focused ? theme.colors.focusRing : selected ? ink : theme.colors.glassBorder,
            backgroundColor: focused || selected ? theme.colors.glassSurfaceFocused : theme.colors.glassSurface}]}>
          <Text style={{fontSize: 18 * scale, fontWeight: selected ? '700' : '500', color: ink}}>{tab.title} · {tab.count}</Text>
        </Pressable>;
      })}
    </View>
    <ScheduleScrollView key={activeTab} testID='schedule-detail-scroll' style={styles.scroll}
      tabIndex={0} accessibilityLabel={`${activeTab === 'today' ? 'Today' : 'Upcoming'} agenda. Scroll for more events.`}
      contentContainerStyle={{paddingBottom: 24 * scale}} showsVerticalScrollIndicator>
      <View style={[styles.agenda, {gap: 24 * scale}]}>
        {empty ? <View style={[styles.empty, {borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.glassSurface}]}>
          <MaterialCommunityIcons name='calendar-blank-outline' size={36 * scale} color={secondary} />
          <Text style={{color: ink, fontSize: 22 * scale, fontWeight: '600'}}>
            {isLoading ? 'Loading schedule…' : activeTab === 'today' ? 'No events to show today' : 'No upcoming events to show'}
          </Text>
          {!isLoading && <Text style={{color: secondary, fontSize: 16 * scale}}>Events from your connected calendars appear here.</Text>}
        </View> : groups.map((group, index) => <View key={group.date || `undated-${index}`} testID='schedule-detail-day' style={{gap: 10 * scale}}>
          <View style={[styles.dayHeading, {gap: 12 * scale}]}>
            <Text accessibilityRole='header' style={{color: ink, fontSize: 20 * scale, fontWeight: '700'}}>
              {group.date ? scheduleDate(group.date) : activeTab === 'today' ? 'Today' : 'Date unavailable'}
            </Text>
            <Text style={{color: secondary, fontSize: 16 * scale}}>{group.events.length} {group.events.length === 1 ? 'event' : 'events'}</Text>
          </View>
          {group.events.map(renderEvent)}
        </View>)}
      </View>
    </ScheduleScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: {flex: 1, minHeight: 0},
  tabBar: {width: '100%', maxWidth: 1280, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', padding: 3, marginBottom: 12},
  tab: {borderWidth: 3, borderRadius: 12, minHeight: 48},
  scroll: {flex: 1},
  agenda: {width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 3},
  dayHeading: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline'},
  event: {flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, borderWidth: 1},
  stackedEvent: {flexDirection: 'column'},
  eventInfo: {flex: 1, minWidth: 0},
  metadata: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center'},
  calendarLabel: {flexDirection: 'row', alignItems: 'center', maxWidth: '100%', flexShrink: 1},
  calendarDot: {width: 8, height: 8, borderRadius: 4},
  empty: {alignItems: 'center', padding: 28, gap: 12, borderRadius: 12, borderWidth: 1},
});
