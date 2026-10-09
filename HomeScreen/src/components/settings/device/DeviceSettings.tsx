import Pressable from '../../shared/NarratedPressable';
import Text from '../../shared/ReadingText';
import { useEffect, useState } from 'react';
import {View, StyleSheet, Platform} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useDashboard } from '../../../context/DashboardContext';
import { useControlFocus } from '../../../hooks/useControlFocus';
import { getCurrentDevice } from '../../../services/api';
import SettingsPanel from '../shared/SettingsPanel';

export default function DeviceSettings() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { isLive, refresh } = useDashboard();
  const { focusProps, focusStyle } = useControlFocus();
  const [deviceName, setDeviceName] = useState('HomeScreen TV');
  useEffect(() => {
    let cancelled = false;
    void getCurrentDevice()
      .then((device) => {
        if (!cancelled && device) setDeviceName(device.name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Device & Account Card */}
      <SettingsPanel>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
          Device & Connectivity
        </Text>

        <DeviceInfoRow
          icon='television'
          label='Device Name'
          value={deviceName}
        />
        <DeviceInfoRow
          icon='cloud-sync'
          label='Data Sync'
          value={isLive ? 'Connected & Live' : 'Unavailable'}
          iconColor={isLive ? '#10B981' : '#F59E0B'}
          valueColor={isLive ? '#10B981' : '#F59E0B'}
        />
        <DeviceInfoRow
          icon='account-circle-outline'
          label='Signed-in User'
          value={user?.email || 'Not signed in'}
        />
        <DeviceInfoRow
          icon='aspect-ratio'
          label='Display Canvas'
          value='1080p (16:9 10ft UI)'
        />
      </SettingsPanel>

      {/* Quick Actions */}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole='button'
          {...focusProps('refresh')}
          onPress={() => refresh()}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: theme.colors.focusRing,
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
            },
            pressed && { opacity: 0.8 },
            focusStyle('refresh'),
          ]}
        >
          <MaterialCommunityIcons
            name='refresh'
            size={20}
            color={theme.colors.focusRing}
          />
          <Text
            style={[styles.actionBtnText, { color: theme.colors.textPrimary }]}
          >
            Refresh Live Data
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Sign out this TV'
          {...focusProps('sign-out')}
          onPress={() => void signOut()}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: theme.colors.glassBorder,
              backgroundColor: theme.colors.glassSurface,
            },
            pressed && { opacity: 0.8 },
            focusStyle('sign-out'),
          ]}
        >
          <MaterialCommunityIcons
            name='logout'
            size={20}
            color={theme.colors.textPrimary}
          />
          <Text
            style={[styles.actionBtnText, { color: theme.colors.textPrimary }]}
          >
            Sign out this TV
          </Text>
        </Pressable>
      </View>
    </>
  );
}

interface DeviceInfoRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  iconColor?: string;
  valueColor?: string;
}

function DeviceInfoRow({
  icon,
  label,
  value,
  iconColor,
  valueColor,
}: DeviceInfoRowProps) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconLabel}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={iconColor || theme.colors.focusRing}
        />
        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.infoValue,
          { color: valueColor || theme.colors.textPrimary },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
