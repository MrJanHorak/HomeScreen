import {ScrollView, StyleSheet, View} from 'react-native';
import {useDetailLayout} from '../../shared/DetailLayout';
import {useDashboard} from '../../../context/DashboardContext';
import WeatherLocationTabs from './WeatherLocationTabs';
import CurrentWeatherOverview from './CurrentWeatherOverview';
import HourlyForecast from './HourlyForecast';
import DailyForecast from './DailyForecast';

export default function WeatherDetailView() {
  const {savedLocations, activeLocation, setActiveLocation, getWeatherForLoc} = useDashboard();
  const weather = getWeatherForLoc(activeLocation);
  const {twoColumns} = useDetailLayout();
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator>
      <WeatherLocationTabs
        locations={savedLocations}
        activeId={activeLocation.id}
        getWeather={getWeatherForLoc}
        onSelect={setActiveLocation}
      />
      <View style={[styles.body, twoColumns && styles.columns]}>
        <View style={twoColumns && styles.current}><CurrentWeatherOverview weather={weather} stacked={twoColumns}/></View>
        <View style={twoColumns && styles.forecast}>
          <HourlyForecast hours={weather.hourly || []} />
          <DailyForecast days={weather.forecast || []} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({container: {flex: 1}, body: {gap: 12}, columns: {flexDirection: 'row', gap: 18},
  current: {width: '34%', minWidth: 0}, forecast: {flex: 1, minWidth: 0}});
