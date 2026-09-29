import { useWeather } from '../../hooks/useWeather';
import { useDashboard } from '../../context/DashboardContext';
import { ActivityIndicator, View, StyleSheet, Pressable, Text, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CurrentWeatherHeader from './CurrentWeatherHeader';
import ForecastItemComponent from './ForecastItemComponent';
import TVText from '../tv/TVText';
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

export default function WeatherWidget() {
  const { data, isLoading } = useWeather();
  const { activeLocation, cycleNextLocation, savedLocations } = useDashboard();
  const theme = useTheme();
  const compact = useCompactTVLayout();

  const hasMultiple = savedLocations.length > 1;

  return (
    <View style={styles.container}>
      {/* Location Badge with Quick Switcher */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          if (hasMultiple) cycleNextLocation();
        }}
        style={[styles.locationPill, compact && styles.compactLocationPill]}
      >
        <MaterialCommunityIcons name="map-marker" size={compact ? 11 : 14} color={theme.colors.focusRing} />
        <Text numberOfLines={1} style={[styles.locationName, compact && styles.compactLocationName, { color: theme.colors.textPrimary }]}>
          {activeLocation?.name || 'Local'}
        </Text>
        {hasMultiple && (
          <View style={styles.cycleBadge}>
            <MaterialCommunityIcons name="swap-horizontal" size={14} color={theme.colors.focusRing} />
          </View>
        )}
      </Pressable>

      {isLoading || data?.condition === 'Loading weather' ? (
        <ActivityIndicator color={theme.colors.focusRing} />
      ) : !data || data.temperature === undefined ? (
        <TVText text="Weather unavailable" typography="body" color="textSecondary" />
      ) : (
        <>
          <CurrentWeatherHeader
            temperature={data.temperature}
            condition={data.condition}
            conditionIcon={data.conditionIcon || 'cloud'}
          />
          <View style={[styles.forecastRow, compact && styles.compactForecastRow]}>
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
        </>
      )}
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
  compactLocationPill: { paddingVertical: 2, paddingHorizontal: 7, marginBottom: 4 },
  compactLocationName: { fontSize: 11 },
  compactForecastRow: { gap: 4 },
});


