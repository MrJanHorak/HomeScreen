import { View, StyleSheet } from 'react-native';
import TVText from '../tv/TVText';
import { CalendarItem } from '../../hooks/useSchedule';

//helpers
import { splitTimeString } from '../../helpers/dateTimeHelpers';

function ScheduleItem({ title, time, endTime, category, color }: CalendarItem) {
  const [timeDigits, period] = splitTimeString(time);

  return (
    <View style={styles.rowContainer}>
      {/* Left Column: Fixed Width Right-Aligned Time */}
      <View style={styles.timeColumn}>
        <TVText text={timeDigits} typography='body' style={styles.timeText} />
        <TVText
          text={period}
          typography='caption'
          color='textSecondary'
          style={styles.periodText}
        />
      </View>

      {/* Vertical Accent Divider */}
      <View style={{ backgroundColor: color, width: 3 }} />

      {/* Right Column: Event Info */}
      <View style={styles.detailsColumn}>
        <TVText text={title} typography='caption' numberOfLines={1} />
        <TVText
          text={`${time} - ${endTime}`}
          typography='caption'
          color='textSecondary'
        />
      </View>
    </View>
  );
}
export default ScheduleItem;

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  timeColumn: {
    width: 110,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    paddingRight: 16,
  },
  timeText: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  periodText: {
    // marginLeft: 4,
    // width: 28,
  },
  detailsColumn: {
    // flex: 1,
    // paddingLeft: 12,
  },
});
