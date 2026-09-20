import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useSchedule } from '../../hooks/useSchedule';

import TVText from '../tv/TVText';
import ScheduleItem from './ScheduleItem';

export default function ScheduleCard() {
  const { data, isLoading } = useSchedule();
  const maxItems = 2;

  if (isLoading) {
    return <ActivityIndicator />;
  }

  const events = data ?? [];
  const visibleEvents = events.slice(0, maxItems);
  const remainingCount = events.length - maxItems;

  return (
    <View style={styles.container}>
      <View>
        <TVText
          style={styles.header}
          text='TODAY'
          typography='body'
          color='textPrimary'
        />
        <View style={styles.schedule}>
          {visibleEvents.map((calendarItem) => (
            <ScheduleItem
              key={calendarItem.id}
              id={calendarItem.id}
              title={calendarItem.title}
              time={calendarItem.time}
              endTime={calendarItem.endTime}
              category={calendarItem.category}
              color={calendarItem.color}
            />
          ))}
        </View>
      </View>

      {/* Footer Badge */}
      {remainingCount > 0 && (
        <TVText
          style={styles.bottomMore}
          text={`+${remainingCount} more`}
          typography='caption'
          color='accent'
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // alignContent: 'center',
    // justifyContent: 'center',
  },
  header: {
    alignSelf: 'center',
  },
  schedule: {
    // gap: 4,
    // marginLeft: 15,
    marginBottom: -8,
  },
  bottomMore: {
    alignSelf: 'flex-end',
  },
});
