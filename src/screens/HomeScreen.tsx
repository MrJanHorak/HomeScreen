import { View } from 'react-native';
import TVText from '../components/tv/TVText';
import TVSection from '../components/tv/TVSection';
import TVCard from '../components/tv/TVCard';
import HeaderBar from '../components/HeaderBar';
import WeatherWidget from '../components/weatherWidget/WeatherWidget';
import ScheduleCard from '../components/ScheduleCard/ScheduleCard';
import ActivityCard from '../components/activityCard/ActivityCard';
import MealCard from '../components/MealCard/MealCard';

function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <HeaderBar />
      <TVSection direction='row' style={{ height: '40%', marginBottom: 16 }}>
        <TVCard style={{ flex: 1, height: '100%' }}>
          <WeatherWidget />
        </TVCard>
        <TVCard style={{ flex: 2, height: '100%' }}>
          <ScheduleCard />
        </TVCard>
        <TVCard style={{ flex: 1, height: '100%' }}>
          <ActivityCard />
        </TVCard>
      </TVSection>
      <TVSection direction='row' style={{ height: '30%' }}>
        <TVCard style={{ flex: 1, height: '100%' }} title={'TV Show 1'} />
        <TVCard style={{ flex: 1, height: '100%' }}><MealCard /></TVCard>
        <TVCard style={{ flex: 1, height: '100%' }} title={'TV Show 2'} />
        {/* <TVCard style={{ flex: 1, height: '100%' }} title={'Movie 1'} /> */}
        {/* <TVCard style={{ flex: 1, height: '100%' }} title={'Movie 2'} />
        <TVCard style={{ flex: 1, height: '100%' }} title={'TV Show 3'} /> */}
      </TVSection>
      <View style={{ position: 'absolute', bottom: 0, left: 0 }}>
        <TVText
          text={'NAVIGATION BAR GOES HERE .... EVENTUALLY'}
          typography={'body'}
          color='textSecondary'
        />
      </View>
    </View>
  );
}
export default HomeScreen;
