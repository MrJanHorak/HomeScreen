import {ScrollView, StyleSheet} from 'react-native';
import {useDashboard} from '../../../context/DashboardContext';
import WeatherLocationTabs from './WeatherLocationTabs';
import CurrentWeatherOverview from './CurrentWeatherOverview';
import HourlyForecast from './HourlyForecast';
import DailyForecast from './DailyForecast';

export default function WeatherDetailView() {
  const {savedLocations, activeLocation, setActiveLocation, getWeatherForLoc} = useDashboard();
  const weather = getWeatherForLoc(activeLocation);
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <WeatherLocationTabs
        locations={savedLocations}
        activeId={activeLocation.id}
        getWeather={getWeatherForLoc}
        onSelect={setActiveLocation}
      />
      <CurrentWeatherOverview weather={weather} />
      <HourlyForecast hours={weather.hourly || []} />
      <DailyForecast days={weather.forecast || []} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({container: {flex: 1}});
