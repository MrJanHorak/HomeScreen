import { View } from 'react-native';
import TVText from '../components/tv/TVText';
import TVSection from '../components/tv/TVSection';
import TVCard from '../components/tv/TVCard';

function HomeScreen() {
  return (
    <View>
      <TVText
        text={'Good evening Jan!'}
        typography={'headerMd'}
        color='textSecondary'
        // marginTop='xs'
        // marginHorizontal='sm'
        marginBottom='sm'
      />
      <TVSection direction='row'>
        <TVCard style={{ flex: 1 }} title={'weather'} />
        <TVCard style={{ flex: 1 }} title={'calendar'} />
        <TVCard style={{ flex: 1 }} title={'FitnessStats'} />
      </TVSection>
      <TVSection direction='row'>
        <TVCard style={{ flex: 1 }} title={'TV Show 1'} />
        <TVCard style={{ flex: 1 }} title={'TV Show 2'} />
        <TVCard style={{ flex: 1 }} title={'Movie 1'} />
        <TVCard style={{ flex: 1 }} title={'Movie 2'} />
        <TVCard style={{ flex: 1 }} title={'TV Show 3'} />
      </TVSection>
    </View>
  );
}
export default HomeScreen;
