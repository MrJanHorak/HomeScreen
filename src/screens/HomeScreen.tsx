import { View } from 'react-native';
import TVText from '../components/tv/TVText';
import { TVCard } from '../components/tv/TVCard';

function HomeScreen() {
  return (
    <View>
      <TVText
        text={'HomeScreen'}
        typography={'headerLg'}
        color='textSecondary'
        marginTop='xs'
        marginHorizontal='sm'
      />
      <TVCard title={'weather'} />
      <TVCard title={'calendar'} />
      <TVCard title={'FitnessStats'} />
    </View>
  );
}
export default HomeScreen;
