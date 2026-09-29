import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface NavItem {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Dashboard', icon: 'view-dashboard' },
  { id: 'schedule', label: 'Calendar', icon: 'calendar-month-outline' },
  { id: 'media', label: 'Watch', icon: 'movie-open-play-outline' },
  { id: 'tasks', label: 'Tasks', icon: 'checkbox-marked-circle-outline' },
  { id: 'settings', label: 'Settings', icon: 'cog-outline' },
];

interface TVGlassNavBarProps {
  activeId?: string;
  onSelect?: (id: string) => void;
}

export default function TVGlassNavBar({
  activeId = 'home',
  onSelect,
}: TVGlassNavBarProps) {
  const theme = useTheme();
  const [focusedId, setFocusedId] = useState<string | null>(null);

  return (
    <View style={styles.dockContainer}>
      <View style={styles.glassDock}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeId;
          const isFocused = item.id === focusedId;

          return (
            <Pressable
              key={item.id}
              onFocus={() => setFocusedId(item.id)}
              onBlur={() => setFocusedId(null)}
              onPress={() => onSelect?.(item.id)}
              style={[
                styles.navItem,
                isActive && styles.activeNavItem,
                isFocused && [
                  styles.focusedNavItem,
                  {
                    borderColor: theme.colors.focusRing,
                    backgroundColor: 'rgba(56, 189, 248, 0.25)',
                    transform: [{ scale: 1.08 }],
                  },
                ],
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={20}
                color={
                  isFocused
                    ? theme.colors.textFocused
                    : isActive
                    ? theme.colors.focusRing
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: isFocused
                      ? theme.colors.textFocused
                      : isActive
                      ? theme.colors.textPrimary
                      : theme.colors.textSecondary,
                    fontWeight: isActive || isFocused ? '700' : '500',
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  glassDock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    gap: 8,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow:
          '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
      } as any,
    }),
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
    ...Platform.select({
      web: {
        transition: 'all 0.18s ease',
        cursor: 'pointer',
      } as any,
    }),
  },
  activeNavItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  focusedNavItem: {
    borderWidth: 1.5,
    ...Platform.select({
      web: {
        boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)',
      } as any,
    }),
  },
  navLabel: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
