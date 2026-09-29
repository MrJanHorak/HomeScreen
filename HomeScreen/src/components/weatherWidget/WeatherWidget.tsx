import { useWeather } from '../../hooks/useWeather';
import { useDashboard } from '../../context/DashboardContext';
import { ActivityIndicator, View, StyleSheet, Pressable, Text, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CurrentWeatherHeader from './CurrentWeatherHeader';
import ForecastItemComponent from './ForecastItemComponent';
import TVText from '../tv/TVText';
import { useTheme } from '../../theme/ThemeContext';

export default function WeatherWidget() {
  const { data, isLoading } = useWeather();
  const { activeLocation, cycleNextLocation, savedLocations } = useDashboard();
  const theme = useTheme();

  if (isLoading) return <ActivityIndicator color={theme.colors.focusRing} />;
  if (!data || data.temperature === undefined) {
    return <TVText text="Weather unavailable" typography="body" color="textSecondary" />;
  }

  const hasMultiple = savedLocations.length > 1;

  return (
    <View style={styles.container}>
      {/* Location Badge with Quick Switcher */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          if (hasMultiple) cycleNextLocation();
        }}
        style={styles.locationPill}
      >
        <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.focusRing} />
        <Text numberOfLines={1} style={[styles.locationName, { color: theme.colors.textPrimary }]}>
          {activeLocation?.name || 'Local'}
        </Text>
        {hasMultiple && (
          <View style={styles.cycleBadge}>
            <MaterialCommunityIcons name="swap-horizontal" size={14} color={theme.colors.focusRing} />
          </View>
        )}
      </Pressable>

      <CurrentWeatherHeader
        temperature={data.temperature}
        condition={data.condition}
        conditionIcon={data.conditionIcon || 'cloud'}
      />
      <View style={styles.forecastRow}>
        {data.forecast?.map((forecastItem) => (
          <ForecastItemComponent
            key={forecastItem.day}
            day={forecastItem.day}
            condition={forecastItem.condition}
            icon={forecastItem.icon}
            high={forecastItem.high}
            low={forecastItem.low}
          />
        ))}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: 4,
    position: 'relative',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 6,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      } as any,
    }),
  },
  locationName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cycleBadge: {
    marginLeft: 2,
    opacity: 0.8,
  },
  forecastRow: {
    gap: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


