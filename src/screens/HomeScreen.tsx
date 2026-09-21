import { View } from 'react-native';
import TVText from '../components/tv/TVText';
import TVSection from '../components/tv/TVSection';
import TVCard from '../components/tv/TVCard';
import HeaderBar from '../components/HeaderBar';
import WeatherWidget from '../components/weatherWidget/WeatherWidget';
import ScheduleCard from '../components/ScheduleCard/ScheduleCard';
import ActivityCard from '../components/activityCard/ActivityCard';

import { mockHomeData } from '../data/mockData';

function HomeScreen() {
  return (
    <View>
      <HeaderBar />
      <TVSection direction='row'>
        <TVCard style={{ flex: 1, height: 170 }}>
          <WeatherWidget />
        </TVCard>
        <TVCard style={{ flex: 2, height: 170 }}>
          <ScheduleCard />
        </TVCard>
        <TVCard style={{ flex: 1, height: 170 }}>
          <ActivityCard />
        </TVCard>
      </TVSection>
      <TVSection direction='row'>
        <TVCard style={{ flex: 1 }} title={'TV Show 1'} />
        <TVCard style={{ flex: 1 }} title={'TV Show 2'} />
        <TVCard style={{ flex: 1 }} title={'Movie 1'} />
        <TVCard style={{ flex: 1 }} title={'Movie 2'} />
        <TVCard style={{ flex: 1 }} title={'TV Show 3'} />
      </TVSection>
      <TVText
        text={'NAVIGATION BAR GOES HERE .... EVENTUALLY'}
        typography={'body'}
        color='textSecondary'
      />
    </View>
  );
}
export default HomeScreen;
