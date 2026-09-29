import React from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useDashboard } from '../../context/DashboardContext';
import { getWeatherIconName } from '../../helpers/weatherHelpers';

export default function WeatherDetailView() {
  const theme = useTheme();
  const { savedLocations, activeLocation, setActiveLocation, getWeatherForLoc } = useDashboard();

  const weather = getWeatherForLoc(activeLocation);
  const hourlyData = weather.hourly || [
    { time: 'Now', temp: weather.temperature || 70, icon: weather.conditionIcon || 'sun', pop: '0%' },
    { time: '2 PM', temp: (weather.temperature || 70) + 3, icon: 'sun', pop: '0%' },
    { time: '4 PM', temp: (weather.temperature || 70) + 4, icon: 'sun', pop: '5%' },
    { time: '6 PM', temp: (weather.temperature || 70) + 1, icon: 'cloud-sun', pop: '10%' },
    { time: '8 PM', temp: (weather.temperature || 70) - 4, icon: 'cloud-sun', pop: '15%' },
    { time: '10 PM', temp: (weather.temperature || 70) - 7, icon: 'moon', pop: '10%' },
    { time: '12 AM', temp: (weather.temperature || 70) - 9, icon: 'moon', pop: '5%' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Location Switcher Tabs */}
      <View style={styles.locationTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationTabsScroll}>
          {savedLocations.map((loc) => {
            const isSelected = loc.id === activeLocation.id;
            const locWeather = getWeatherForLoc(loc);

            return (
              <Pressable
                key={loc.id}
                onPress={() => setActiveLocation(loc)}
                style={[
                  styles.locationTab,
                  isSelected && [
                    styles.activeLocationTab,
                    { borderColor: theme.colors.focusRing, backgroundColor: 'rgba(56, 189, 248, 0.16)' },
                  ],
                ]}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={16}
                  color={isSelected ? theme.colors.focusRing : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.locationTabName,
                    { color: isSelected ? theme.colors.textPrimary : theme.colors.textSecondary },
                  ]}
                >
                  {loc.name}
                </Text>
                <Text
                  style={[
                    styles.locationTabTemp,
                    { color: isSelected ? theme.colors.focusRing : theme.colors.textSecondary },
                  ]}
                >
                  {locWeather.temperature}°
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Top Hero Section */}
      <View style={styles.heroRow}>
        {/* Left: Huge Temp & Condition */}
        <View style={styles.heroLeft}>
          <View style={styles.tempGroup}>
            <Text style={[styles.mainTemp, { color: theme.colors.textPrimary }]}>
              {weather.temperature}°
            </Text>
            <View style={styles.conditionCol}>
              <Text style={[styles.conditionTitle, { color: theme.colors.textPrimary }]}>
                {weather.condition}
              </Text>
              <Text style={[styles.feelsLike, { color: theme.colors.textSecondary }]}>
                Feels like {weather.feelsLike}° • H: {weather.high}° L: {weather.low}°
              </Text>
              <Text style={[styles.locationText, { color: theme.colors.focusRing }]}>
                📍 {weather.location}
              </Text>
            </View>
          </View>
        </View>

        {/* Right: 4 Environmental Metric Tiles */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricTile}>
            <MaterialCommunityIcons name="water-percent" size={24} color="#38BDF8" />
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Humidity</Text>
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{weather.humidity}%</Text>
          </View>

          <View style={styles.metricTile}>
            <MaterialCommunityIcons name="weather-windy" size={24} color="#34D399" />
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Wind</Text>
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
              {weather.windSpeed} mph {weather.windDirection}
            </Text>
          </View>


          <View style={styles.metricTile}>
            <MaterialCommunityIcons name="white-balance-sunny" size={24} color="#FBBF24" />
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>UV Index</Text>
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>3 (Moderate)</Text>
          </View>

          <View style={styles.metricTile}>
            <MaterialCommunityIcons name="gauge" size={24} color="#A78BFA" />
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Air Pressure</Text>
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>1014 hPa</Text>
          </View>
        </View>
      </View>

      {/* Hourly Timeline */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Hourly Forecast
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
          {hourlyData.map((hour, idx) => {
            const iconConfig = getWeatherIconName(hour.icon);
            return (
              <View key={idx} style={styles.hourlyCard}>
                <Text style={[styles.hourlyTime, { color: theme.colors.textSecondary }]}>
                  {hour.time}
                </Text>
                <MaterialCommunityIcons
                  name={iconConfig.name}
                  size={26}
                  color={theme.colors.focusRing}
                  style={{ marginVertical: 6 }}
                />
                <Text style={[styles.hourlyTemp, { color: theme.colors.textPrimary }]}>
                  {hour.temp}°
                </Text>
                <Text style={[styles.hourlyPop, { color: '#38BDF8' }]}>
                  {hour.pop}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 5-Day Extended Forecast */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Extended 5-Day Outlook
        </Text>
        <View style={styles.forecastList}>
          {(weather.forecast || []).map((item, idx) => {
            const iconConfig = getWeatherIconName(item.icon);
            return (
              <View key={idx} style={styles.forecastRow}>
                <Text style={[styles.forecastDay, { color: theme.colors.textPrimary }]}>
                  {item.day}
                </Text>
                <View style={styles.forecastConditionWrap}>
                  <MaterialCommunityIcons
                    name={iconConfig.name}
                    size={22}
                    color={theme.colors.focusRing}
                  />
                  <Text style={[styles.forecastCondition, { color: theme.colors.textSecondary }]}>
                    {item.condition}
                  </Text>
                </View>
                <View style={styles.tempBarContainer}>
                  <Text style={[styles.tempLow, { color: theme.colors.textSecondary }]}>
                    {item.low}°
                  </Text>
                  <View style={styles.tempBarTrack}>
                    <View style={styles.tempBarFill} />
                  </View>
                  <Text style={[styles.tempHigh, { color: theme.colors.textPrimary }]}>
                    {item.high}°
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  locationTabsContainer: {
    marginBottom: 20,
  },
  locationTabsScroll: {
    flexDirection: 'row',
  },
  locationTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 10,
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      } as any,
    }),
  },
  activeLocationTab: {
    borderWidth: 1.5,
  },
  locationTabName: {
    fontSize: 15,
    fontWeight: '700',
  },
  locationTabTemp: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 24,
  },
  heroLeft: {
    flex: 1.2,
  },
  tempGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  mainTemp: {
    fontSize: 76,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  conditionCol: {
    justifyContent: 'center',
  },
  conditionTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  feelsLike: {
    fontSize: 15,
    marginTop: 3,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  metricsGrid: {
    flex: 1.5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricTile: {
    width: '47%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  hourlyScroll: {
    flexDirection: 'row',
  },
  hourlyCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 12,
    minWidth: 72,
  },
  hourlyTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  hourlyTemp: {
    fontSize: 17,
    fontWeight: '700',
  },
  hourlyPop: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  forecastList: {
    gap: 8,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  forecastDay: {
    width: 60,
    fontSize: 16,
    fontWeight: '700',
  },
  forecastConditionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 180,
  },
  forecastCondition: {
    fontSize: 15,
    fontWeight: '500',
  },
  tempBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tempLow: {
    fontSize: 15,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  tempBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  tempBarFill: {
    width: '65%',
    marginLeft: '20%',
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  tempHigh: {
    fontSize: 15,
    fontWeight: '700',
    width: 32,
  },
});
