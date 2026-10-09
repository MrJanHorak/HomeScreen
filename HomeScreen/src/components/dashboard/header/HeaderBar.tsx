import Text from '../../shared/ReadingText';
import { StyleSheet, View, Platform, Pressable} from 'react-native';
import { useState } from 'react';
import { useGreeting } from './useGreeting';
import { useCurrentDateTime } from './useCurrentDateTime';
import { useTheme } from '../../../theme/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';

export default function HeaderBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const currentTime = useCurrentDateTime();
  const greeting = useGreeting(currentTime.currentHour);
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const [settingsFocused, setSettingsFocused] = useState(false);

  return (
    <View style={[styles.headerContainer, compact && styles.compactHeader]}>
      {/* Left: Greeting & Date */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingRow}>
          <Text numberOfLines={1} style={[styles.greetingText, compact && styles.compactGreeting, { color: theme.colors.textPrimary }]}>
            {greeting.greeting}
          </Text>
        </View>
        <Text style={[styles.dateText, compact && styles.compactDate, { color: theme.colors.textSecondary }]}>
          {currentTime.formattedDate}
        </Text>
      </View>

      {/* Right: Clock and Settings */}
      <View style={styles.headerActions}>
        <View style={[styles.clockGlassBadge, compact && styles.compactClockBadge]}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={compact ? 18 : 22}
            color={theme.colors.focusRing}
            style={styles.clockIcon}
          />
          <Text style={[styles.clockText, compact && styles.compactClockText, { color: theme.colors.textPrimary }]}>
            {currentTime.formattedTime}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={onOpenSettings}
          onFocus={() => setSettingsFocused(true)}
          onBlur={() => setSettingsFocused(false)}
          style={[
            styles.settingsButton,
            compact && styles.compactSettingsButton,
            settingsFocused && [styles.settingsButtonFocused, { borderColor: theme.colors.focusRing }],
          ]}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={compact ? 22 : 26}
            color={settingsFocused ? theme.colors.textFocused : theme.colors.focusRing}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  greetingSection: {
    justifyContent: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.9,
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clockGlassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
      } as any,
    }),
  },
  clockIcon: {
    marginRight: 10,
  },
  clockText: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  settingsButton: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      } as any,
    }),
  },
  settingsButtonFocused: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    transform: [{ scale: 1.06 }],
  },
  compactHeader: { marginBottom: 8 },
  compactGreeting: { fontSize: 25 },
  compactDate: { fontSize: 14, marginTop: 0 },
  compactClockBadge: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 18 },
  compactClockText: { fontSize: 25 },
  compactSettingsButton: { width: 44, height: 44, borderRadius: 16 },
});

