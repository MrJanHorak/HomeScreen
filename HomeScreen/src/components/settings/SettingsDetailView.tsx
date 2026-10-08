import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import AppearanceSettings, {
  AppearanceSection,
} from './appearance/AppearanceSettings';
import MealConnectionSettings from './meals/MealConnectionSettings';
import FavoriteAppsSettings from './favorites/FavoriteAppsSettings';
import AmbientSettings from './ambient/AmbientSettings';
import CompanionSiteSettings from './companion/CompanionSiteSettings';
import WeatherSettings from './weather/WeatherSettings';
import DeviceSettings from './device/DeviceSettings';
import PeopleSettings from './people/PeopleSettings';
import { useControlFocus } from '../../hooks/useControlFocus';

type SettingsSection =
  | AppearanceSection
  | 'weather'
  | 'meals'
  | 'apps'
  | 'device'
  | 'ambient'
  | 'companion'
  | 'people';
const SECTIONS: {
  id: SettingsSection;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: 'companion', label: 'Companion site', icon: 'qrcode-scan' },
  { id: 'people', label: 'People', icon: 'account-group-outline' },
  { id: 'colors', label: 'Colors', icon: 'palette-outline' },
  { id: 'background', label: 'Background', icon: 'image-outline' },
  { id: 'ambient', label: 'Ambient', icon: 'weather-night' },
  { id: 'layout', label: 'Layout', icon: 'view-dashboard-outline' },
  { id: 'cards', label: 'Cards', icon: 'view-grid-outline' },
  { id: 'weather', label: 'Weather', icon: 'weather-partly-cloudy' },
  { id: 'meals', label: 'Meals', icon: 'silverware-fork-knife' },
  { id: 'apps', label: 'Apps', icon: 'apps' },
  { id: 'device', label: 'Device', icon: 'television' },
];

export default function SettingsDetailView({
  onPreviewAmbient = () => {},
}: {
  onPreviewAmbient?: () => void;
}) {
  const theme = useTheme();
  const [section, setSection] = useState<SettingsSection>('colors');
  const scrollRef = useRef<ScrollView>(null);
  const { focusProps, focusStyle } = useControlFocus();

  const changeSection = (next: SettingsSection) => {
    setSection(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs} accessibilityRole='tablist'>
        {SECTIONS.filter(
          (item) => Platform.OS === 'android' || item.id !== 'apps',
        ).map((item) => {
          const active = section === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole='tab'
              accessibilityLabel={`${item.label} settings`}
              hasTVPreferredFocus={item.id === 'colors'}
              accessibilityState={{ selected: active }}
              onPress={() => changeSection(item.id)}
              {...focusProps(`tab-${item.id}`)}
              style={[
                styles.tab,
                {
                  borderColor: active
                    ? theme.colors.glassBorderTop
                    : theme.colors.glassBorder,
                  backgroundColor: active
                    ? theme.colors.glassSurfaceFocused
                    : theme.colors.glassSurface,
                },
                focusStyle(`tab-${item.id}`),
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={
                  active ? theme.colors.focusRing : theme.colors.textSecondary
                }
              />
              <Text
                style={[styles.tabLabel, { color: theme.colors.textPrimary }]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {(section === 'colors' ||
          section === 'background' ||
          section === 'layout' ||
          section === 'cards') && <AppearanceSettings section={section} />}
        {section === 'ambient' && (
          <AmbientSettings onPreview={onPreviewAmbient} />
        )}
        {section === 'companion' && <CompanionSiteSettings />}
        {section === 'people' && <PeopleSettings />}
        {section === 'meals' && <MealConnectionSettings />}
        {section === 'apps' && <FavoriteAppsSettings />}
        <View style={section === 'weather' ? undefined : styles.hiddenSection}>
          <WeatherSettings />
        </View>
        {section === 'device' && <DeviceSettings />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 13,
    borderWidth: 2,
    borderRadius: 12,
  },
  tabLabel: { fontSize: 15, fontWeight: '700' },
  content: { flex: 1 },
  hiddenSection: { display: 'none' },
  contentInner: { paddingBottom: 24 },
});
