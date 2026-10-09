import Pressable from '../../shared/NarratedPressable';
import Text from '../../shared/ReadingText';
import {ScrollView, StyleSheet, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import type {SavedLocation, Weather} from '../../../../../shared/src/types';
import {useTheme} from '../../../theme/ThemeContext';
import {useControlFocus} from '../../../hooks/useControlFocus';
import {useDetailLayout} from '../../shared/DetailLayout';

interface WeatherLocationTabsProps {
  locations: SavedLocation[];
  activeId: string;
  getWeather: (location: SavedLocation) => Weather;
  onSelect: (location: SavedLocation) => void;
}

export default function WeatherLocationTabs({locations, activeId, getWeather, onSelect}: WeatherLocationTabsProps) {
  const theme = useTheme();
  const {compact} = useDetailLayout();
  const {focusProps, focusStyle} = useControlFocus();
  return (
    <View style={[styles.container, compact && {marginBottom: 12}]}>
      <ScrollView horizontal accessibilityRole="tablist" accessibilityLabel="Weather locations" showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {locations.map((location) => {
          const selected = location.id === activeId;
          const color = selected ? theme.colors.focusRing : theme.colors.textSecondary;
          return (
            <Pressable
              key={location.id}
              accessibilityRole="tab"
              accessibilityLabel={`Show weather for ${location.name}`}
              aria-selected={selected}
              {...focusProps(location.id)}
              onPress={() => onSelect(location)}
              style={[
                styles.tab,
                selected && {borderColor: theme.colors.focusRing, backgroundColor: 'rgba(56, 189, 248, 0.16)'},
                focusStyle(location.id),
              ]}
            >
              <MaterialCommunityIcons name="map-marker" size={16} color={color} />
              <Text style={[styles.name, {color: selected ? theme.colors.textPrimary : theme.colors.textSecondary}]}>
                {location.name}
              </Text>
              <Text style={[styles.temperature, {color}]}>{getWeather(location).temp}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {marginBottom: 20},
  tabs: {flexDirection: 'row'},
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)', marginRight: 10, gap: 8,
  },
  name: {fontSize: 15, fontWeight: '700'},
  temperature: {fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums']},
});
