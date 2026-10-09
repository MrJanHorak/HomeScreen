import Pressable from '../shared/NarratedPressable';
import Text from '../shared/ReadingText';
import React, { useRef, useState } from 'react';
import {View, StyleSheet, ScrollView, Platform, useWindowDimensions} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import ReadingSettings from './appearance/ReadingSettings';
import AccessibilitySettings from './accessibility/AccessibilitySettings';
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
  | 'reading'
  | 'accessibility'
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
  { id: 'reading', label: 'Fonts & reading', icon: 'format-font' },
  { id: 'accessibility', label: 'Accessibility', icon: 'human' },
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
  const {height} = useWindowDimensions();
  const compact = height < 700;
  const [section, setSection] = useState<SettingsSection>('colors');
  const scrollRef = useRef<ScrollView>(null);
  const menuRef = useRef<ScrollView>(null);
  const menuItems = useRef<Record<string, {y: number; height: number}>>({});
  const menuHeight = useRef(0);
  const menuOffset = useRef(0);
  const { focusProps, focusStyle } = useControlFocus();

  const changeSection = (next: SettingsSection) => {
    setSection(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={menuRef} style={[styles.menu, compact && styles.compactMenu]} contentContainerStyle={styles.menuItems}
        accessibilityRole='tablist' accessibilityLabel='Settings sections' showsVerticalScrollIndicator
        onLayout={({nativeEvent: {layout}}) => {menuHeight.current = layout.height;}}
        onScroll={({nativeEvent}) => {menuOffset.current = nativeEvent.contentOffset.y;}} scrollEventThrottle={16}>
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
              onLayout={({nativeEvent: {layout}}) => {menuItems.current[item.id] = layout;}}
              {...focusProps(`tab-${item.id}`)}
              onFocus={() => {
                focusProps(`tab-${item.id}`).onFocus();
                const row = menuItems.current[item.id];
                if (!row) return;
                let y = menuOffset.current;
                if (row.y < y) y = row.y;
                else if (row.y + row.height > y + menuHeight.current) y = row.y + row.height - menuHeight.current;
                menuRef.current?.scrollTo({y: Math.max(0, y), animated: false});
              }}
              style={[
                styles.tab,
                compact && styles.compactTab,
                {
                  borderColor: active
                    ? theme.colors.glassBorderTop
                    : theme.colors.glassBorder,
                  backgroundColor: active
                    ? theme.colors.glassSurfaceFocused
                    : theme.colors.glassSurface,
                },
                focusStyle(`tab-${item.id}`),
                {transform: [{scale: 1}]},
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={compact ? 18 : 22}
                color={
                  active ? theme.colors.focusRing : theme.colors.textSecondary
                }
              />
              <Text
                style={[styles.tabLabel, compact && styles.compactTabLabel, { color: theme.colors.textPrimary }]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator
        accessibilityLabel={`${SECTIONS.find((item) => item.id === section)?.label} options`}
      >
        {(section === 'colors' ||
          section === 'background' ||
          section === 'layout' ||
          section === 'cards') && <AppearanceSettings section={section} />}
        {section === 'reading' && <ReadingSettings />}
        {section === 'accessibility' && <AccessibilitySettings />}
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
    minHeight: 0,
    flexDirection: 'row',
    gap: 18,
  },
  menu: {width: 230, flexGrow: 0, flexShrink: 0, borderRightWidth: 1, borderRightColor: '#ffffff18'},
  compactMenu: {width: 190},
  menuItems: {gap: 5, paddingRight: 10, paddingVertical: 4},
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderRadius: 12,
  },
  compactTab: {minHeight: 36, paddingVertical: 5, gap: 7},
  tabLabel: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  compactTabLabel: {fontSize: 14},
  content: { flex: 1, minWidth: 0 },
  hiddenSection: { display: 'none' },
  contentInner: { paddingBottom: 12, paddingHorizontal: 4 },
});
