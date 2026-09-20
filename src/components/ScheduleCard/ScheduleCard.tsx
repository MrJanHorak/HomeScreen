import { View } from 'react-native';

function ScheduleCard() {
  return (
    <View>
      <TVText text='TODAY' typography='caption' color='textSecondary' />
      <TVText text={mockHomeData.calendar[0].title} typography='body' />
      <TVText text={mockHomeData.calendar[0].time} typography='caption' />
    </View>
  );
}
export default ScheduleCard;
