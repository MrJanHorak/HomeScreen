import { StyleSheet, View, ViewStyle } from 'react-native';
import TVText from './tv/TVText';

import { useGreeting } from '../hooks/useGreeting';
import { useCurrentDateTime } from '../hooks/useCurrentDateTime';

interface HeaderBarProps {
  name: string;
  time: string;
  date: string;
  onPress?: () => void;
  style?: ViewStyle;
}

function HeaderBar() {
  let currentTime = useCurrentDateTime();
  let greeting = useGreeting(currentTime.currentHour);

  return (
    <View style={styles.headerContainer}>
      {/* <TVText text={greeting.greeting} /> */}
      <TVText text={currentTime.formattedDate} />
      <TVText text={currentTime.formattedTime} />
    </View>
  );
}
export default HeaderBar;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
});
